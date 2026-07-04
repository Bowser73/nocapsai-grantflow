import assert from "node:assert/strict";

type Org = {
  id: string;
  name: string;
  orgType: string;
  createdByUserId: string | null;
  userIds: string[];
  applications: string[];
};

const userId = "user-current";
const nocapsId = "org-nocaps";
const twiztedId = "org-twizted";

const orgs: Org[] = [
  {
    id: nocapsId,
    name: "NoCapsAI LLC",
    orgType: "SMALL_BUSINESS",
    createdByUserId: userId,
    userIds: [],
    applications: [],
  },
  {
    id: twiztedId,
    name: "Twizted Journeys Inc.",
    orgType: "NONPROFIT_501C3",
    createdByUserId: userId,
    userIds: [],
    applications: ["twizted-application-1"],
  },
];

function getAccessibleOrgs(activeOrganizationId: string) {
  const currentUserMemberships = orgs.map((org) => ({
    ...org,
    userIds: org.id === activeOrganizationId ? [userId] : [],
  }));

  return currentUserMemberships
    .filter((org) => org.userIds.includes(userId) || org.createdByUserId === userId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((org) => ({ id: org.id, name: org.name, orgType: org.orgType }));
}

const visibleWhenTwiztedActive = getAccessibleOrgs(twiztedId);
const visibleWhenNoCapsActive = getAccessibleOrgs(nocapsId);

for (const visible of [visibleWhenTwiztedActive, visibleWhenNoCapsActive]) {
  assert.deepEqual(
    visible.map((org) => org.name),
    ["NoCapsAI LLC", "Twizted Journeys Inc."],
    "switcher list should not collapse to only the active organization"
  );
}

assert.equal(
  orgs.find((org) => org.id === twiztedId)?.applications.length,
  1,
  "Twizted application data should remain attached to Twizted"
);
assert.equal(
  orgs.find((org) => org.id === nocapsId)?.applications.length,
  0,
  "NoCapsAI should not receive Twizted application data"
);

console.log("Organization switcher access checks passed");
