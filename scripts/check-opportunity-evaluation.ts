import assert from "node:assert/strict";
import {
  buildReadinessChecklist,
  evaluateOpportunity,
  type OpportunityInput,
} from "@/lib/opportunity-evaluation";
import type { OrgProfileSnapshot } from "@/lib/funding-scout";

const nocaps: OrgProfileSnapshot = {
  name: "NoCapsAI LLC",
  orgType: "SMALL_BUSINESS",
  missionStatement:
    "Build practical AI, automation, website, and workflow systems for small businesses.",
  programsServices:
    "Small-business automation, websites, grant management software, workflow systems, and workforce AI training.",
  targetPopulation: "Small businesses, nonprofits, contractors, and small teams.",
  geographicArea: "Rushville, Rush County, Indiana",
  city: "Rushville",
  state: "IN",
  profileCompleteness: 100,
  pastGrantsNarrative: "SAM.gov and UEI confirmed active for federal grant readiness.",
};

function evaluate(opp: OpportunityInput) {
  return evaluateOpportunity(opp, nocaps);
}

const genericAiTitle = evaluate({
  title: "Pax Silica Artificial Intelligence Assistance Project",
  funder: "Federal Agency",
  deadline: "2026-10-01",
});

assert.equal(
  genericAiTitle.fitScore,
  null,
  "only title and deadline should not receive a normal numeric fit score"
);
assert.equal(
  genericAiTitle.scoreNotice,
  "Insufficient information to score confidently",
  "skeletal opportunities should show the insufficient-information state"
);
assert.equal(
  genericAiTitle.firstDraftAbstract,
  null,
  "missing scope and eligibility should prevent abstract generation"
);
assert.equal(
  genericAiTitle.abstractUnavailableReason,
  "Abstract generation unavailable until official scope and eligibility are verified."
);
assert.match(
  genericAiTitle.requiredNextAction,
  /verify the opportunity is open and confirm eligibility/i,
  "unknown direct application path should require eligibility verification"
);

const unknownEligibility = evaluate({
  title: "AI Workflow Automation Pilot",
  funder: "Indiana Economic Development Corporation",
  description:
    "This program supports implementation of practical website modernization, intake automation, workflow systems, and AI training for local companies.",
  deadline: "2026-11-15",
  locationStates: ["IN"],
});

assert.ok(
  unknownEligibility.fitScore !== null && unknownEligibility.fitScore <= 4,
  "unknown eligibility should cap the fit score at 4/10"
);
assert.equal(
  unknownEligibility.firstDraftAbstract,
  null,
  "unknown eligibility should prevent first-draft abstract generation"
);

const missingScope = evaluate({
  title: "Technology Innovation Grant",
  funder: "Indiana Technology Fund",
  eligibility: "Eligible applicants include for-profit small businesses.",
  orgTypesAllowed: ["SMALL_BUSINESS"],
  deadline: "2026-12-01",
});

assert.ok(
  missingScope.scoreConfidence === "provisional" && missingScope.informationGaps.includes("official program description/project scope"),
  "missing official scope should mark the score provisional"
);
assert.equal(
  missingScope.firstDraftAbstract,
  null,
  "missing official scope should prevent first-draft abstract generation"
);

const dice = evaluate({
  title: "Decentralized Artificial Intelligence through Controlled Emergence (DICE)",
  funder: "Defense Advanced Research Projects Agency",
  description:
    "A university laboratory research opportunity for decentralized artificial intelligence, controlled emergence, multi-agent research, and national security applications.",
  eligibility: "Applicant eligibility is restricted to accredited universities and federally funded research laboratories.",
  orgTypesAllowed: ["EDUCATIONAL_INSTITUTION"],
  deadline: "2026-09-30",
  sourceUrl: "https://www.darpa.mil/",
});

assert.ok(
  dice.fitScore !== null && dice.fitScore <= 3,
  "defense/research AI topics should not automatically fit NoCapsAI"
);
assert.equal(dice.scopeDistance, "distant");
assert.equal(dice.firstDraftAbstract, null);

const international = evaluate({
  title: "International Assistance Digital Innovation Program",
  funder: "U.S. Agency for International Development",
  description:
    "This foreign assistance program funds international development activities, embassy-aligned technical assistance, and digital innovation support in developing countries.",
  eligibility: "Eligible applicants are international NGOs, public institutions, and universities with foreign assistance experience.",
  orgTypesAllowed: ["NONPROFIT", "EDUCATIONAL_INSTITUTION"],
  deadline: "2026-08-20",
});

assert.ok(
  international.fitScore !== null && international.fitScore <= 3,
  "international programs should not receive high Indiana small-business fit"
);
assert.equal(international.scopeDistance, "distant");
assert.equal(
  international.firstDraftAbstract,
  null,
  "international assistance should not get an Indiana small-business abstract angle"
);

const federalKnown = evaluate({
  title: "Small Business Workflow Automation SBIR",
  funder: "National Science Foundation",
  description:
    "This SBIR program supports small businesses developing practical workflow automation software, AI training tools, and grant management technology with a clear commercialization plan.",
  eligibility: "Eligible applicants include for-profit small businesses located in the United States.",
  orgTypesAllowed: ["SMALL_BUSINESS"],
  deadline: "2026-11-01",
  sourceUrl: "https://seedfund.nsf.gov/",
});

assert.match(
  federalKnown.requiredNextAction,
  /SAM\.gov and UEI confirmed active\./,
  "active SAM/UEI status should be rendered as confirmed, not as a registration-start instruction"
);
assert.ok(
  !federalKnown.requiredNextAction.includes("begin SAM.gov/UEI registration now"),
  "active SAM/UEI status should not tell the user to begin registration"
);

const readiness = buildReadinessChecklist(nocaps);
assert.equal(
  readiness.items.find((item) => item.label === "SAM.gov UEI registration")?.note,
  "SAM.gov and UEI confirmed active.",
  "readiness checklist should render active SAM/UEI status correctly"
);

console.log("Opportunity evaluator checks passed.");
