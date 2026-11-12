/**
 * GrantFlow AI — Daily reminder job
 *
 * Step 1 — record. Finds applications with an upcoming deadline, a follow-up
 *   date that has arrived, or a report coming due, and records an in-app
 *   notification for every person on that organization. The notification's
 *   unique dedupeKey is the "already recorded" marker, and it is saved with
 *   emailPending = true: an email for it is still owed.
 *
 * Step 2 — deliver. Sends each person ONE digest email covering every
 *   notification that still has emailPending = true, then clears the flag.
 *
 * Because "email still owed" lives in the database and not in memory, a run
 * that fails or times out part-way loses nothing: the next run picks up
 * whatever is still pending. A failed send leaves the flag set for a retry.
 * The trade-off is at-least-once delivery: if two runs overlap, a person can
 * get the same digest twice, which is preferable to a missed deadline reminder.
 */
import prisma from "@/lib/db/prisma";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { buildDigestEmail, type DigestItem } from "@/lib/reminders/email";
import {
  DEADLINE_STAGES,
  FOLLOW_UP_GRACE_DAYS,
  REPORT_STAGES,
  dateFromReminderKey,
  daysUntil,
  remindersFor,
} from "@/lib/reminders/rules";

export interface ReminderRunSummary {
  applicationsChecked: number;
  remindersCreated: number;
  emailsSent: number;
  emailsFailed: number;
  /** People whose digest is still owed after this run (failed, or out of time). */
  emailsStillPending: number;
  emailConfigured: boolean;
}

