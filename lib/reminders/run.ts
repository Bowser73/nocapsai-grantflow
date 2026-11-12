/**
 * GrantFlow AI — Daily reminder job
 *
 * 1. Finds applications with an upcoming deadline, a follow-up date that has
 *    arrived, or a report coming due.
 * 2. For every person on that organization, records an in-app notification.
 *    The notification's unique dedupeKey is the "already sent" marker.
 * 3. Sends each person ONE digest email with their new reminders (if email is
 *    configured and they have not turned reminder emails off).
 *
 * If an email fails to send, that person's new notifications are removed so the
 * next run tries again instead of silently dropping the reminder.
 */
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { buildDigestEmail, type DigestItem } from "@/lib/reminders/email";
import { DEADLINE_STAGES, FOLLOW_UP_GRACE_DAYS, REPORT_STAGES, remindersFor } from "@/lib/reminders/rules";

export interface ReminderRunSummary {
  applicationsChecked: number;
  remindersCreated: number;
  emailsSent: number;
  emailsFailed: number;
  emailConfigured: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function runReminders(now: Date = new Date()): Promise<ReminderRunSummary> {
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
          name: true,
          createdByUserId: true,
          users: { select: { id: true } },
        },
      },
    },
  });

  // userId → reminders newly recorded for them in this run
  const fresh = new Map<string, { notificationIds: string[]; items: DigestItem[] }>();
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
        try {
          const n = await prisma.notification.create({
            data: {
              userId,
              channel: "IN_APP",
              title: reminder.title,
              message: reminder.message,
              href: reminder.href,
              applicationId: app.id,
              dedupeKey: `${reminder.key}:${userId}`,
            },
            select: { id: true },
          });
          remindersCreated++;
          const bucket = fresh.get(userId) ?? { notificationIds: [], items: [] };
          bucket.notificationIds.push(n.id);
          bucket.items.push({ ...reminder, orgName: app.organization.name });
          fresh.set(userId, bucket);
        } catch (err) {
          // Unique violation = this reminder was already recorded for this person.
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
          throw err;
        }
      }
    }
  }

  const emailConfigured = isEmailConfigured();
  let emailsSent = 0;
  let emailsFailed = 0;

  if (emailConfigured && fresh.size) {
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(fresh.keys()) }, emailReminders: true },
      select: { id: true, email: true, name: true },
    });
    for (const user of users) {
      const bucket = fresh.get(user.id)!;
      const result = await sendEmail(buildDigestEmail(user.email, user.name, bucket.items));
      if (result.sent) {
        emailsSent++;
      } else {
        emailsFailed++;
        // Undo the "already sent" markers so the next run retries this person.
        await prisma.notification.deleteMany({ where: { id: { in: bucket.notificationIds } } });
        remindersCreated -= bucket.notificationIds.length;
      }
    }
  }

  return {
    applicationsChecked: applications.length,
    remindersCreated,
    emailsSent,
    emailsFailed,
    emailConfigured,
  };
}
