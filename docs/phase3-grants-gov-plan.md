# Phase 3 — Grants.gov Live Search Agent Plan

## Overview

Replace the seeded GrantOpportunity fallback with live results from the official
Grants.gov API. The agent coexists with seeded data — it writes into the same
GrantOpportunity table using an upsert, so no schema changes are required beyond
two new fields.

---

## 1. API Endpoint

Base URL: https://apply07.grants.gov/grantsws/rest/opportunities/search/
Method: POST  
Content-Type: application/json

Request body:
  keyword:        "youth workforce development"
  oppStatuses:    "posted"
  rows:           25
  sortBy:         "openDate|desc"

Useful filter fields:
  oppStatuses:          posted | forecasted | closed | archived
  eligibilities:        25 = nonprofits, 20 = state govts
  fundingCategories:    ED, HL, HU, ACA, etc.
  awardCeilingFrom/To:  integer dollars
  closeDateRange:       MM/DD/YYYY-MM/DD/YYYY

Response shape (trimmed):
  hitCount: 142
  oppHits: [
    {
      id:              "123456",
      number:          "HHS-2025-ACF-OCC-EE-0042",
      title:           "Child Care Development Fund",
      agencyName:      "Admin for Children and Families",
      openDate:        "05/01/2025",
      closeDate:       "07/15/2025",
      awardCeiling:    500000,
      awardFloor:      50000,
      oppStatus:       "posted",
      synopsis:        "...",
      applicantTypes:  ["25"],
      fundingCategory: "HL"
    }
  ]

---

## 2. Search Agent — lib/agents/search-agent.ts

Steps:
  1. Build keyword from input.query + org profile focus areas
  2. POST to Grants.gov API (fetch with 10s timeout)
  3. Parse oppHits into GrantOpportunityResult[]
  4. Upsert each result into GrantOpportunity keyed on externalId
  5. Log AgentRun via startAgentRun / completeAgentRun
  6. Return { opportunities, totalFound, sourcesQueried }

Field mapping (Grants.gov -> Prisma):
  id            -> externalId   (store as string, unique constraint)
  title         -> title
  agencyName    -> funder
  synopsis      -> description  (trim to 2000 chars)
  closeDate     -> deadline     (parse MM/DD/YYYY -> Date)
  awardCeiling  -> awardMax
  awardFloor    -> awardMin
  oppStatus     -> isActive     (posted -> true)
  applicantTypes-> eligibleOrgTypes (map codes to labels)
  fundingCategory-> category    (map code to label)
  "grants.gov"  -> sourceUrl    (https://grants.gov/search-grants?id={id})
  "VERIFIED"    -> dataQuality

---

## 3. Upsert Logic

await prisma.grantOpportunity.upsert({
  where:  { externalId: hit.id },
  create: { ...mapped, source: "GRANTS_GOV" },
  update: { ...mapped, updatedAt: new Date() },
});

Schema additions needed in schema.prisma (non-breaking):
  externalId  String?  @unique   // Grants.gov numeric ID
  source      String   @default("SEED")  // "SEED" | "GRANTS_GOV"

Run: prisma db push (no migration needed for additive nullable fields)

---

## 4. API Route — app/api/agents/search/route.ts

Method: POST
Body:   { query: string, organizationId: string }
Returns: { opportunities: GrantOpportunityResult[], agentRunId: string }

Triggered from the search page "Search Live" button.

---

## 5. Search Page Integration (additive, non-breaking)

- Add a "Search Live Grants" button next to GrantSearchBox
- On click: POST to /api/agents/search, show spinner "Searching Grants.gov..."
- On success: merge live results with seeded results, deduplicate by externalId
- Show a "Live" badge on Grants.gov results vs seeded results
- Seeded fallback still shows when no live search has run

---

## 6. Rate Limits and Caching

- Grants.gov: ~10 req/min unauthenticated; register for API key for higher limits
- Cache in GrantSearchQuery table (already in schema) with resultsJson field
- TTL: re-fetch if lastFetchedAt > 24 hours for the same keyword
- Add GRANTS_GOV_API_KEY to .env (optional — works without at lower rate)

---

## 7. Implementation Order

1. Add externalId + source fields to Prisma schema -> prisma db push
2. Write lib/agents/search-agent.ts (fetch + parse + upsert)
3. Write app/api/agents/search/route.ts
4. Update GrantSearchBox with "Search Live" button + loading state
5. Add "Live" badge to search result cards (source === "GRANTS_GOV")
6. Test with real keyword against live Grants.gov API

Estimated effort: 1 focused session (~3-4 hours)
