/**
 * GrantFlow AI — Reminder rules
 *
 * Pure module (no Prisma, no network): decides which reminders are due for an
 * application on a given day. The daily job in lib/reminders/run.ts feeds it
 * database rows and delivers the result.
 *
 * Each reminder has a stable `key`. The job stores that key on the Notification
 * it creates, and the key is unique in the database, so the same reminder is
 * never delivered twice — even if the job runs more than once a day or skips a day.
 */

export type ReminderKind = "DEADLINE" | "FOLLOW_UP" | "REPORT_DUE";

export interface ReminderApplication {
  id: string;
  status: string;
  title: string;          // project title or opportunity title
  funder: string;
  deadline: Date | null;
  followUpDate: Date | null;
  reportDueDate: Date | null;
}

export interface DueReminder {
  kind: ReminderKind;
  applicationId: string;
  /** Unique per application + reminder stage + target date (add the user id to dedupe per person). */
  key: string;
  title: string;
  message: string;
  href: string;
  daysLeft: number;
  date: Date;
}

/** Days-before-deadline stages. A reminder goes out once per stage. */
export const DEADLINE_STAGES = [14, 7, 3, 1, 0] as const;
export const REPORT_STAGES = [14, 3, 0] as const;
/** A follow-up reminder is still worth sending this many days after its date. */
export const FOLLOW_UP_GRACE_DAYS = 7;

const NOT_YET_SUBMITTED = new Set(["DRAFTING", "NEEDS_REVIEW", "READY_TO_SUBMIT"]);
const WAITING_ON_FUNDER = new Set(["SUBMITTED", "FOLLOW_UP_NEEDED"]);
const REPORTING = new Set(["AWARDED", "REPORTING_REQUIRED"]);

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Whole calendar days from `now` to `target` (UTC). Negative when the date has passed. */
export function daysUntil(target: Date, now: Date): number {
  return Math.round((utcDay(target) - utcDay(now)) / DAY_MS);
}

function isoDay(d: Date): string {
  return new Date(utcDay(d)).toISOString().slice(0, 10);
}

/**
 * The stage a number of days-left falls into: the smallest stage that is still
 * >= daysLeft. Returns null when the date has passed or is further out than the
 * first stage. Example with stages [14,7,3,1,0]: 10 days left → 14, 7 → 7, 2 → 3.
 */
export function stageFor(daysLeft: number, stages: readonly number[]): number | null {
  if (daysLeft < 0) return null;
  let match: number | null = null;
  for (const s of stages) {
    if (daysLeft <= s && (match === null || s < match)) match = s;
  }
  return match;
}

function whenPhrase(daysLeft: number): string {
  if (daysLeft === 0) return "today";
  if (daysLeft === 1) return "tomorrow";
  return `in ${daysLeft} days`;
}

function longDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

export function remindersFor(app: ReminderApplication, now: Date): DueReminder[] {
  const out: DueReminder[] = [];
  const href = `/grants/${app.id}/apply`;

  if (app.deadline && NOT_YET_SUBMITTED.has(app.status)) {
    const daysLeft = daysUntil(app.deadline, now);
    const stage = stageFor(daysLeft, DEADLINE_STAGES);
    if (stage !== null) {
      out.push({
        kind: "DEADLINE",
        applicationId: app.id,
        key: `deadline:${app.id}:${stage}d:${isoDay(app.deadline)}`,
        title: `Deadline ${whenPhrase(daysLeft)}: ${app.title}`,
        message: `${app.funder} — due ${longDate(app.deadline)}. This application has not been marked as submitted.`,
        href,
        daysLeft,
        date: app.deadline,
      });
    }
  }

  if (app.followUpDate && WAITING_ON_FUNDER.has(app.status)) {
    const daysLeft = daysUntil(app.followUpDate, now);
    if (daysLeft <= 0 && daysLeft >= -FOLLOW_UP_GRACE_DAYS) {
      out.push({
        kind: "FOLLOW_UP",
        applicationId: app.id,
        key: `followup:${app.id}:${isoDay(app.followUpDate)}`,
        title: `Time to follow up: ${app.title}`,
        message: `No decision is recorded from ${app.funder}. Your follow-up date was ${longDate(app.followUpDate)}.`,
        href,
        daysLeft,
        date: app.followUpDate,
      });
    }
  }

  if (app.reportDueDate && REPORTING.has(app.status)) {
    const daysLeft = daysUntil(app.reportDueDate, now);
    const stage = stageFor(daysLeft, REPORT_STAGES);
    if (stage !== null) {
      out.push({
        kind: "REPORT_DUE",
        applicationId: app.id,
        key: `report:${app.id}:${stage}d:${isoDay(app.reportDueDate)}`,
        title: `Grant report due ${whenPhrase(daysLeft)}: ${app.title}`,
        message: `${app.funder} — report due ${longDate(app.reportDueDate)}.`,
        href,
        daysLeft,
        date: app.reportDueDate,
      });
    }
  }

  return out;
}

/** The date a stored reminder key is about (every key carries one), or null. */
export function dateFromReminderKey(key: string): Date | null {
  const m = key.match(/(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
