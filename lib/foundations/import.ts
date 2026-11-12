/**
 * GrantFlow AI — Foundation import (server only)
 *
 * Downloads one state's IRS EO BMF file, keeps the grantmakers, and upserts
 * them into the Foundation table. Rows for that state that are no longer in
 * the IRS file are removed.
 */
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { bmfUrlForState, parseBmfCsv, US_STATES, type FoundationRecord } from "@/lib/foundations/bmf";

export interface ImportSummary {
  state: string;
  rowsInFile: number;
  foundations: number;
  removed: number;
  sourceUrl: string;
}

const BATCH = 500;

export async function importState(state: string): Promise<ImportSummary> {
  const code = state.toUpperCase();
  if (!(code in US_STATES)) throw new Error(`Unknown state "${state}"`);

  const sourceUrl = bmfUrlForState(code);
  const res = await fetch(sourceUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`IRS download failed (HTTP ${res.status}) for ${sourceUrl}`);
  // The IRS files are Latin-1 encoded.
  const csv = new TextDecoder("latin1").decode(await res.arrayBuffer());

  const { totalRows, records } = parseBmfCsv(csv);
  // Guard against a truncated or empty download wiping a state's data.
  if (totalRows < 100 || records.length === 0) {
    throw new Error(`IRS file for ${code} looks incomplete (${totalRows} rows, ${records.length} foundations); nothing was changed.`);
  }
  const inState = records.filter((r) => r.state === code);

  const startedAt = new Date();
  for (let i = 0; i < inState.length; i += BATCH) {
    await upsertBatch(inState.slice(i, i + BATCH), startedAt);
  }

  const removed = await prisma.foundation.deleteMany({
    where: { state: code, sourceUpdatedAt: { lt: startedAt } },
  });

  return { state: code, rowsInFile: totalRows, foundations: inState.length, removed: removed.count, sourceUrl };
}

async function upsertBatch(rows: FoundationRecord[], stamp: Date): Promise<void> {
  if (!rows.length) return;
  const values = rows.map(
    (r) => Prisma.sql`(${r.ein}, ${r.name}, ${r.careOf}, ${r.street}, ${r.city}, ${r.state}, ${r.zip}, ${r.kind},
      ${r.foundationCode}, ${r.nteeCode}, ${r.rulingYear}, ${r.taxPeriod}, ${r.assets}, ${r.income}, ${r.revenue}, ${stamp})`
  );
  await prisma.$executeRaw`
    INSERT INTO "Foundation"
      ("ein","name","careOf","street","city","state","zip","kind","foundationCode","nteeCode",
       "rulingYear","taxPeriod","assets","income","revenue","sourceUpdatedAt")
    VALUES ${Prisma.join(values)}
    ON CONFLICT ("ein") DO UPDATE SET
      "name" = EXCLUDED."name", "careOf" = EXCLUDED."careOf", "street" = EXCLUDED."street",
      "city" = EXCLUDED."city", "state" = EXCLUDED."state", "zip" = EXCLUDED."zip",
      "kind" = EXCLUDED."kind", "foundationCode" = EXCLUDED."foundationCode",
      "nteeCode" = EXCLUDED."nteeCode", "rulingYear" = EXCLUDED."rulingYear",
      "taxPeriod" = EXCLUDED."taxPeriod", "assets" = EXCLUDED."assets",
      "income" = EXCLUDED."income", "revenue" = EXCLUDED."revenue",
      "sourceUpdatedAt" = EXCLUDED."sourceUpdatedAt"`;
}

/** States to keep loaded, from FOUNDATION_STATES (comma separated). Default: Indiana. */
export function configuredStates(): string[] {
  const raw = process.env.FOUNDATION_STATES || "IN";
  const list = raw.split(",").map((s) => s.trim().toUpperCase()).filter((s) => s in US_STATES);
  return list.length ? Array.from(new Set(list)) : ["IN"];
}

/** The configured state whose data is oldest (or missing) — imported next. */
export async function nextStateToImport(): Promise<string> {
  const states = configuredStates();
  const loaded = await prisma.foundation.groupBy({
    by: ["state"],
    where: { state: { in: states } },
    _min: { sourceUpdatedAt: true },
  });
  const age = new Map(loaded.map((l) => [l.state, l._min.sourceUpdatedAt?.getTime() ?? 0]));
  return [...states].sort((a, b) => (age.get(a) ?? 0) - (age.get(b) ?? 0))[0];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}
