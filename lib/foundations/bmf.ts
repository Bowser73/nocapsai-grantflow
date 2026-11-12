/**
 * GrantFlow AI — IRS Exempt Organizations Business Master File (EO BMF) parsing
 *
 * Pure module: turns the IRS's public per-state CSV into Foundation records.
 * Source: https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf
 * The data is a U.S. government work in the public domain.
 *
 * Only grantmakers are kept:
 *   - private foundations (IRS foundation codes 02, 03, 04), and
 *   - public charities classed as grantmakers by NTEE code
 *     (T2x private/corporate foundations, T3x public and community foundations,
 *      T7x federated giving programs such as United Way).
 */

export type FoundationKind =
  | "PRIVATE_FOUNDATION"
  | "PRIVATE_OPERATING"
  | "COMMUNITY_FOUNDATION"
  | "GRANTMAKING_CHARITY";

export const KIND_LABELS: Record<FoundationKind, string> = {
  PRIVATE_FOUNDATION: "Private foundation",
  PRIVATE_OPERATING: "Private operating foundation",
  COMMUNITY_FOUNDATION: "Community foundation",
  GRANTMAKING_CHARITY: "Grantmaking public charity",
};

export interface FoundationRecord {
  ein: string;
  name: string;
  careOf: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  kind: FoundationKind;
  foundationCode: string | null;
  nteeCode: string | null;
  rulingYear: number | null;
  taxPeriod: string | null;
  assets: bigint | null;
  income: bigint | null;
  revenue: bigint | null;
}

export const REQUIRED_COLUMNS = [
  "EIN", "NAME", "ICO", "STREET", "CITY", "STATE", "ZIP", "RULING", "FOUNDATION",
  "STATUS", "TAX_PERIOD", "ASSET_AMT", "INCOME_AMT", "REVENUE_AMT", "NTEE_CD",
] as const;

/** Splits one CSV line, honouring double-quoted fields and "" escapes. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function clean(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}

function money(v: string | undefined): bigint | null {
  const t = (v ?? "").trim();
  if (!/^-?\d+$/.test(t)) return null;
  return BigInt(t);
}

/** "LILLY ENDOWMENT INC" → "Lilly Endowment Inc" (the IRS file is all caps). */
export function titleCase(s: string): string {
  const keepUpper = new Set(["LLC", "II", "III", "IV", "USA", "US", "YMCA", "YWCA", "VFW", "PTA", "PTO"]);
  // IRS abbreviations spelled out
  const expand: Record<string, string> = { TR: "Trust", FDN: "Foundation", FNDTN: "Foundation", FDTN: "Foundation" };
  const lower = new Set(["of", "the", "and", "for", "in", "at", "to", "a", "on"]);
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      const bare = w.replace(/[^A-Za-z]/g, "");
      if (expand[bare.toUpperCase()] && bare.length === w.length) return expand[bare.toUpperCase()];
      if (keepUpper.has(bare.toUpperCase())) return w.toUpperCase();
      const l = w.toLowerCase();
      if (i > 0 && lower.has(l)) return l;
      return l.replace(/(^|[-'&.])([a-z])/g, (_m, p, ch) => p + ch.toUpperCase());
    })
    .join(" ");
}

export function classify(foundationCode: string | null, ntee: string | null): FoundationKind | null {
  const n = (ntee ?? "").toUpperCase();
  if (foundationCode === "04") return "PRIVATE_FOUNDATION";
  if (foundationCode === "02" || foundationCode === "03") return "PRIVATE_OPERATING";
  if (n.startsWith("T31")) return "COMMUNITY_FOUNDATION";
  if (n.startsWith("T2") || n.startsWith("T3") || n.startsWith("T7")) return "GRANTMAKING_CHARITY";
  return null;
}

export interface ParseResult {
  totalRows: number;
  records: FoundationRecord[];
}

/**
 * Parses a whole BMF CSV. Throws if the header is missing a column we rely on,
 * so a change in the IRS file layout fails loudly instead of importing garbage.
 */
export function parseBmfCsv(csv: string): ParseResult {
  const lines = csv.split(/\r?\n/);
  const header = splitCsvLine(lines[0] ?? "").map((h) => h.trim().toUpperCase());
  const col: Record<string, number> = {};
  header.forEach((h, i) => { col[h] = i; });
  const missing = REQUIRED_COLUMNS.filter((c) => !(c in col));
  if (missing.length) {
    throw new Error(`IRS file layout changed: missing column(s) ${missing.join(", ")}`);
  }

  const records: FoundationRecord[] = [];
  let totalRows = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    totalRows++;
    const f = splitCsvLine(line);
    const ein = (f[col.EIN] ?? "").trim();
    if (!/^\d{9}$/.test(ein)) continue;

    // STATUS 01 = unconditional exemption, 02 = conditional exemption.
    const status = (f[col.STATUS] ?? "").trim();
    if (status && status !== "01" && status !== "02") continue;

    const foundationCode = clean(f[col.FOUNDATION]);
    const nteeCode = clean(f[col.NTEE_CD]);
    const kind = classify(foundationCode, nteeCode);
    if (!kind) continue;

    const name = clean(f[col.NAME]);
    if (!name) continue;

    const ruling = (f[col.RULING] ?? "").trim();
    const rulingYear = /^\d{6}$/.test(ruling) && ruling !== "000000" ? Number(ruling.slice(0, 4)) : null;
    const taxPeriod = clean(f[col.TAX_PERIOD]);
    const careOf = clean(f[col.ICO]);

    records.push({
      ein,
      name: titleCase(name),
      careOf: careOf ? titleCase(careOf.replace(/^%\s*/, "")) : null,
      street: clean(f[col.STREET]) ? titleCase(clean(f[col.STREET])!) : null,
      city: clean(f[col.CITY]) ? titleCase(clean(f[col.CITY])!) : null,
      state: clean(f[col.STATE])?.toUpperCase() ?? null,
      zip: clean(f[col.ZIP])?.replace(/-0000$/, "") ?? null,
      kind,
      foundationCode,
      nteeCode,
      rulingYear,
      taxPeriod: taxPeriod && /^\d{6}$/.test(taxPeriod) ? taxPeriod : null,
      assets: money(f[col.ASSET_AMT]),
      income: money(f[col.INCOME_AMT]),
      revenue: money(f[col.REVENUE_AMT]),
    });
  }
  return { totalRows, records };
}

export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export function bmfUrlForState(state: string): string {
  const base = process.env.IRS_BMF_BASE_URL || "https://www.irs.gov/pub/irs-soi";
  return `${base.replace(/\/+$/, "")}/eo_${state.toLowerCase()}.csv`;
}

/** "202412" → "Dec 2024" */
export function formatTaxPeriod(p: string | null): string | null {
  if (!p || !/^\d{6}$/.test(p)) return null;
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(p.slice(4)) - 1];
  return month ? `${month} ${p.slice(0, 4)}` : null;
}

/** 105894116636n → "$105.9B"; 2400000n → "$2.4M"; 85000n → "$85K" */
export function formatBigMoney(v: bigint | null): string {
  if (v === null) return "Not reported";
  const n = Number(v);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
  return `${sign}$${abs}`;
}