export interface ReminderRunOptions {
  now?: Date;
  /** Stop starting new emails after this long, leaving the rest for the next run. */
  sendBudgetMs?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** An owed email older than this is dropped: the reminder it carried is out of date. */
const PENDING_MAX_AGE_DAYS = 3;
/** The cron route allows 60 seconds; leave room to finish cleanly. */
const DEFAULT_SEND_BUDGET_MS = 40_000;

export async function runReminders(options: ReminderRunOptions | Date = {}): Promise<ReminderRunSummary> {
  const opts = options instanceof Date ? { now: options } : options;
  const now = opts.now ?? new Date();
  const startedAt = Date.now();
  const sendBudgetMs = opts.sendBudgetMs ?? DEFAULT_SEND_BUDGET_MS;

  const { applicationsChecked, remindersCreated } = await recordReminders(now);
  const delivery = await deliverPendingEmails(now, () => Date.now() - startedAt > sendBudgetMs);

  return { applicationsChecked, remindersCreated, ...delivery };
}

/** Step 1: one notification per due reminder per person, each marked emailPending. */
async function recordReminders(now: Date): Promise<{ applicationsChecked: number; remindersCreated: number }> {
  const horizon = new Date(now.getTime() + (Math.max(...DEADLINE_STAGES, ...REPORT_STAGES) + 1) * DAY_MS);
  const lookback = new Date(now.getTime() - (FOLLOW_UP_GRACE_DAYS + 1) * DAY_MS);
  const yesterday = new Date(now.getTime() - DAY_MS);

  const applications = await prisma.grantApplication.findMany({
    where: {
      OR: [
        { deadline: { gte: yesterday, lte: horizon } },
        { followUpDate: { gte: lookback, lte: now } },
        { reportDueDate: { gte: yesterday, lte: horizon } },
      ],
    },
    select: {
      id: true,
      status: true,
      projectTitle: true,
      deadline: true,
      followUpDate: true,
      reportDueDate: true,
      opportunity: { select: { title: true, funder: true } },
      organization: {
        select: {
          createdByUserId: true,
          users: { select: { id: true } },
        },
      },
    },
  });

  let remindersCreated = 0;

  for (const app of applications) {
    const due = remindersFor(
      {
        id: app.id,
        status: app.status,
        title: app.projectTitle || app.opportunity.title,
        funder: app.opportunity.funder,
        deadline: app.deadline,
        followUpDate: app.followUpDate,
        reportDueDate: app.reportDueDate,
      },
      now
    );
    if (!due.length) continue;

    const recipientIds = new Set(app.organization.users.map((u) => u.id));
    if (app.organization.createdByUserId) recipientIds.add(app.organization.createdByUserId);

    for (const reminder of due) {
      for (const userId of Array.from(recipientIds)) {
        // skipDuplicates: the unique dedupeKey means a reminder already recorded
        // for this person is left alone. Its email, if still owed, is handled by
        // step 2 through emailPending.
        const { count } = await prisma.notification.createMany({
          data: [
            {
              userId,
              channel: "IN_APP",
              title: reminder.title,
              message: reminder.message,
              href: reminder.href,
              applicationId: app.id,
              dedupeKey: `${reminder.key}:${userId}`,
              emailPending: true,
            },
          ],
          skipDuplicates: true,
        });
        remindersCreated += count;
      }
    }
  }

  return { applicationsChecked: applications.length, remindersCreated };
}

/** Step 2: send every owed digest, clearing emailPending only after a successful send. */
async function deliverPendingEmails(
  now: Date,
  outOfTime: () => boolean
): Promise<Pick<ReminderRunSummary, "emailsSent" | "emailsFailed" | "emailsStillPending" | "emailConfigured">> {
  const emailConfigured = isEmailConfigured();

  // With no email service there is nothing to owe: reminders stay visible in the
  // app, and switching email on later must not release a backlog.
  if (!emailConfigured) {
    await prisma.notification.updateMany({ where: { emailPending: true }, data: { emailPending: false } });
    return { emailsSent: 0, emailsFailed: 0, emailsStillPending: 0, emailConfigured };
  }

  // Too old to be worth emailing.
  await prisma.notification.updateMany({
    where: { emailPending: true, createdAt: { lt: new Date(now.getTime() - PENDING_MAX_AGE_DAYS * DAY_MS) } },
    data: { emailPending: false },
  });

  const pending = await prisma.notification.findMany({
    where: { emailPending: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      title: true,
      message: true,
      href: true,
      applicationId: true,
      dedupeKey: true,
      user: { select: { email: true, name: true, emailReminders: true } },
    },
  });
  if (!pending.length) return { emailsSent: 0, emailsFailed: 0, emailsStillPending: 0, emailConfigured };

  // Organization names for the digest lines.
  const appIds = Array.from(new Set(pending.map((n) => n.applicationId).filter((id): id is string => !!id)));
  const apps = appIds.length
    ? await prisma.grantApplication.findMany({
        where: { id: { in: appIds } },
        select: { id: true, organization: { select: { name: true } } },
      })
    : [];
  const orgNameByApp = new Map(apps.map((a) => [a.id, a.organization.name]));

  const byUser = new Map<string, typeof pending>();
  for (const n of pending) {
    const list = byUser.get(n.userId) ?? [];
    list.push(n);
    byUser.set(n.userId, list);
  }

  let emailsSent = 0;
  let emailsFailed = 0;
  let emailsStillPending = 0;

  for (const notifications of Array.from(byUser.values())) {
    const ids = notifications.map((n) => n.id);
    const user = notifications[0].user;

    // Reminder emails turned off: nothing is owed.
    if (!user.emailReminders) {
      await prisma.notification.updateMany({ where: { id: { in: ids } }, data: { emailPending: false } });
      continue;
    }
    if (outOfTime()) {
      emailsStillPending++;
      continue;
    }

    const items: DigestItem[] = notifications.map((n) => {
      const about = n.dedupeKey ? dateFromReminderKey(n.dedupeKey) : null;
      return {
        title: n.title,
        message: n.message,
        href: n.href ?? "/tracker",
        orgName: (n.applicationId && orgNameByApp.get(n.applicationId)) || "GrantFlow",
        daysLeft: about ? daysUntil(about, now) : Number.MAX_SAFE_INTEGER,
      };
    });

    const result = await sendEmail(buildDigestEmail(user.email, user.name, items));
    if (result.sent) {
      emailsSent++;
      await prisma.notification.updateMany({ where: { id: { in: ids } }, data: { emailPending: false } });
    } else {
      // Leave emailPending set so the next run retries this person.
      emailsFailed++;
      emailsStillPending++;
    }
  }

  return { emailsSent, emailsFailed, emailsStillPending, emailConfigured };
}
