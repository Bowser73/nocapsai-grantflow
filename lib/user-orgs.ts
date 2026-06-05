import prisma from "@/lib/db/prisma";

export interface OrgSummary {
  id: string;
  name: string;
  orgType: string | null;
}

/**
 * Returns all organizations accessible to a user:
 * - Orgs the user is a member of (via User.organizationId relation)
 * - Orgs the user created (via Organization.createdByUserId)
 * Deduplicates by id.
 */
export async function getUserOrgs(userId: string): Promise<OrgSummary[]> {
  const orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { users: { some: { id: userId } } },
        { createdByUserId: userId },
      ],
    },
    select: {
      id: true,
      name: true,
      orgType: true,
    },
    orderBy: { name: "asc" },
  });

  // Deduplicate (org could satisfy both OR branches)
  const seen = new Set<string>();
  return orgs.filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
}
