/**
 * Integration check for the reminder job's email delivery.
 * Needs a throwaway database (DATABASE_URL). Never point this at production:
 * it creates and deletes test rows, and it refuses to run unless the database
 * host is localhost.
 *
 *   npx tsx --env-file=.env scripts/check-reminder-delivery.ts
 */
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  assert.match(dbUrl, /@(localhost|127\.0\.0\.1)[:/]/, "refusing to run: DATABASE_URL is not a local database");

  // A stand-in for the email service that can be told to fail.
  let failNext = false;
  const received: { to: string[]; subject: string }[] = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (failNext) {
        res.writeHead(500, { "Content-Type": "application/json" }).end('{"message":"down"}');
        return;
      }
      const msg = JSON.parse(body);
      received.push({ to: msg.to, subject: msg.subject });
      res.writeHead(200, { "Content-Type": "application/json" }).end('{"id":"test"}');
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.RESEND_API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/emails`;
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "GrantFlow <reminders@example.com>";

  const { default: prisma } = await import("@/lib/db/prisma");
  const { runReminders } = await import("@/lib/reminders/run");

  const tag = `rdc-${Date.now()}`;
  const now = new Date("2026-11-11T13:00:00Z");
  const pendingFor = (userId: string) => prisma.notification.count({ where: { userId, emailPending: true } });
  const totalFor = (userId: string) => prisma.notification.count({ where: { userId } });

  // Anything owed from earlier runs would be delivered by this script too.
  await prisma.notification.updateMany({ where: { emailPending: true }, data: { emailPending: false } });

  const org = await prisma.organization.create({ data: { name: `${tag} Org` } });
  const alice = await prisma.user.create({ data: { email: `${tag}-alice@example.com`, name: "Alice Test", organizationId: org.id } });
  const optedOut = await prisma.user.create({
    data: { email: `${tag}-bob@example.com`, name: "Bob Test", organizationId: org.id, emailReminders: false },
  });
  const opp = await prisma.grantOpportunity.create({
    data: { title: `${tag} Grant`, funder: "Test Funder", description: "Test opportunity", category: "Youth", sourceUrl: "https://example.com/grant" },
  });
  const app = await prisma.grantApplication.create({
    data: { organizationId: org.id, opportunityId: opp.id, status: "DRAFTING", deadline: new Date("2026-11-18T00:00:00Z") },
  });

  // The database may hold other applications, so every assertion is about the
  // two test people only, never about the run's overall totals.
  const mine = () => received.filter((m) => m.to.includes(alice.email));
  const toOptedOut = () => received.filter((m) => m.to.includes(optedOut.email));

  try {
    // 1. Email service down: the reminder is recorded and its email stays owed.
    failNext = true;
    let run = await runReminders({ now });
    assert.ok(run.emailsFailed >= 1 && run.emailsStillPending >= 1);
    assert.equal(await totalFor(alice.id), 1, "the in-app reminder is kept even though the email failed");
    assert.equal(await totalFor(optedOut.id), 1, "opted-out people still get the in-app reminder");
    assert.equal(await pendingFor(alice.id), 1);
    assert.equal(await pendingFor(optedOut.id), 0, "nothing is owed to someone who turned reminder emails off");
    assert.equal(mine().length, 0);

    // 2. Service back: the owed email goes out, exactly once, with no new notification.
    failNext = false;
    run = await runReminders({ now });
    assert.equal(await totalFor(alice.id), 1, "the reminder is not recorded twice");
    assert.equal(mine().length, 1);
    assert.match(mine()[0].subject, /Deadline in 7 days/);
    assert.equal(await pendingFor(alice.id), 0);
    assert.equal(run.emailsStillPending, 0);

    // 3. Nothing left to send.
    run = await runReminders({ now });
    assert.equal(run.emailsSent, 0);
    assert.equal(mine().length, 1);

    // 4. A run that is cut short before sending (crash or timeout) loses nothing:
    //    the next stage is recorded, and the following run delivers it.
    const threeDaysOut = new Date("2026-11-15T13:00:00Z");
    run = await runReminders({ now: threeDaysOut, sendBudgetMs: -1 });
    assert.equal(run.emailsSent, 0);
    assert.ok(run.emailsStillPending >= 1);
    assert.equal(await totalFor(alice.id), 2);
    assert.equal(await pendingFor(alice.id), 1);
    run = await runReminders({ now: threeDaysOut });
    assert.equal(await totalFor(alice.id), 2);
    assert.equal(mine().length, 2);
    assert.match(mine()[1].subject, /Deadline in 3 days/);
    assert.equal(await pendingFor(alice.id), 0);

    // 5. An owed email that is several days old is dropped, not sent late.
    await prisma.notification.create({
      data: {
        userId: alice.id, title: "Old reminder", message: "stale", href: "/tracker", applicationId: app.id,
        dedupeKey: `${tag}:stale:2026-11-01:${alice.id}`, emailPending: true, createdAt: new Date("2026-11-08T00:00:00Z"),
      },
    });
    await runReminders({ now: threeDaysOut });
    assert.equal(await pendingFor(alice.id), 0);
    assert.equal(mine().length, 2);

    assert.equal(toOptedOut().length, 0, "no email ever goes to someone who turned them off");

    console.log("check-reminder-delivery: all assertions passed");
  } finally {
    await prisma.notification.deleteMany({ where: { userId: { in: [alice.id, optedOut.id] } } });
    await prisma.grantApplication.delete({ where: { id: app.id } });
    await prisma.grantOpportunity.delete({ where: { id: opp.id } });
    await prisma.user.deleteMany({ where: { id: { in: [alice.id, optedOut.id] } } });
    await prisma.organization.delete({ where: { id: org.id } });
    await prisma.$disconnect();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
