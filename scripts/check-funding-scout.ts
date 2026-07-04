import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generateFundingScout, type OrgProfileSnapshot } from "@/lib/funding-scout";

const nocaps: OrgProfileSnapshot = {
  name: "NoCapsAI LLC",
  orgType: "SMALL_BUSINESS",
  missionStatement:
    "Build practical AI, automation, website, and workflow systems for small businesses and community organizations.",
  programsServices:
    "AI readiness, automation, software, website systems, grant workflow support, and small-business technical assistance.",
  targetPopulation:
    "Small businesses, nonprofits, community organizations, contractors, and small teams.",
  geographicArea: "Rushville, Rush County, Indiana",
  city: "Rushville",
  state: "IN",
  profileCompleteness: 100,
};

const twizted: OrgProfileSnapshot = {
  name: "Twizted Journeys Inc.",
  orgType: "NONPROFIT_501C3",
  missionStatement:
    "Suicide prevention, mental health awareness, grief support, and community outreach.",
  programsServices:
    "Community events, QR-code resource access, education, stigma reduction, and survivor support.",
  targetPopulation: "Families, youth, veterans, and community members affected by suicide loss.",
  geographicArea: "Shelbyville, Shelby County, Indiana",
  city: "Shelbyville",
  state: "IN",
  profileCompleteness: 85,
};

const business = generateFundingScout(nocaps);
const nonprofit = generateFundingScout(twizted);

const businessText = JSON.stringify(business).toLowerCase();
const nonprofitText = JSON.stringify(nonprofit).toLowerCase();

assert.ok(business.fundingBuckets?.length, "for-profit output should include business funding buckets");
assert.equal(nonprofit.fundingBuckets, undefined, "nonprofit output should not include business funding buckets");

assert.ok(
  business.disqualifierIntro.includes("for-profit AI and software company"),
  "business disqualifier intro should be for-profit specific"
);
assert.ok(
  nonprofit.disqualifierIntro.includes("community outreach nonprofits"),
  "nonprofit disqualifier intro should preserve nonprofit guidance"
);

for (const term of [
  "Indiana rural small business digital transformation funding",
  "Indiana AI startup accelerator",
  "Indiana technology pitch competition",
  "AI workforce development grant Indiana",
  "small business technology adoption program Indiana",
  "SBIR artificial intelligence workflow automation",
  "government AI automation small business contract",
  "nonprofit technology vendor opportunity",
  "Indiana software startup incentive",
  "rural business automation funding",
]) {
  assert.ok(
    business.searchStrategies.some((strategy) => strategy.term === term),
    `missing business search term: ${term}`
  );
}

const techPoint = business.sourceBuckets.find((bucket) => bucket.id === "techpoint");
assert.ok(techPoint, "TechPoint should be its own source card");
assert.equal(
  business.sourceBuckets.some((bucket) => bucket.id === "orr-fellowship"),
  false,
  "Orr Fellowship should not be ranked as a NoCapsAI funding source without a verified program"
);

for (const advisoryId of ["indiana-sbdc", "techpoint", "indy-chamber"]) {
  const bucket = business.sourceBuckets.find((item) => item.id === advisoryId);
  assert.equal(
    bucket?.sourceType,
    "Technical assistance or advisory organization",
    `${advisoryId} should be labeled advisory`
  );
  assert.notEqual(
    bucket?.sourceType,
    "Direct grant or award program",
    `${advisoryId} should not be labeled as a direct funder`
  );
}

assert.ok(
  business.sourceBuckets.every((bucket) => bucket.sourceType && bucket.verificationLabel),
  "every business source should carry source type and verification label"
);
assert.ok(
  nonprofit.sourceBuckets.every((bucket) => bucket.sourceType && bucket.verificationLabel),
  "every nonprofit source should carry source type and verification label"
);

const grantsGov = business.sourceBuckets.find((bucket) => bucket.id === "grants-gov-biz");
assert.equal(grantsGov?.sourceType, "Federal live-search source");
assert.equal(grantsGov?.verificationLabel, "Live search available");
assert.notEqual(grantsGov?.verificationLabel, "Live verified opportunity");

const localLane = business.sourceBuckets.find((bucket) => bucket.id === "local-digital-transformation");
assert.equal(localLane?.sourceType, "Local program search lane");
assert.notEqual(localLane?.sourceType, "Direct grant or award program");

const contracting = business.sourceBuckets.find((bucket) => bucket.id === "government-contracting");
assert.equal(contracting?.sourceType, "Procurement or contracting opportunity");
assert.equal(contracting?.categoryLabel, "Government Procurement");
assert.notEqual(contracting?.categoryLabel, "Corporate / Private");

const sba = business.sourceBuckets.find((bucket) => bucket.id === "sba-programs");
assert.equal(sba?.sourceType, "Government small-business program source");
assert.notEqual(sba?.sourceType, "Loan or financing program");

const scoutView = readFileSync("components/funding-scout/funding-scout-view.tsx", "utf8");
assert.ok(
  scoutView.includes("These are planning ranges for sorting opportunities, not guaranteed award limits."),
  "funding bucket ranges should include a planning-range disclaimer"
);
assert.equal(
  scoutView.includes("{bucket.sourceType} · {bucket.verificationLabel}"),
  false,
  "expanded source detail should not duplicate the verification label"
);

assert.ok(!businessText.includes("twizted journeys"), "business output should not leak Twizted language");
assert.ok(!businessText.includes("suicide prevention"), "business output should not leak nonprofit strategy terms");
assert.ok(!nonprofitText.includes("nocapsai"), "nonprofit output should not leak NoCapsAI language");
assert.ok(!nonprofitText.includes("software startup incentive"), "nonprofit output should not leak business terms");

console.log("Funding Scout checks passed");
