import assert from "node:assert/strict";
import { daysUntil, remindersFor, stageFor, DEADLINE_STAGES, type ReminderApplication } from "@/lib/reminders/rules";

const now = new Date("2026-11-11T13:00:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const app = (over: Partial<ReminderApplication>): ReminderApplication => ({
  id: "app1", status: "DRAFTING", title: "Youth Program", funder: "Lilly Endowment",
  deadline: null, followUpDate: null, reportDueDate: null, ...over,
});

// daysUntil counts calendar days and ignores the time of day
assert.equal(daysUntil(new Date("2026-11-12T23:59:00Z"), now), 1);
assert.equal(daysUntil(new Date("2026-11-11T00:01:00Z"), now), 0);
assert.equal(daysUntil(day("2026-11-10"), now), -1);

// stage buckets
assert.equal(stageFor(20, DEADLINE_STAGES), null, "further out than the first stage");
assert.equal(stageFor(14, DEADLINE_STAGES), 14);
assert.equal(stageFor(10, DEADLINE_STAGES), 14, "a late-created application still gets the 14-day stage once");
assert.equal(stageFor(7, DEADLINE_STAGES), 7);
assert.equal(stageFor(2, DEADLINE_STAGES), 3);
assert.equal(stageFor(1, DEADLINE_STAGES), 1);
assert.equal(stageFor(0, DEADLINE_STAGES), 0);
assert.equal(stageFor(-1, DEADLINE_STAGES), null, "no reminders after the deadline passes");

// deadline reminder for a draft
const d7 = remindersFor(app({ deadline: day("2026-11-18") }), now);
assert.equal(d7.length, 1);
assert.equal(d7[0].kind, "DEADLINE");
assert.equal(d7[0].key, "deadline:app1:7d:2026-11-18");
assert.match(d7[0].title, /in 7 days/);

// same stage on consecutive days → same key (so it is sent once)
const d5 = remindersFor(app({ deadline: day("2026-11-18") }), new Date("2026-11-13T13:00:00Z"));
const d4 = remindersFor(app({ deadline: day("2026-11-18") }), new Date("2026-11-14T13:00:00Z"));
assert.equal(d7[0].key, d5[0].key, "5 days left is still the 7-day stage");
assert.equal(d5[0].key, d4[0].key);
const d3 = remindersFor(app({ deadline: day("2026-11-18") }), new Date("2026-11-15T13:00:00Z"));
assert.equal(d3[0].key, "deadline:app1:3d:2026-11-18");
assert.notEqual(d4[0].key, d3[0].key, "moving into the next stage produces a new reminder");

// moving the deadline produces a fresh reminder
const moved = remindersFor(app({ deadline: day("2026-11-17") }), now);
assert.notEqual(moved[0].key, d7[0].key);

// wording
assert.match(remindersFor(app({ deadline: day("2026-11-12") }), now)[0].title, /tomorrow/);
assert.match(remindersFor(app({ deadline: day("2026-11-11") }), now)[0].title, /today/);

// submitted / closed applications get no deadline reminder
for (const status of ["SUBMITTED", "AWARDED", "DENIED", "CLOSED"]) {
  assert.equal(remindersFor(app({ status, deadline: day("2026-11-18") }), now).length, 0, status);
}
// passed or far-off deadlines
assert.equal(remindersFor(app({ deadline: day("2026-11-10") }), now).length, 0);
assert.equal(remindersFor(app({ deadline: day("2026-12-25") }), now).length, 0);

// follow-up: only once the date arrives, only while waiting, only within the grace window
assert.equal(remindersFor(app({ status: "SUBMITTED", followUpDate: day("2026-11-12") }), now).length, 0);
const fu = remindersFor(app({ status: "SUBMITTED", followUpDate: day("2026-11-09") }), now);
assert.equal(fu.length, 1);
assert.equal(fu[0].key, "followup:app1:2026-11-09");
assert.equal(remindersFor(app({ status: "SUBMITTED", followUpDate: day("2026-10-01") }), now).length, 0);
assert.equal(remindersFor(app({ status: "DRAFTING", followUpDate: day("2026-11-09") }), now).length, 0);

// report due
const rep = remindersFor(app({ status: "AWARDED", reportDueDate: day("2026-11-20") }), now);
assert.equal(rep.length, 1);
assert.equal(rep[0].key, "report:app1:14d:2026-11-20");
assert.equal(remindersFor(app({ status: "DRAFTING", reportDueDate: day("2026-11-20") }), now).length, 0);

console.log("check-reminders: all assertions passed");
