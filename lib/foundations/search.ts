/**
 * GrantFlow AI — Foundation search (server only)
 */
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { KIND_LABELS, type FoundationKind } from "@/lib/foundations/bmf";

export const PAGE_SIZE = 25;
/** Results shown to Free-plan accounts once billing is switched on. */
export const FREE_RESULT_LIMIT = 10;

export interface FoundationQuery {
  q?: string;
  state?: string;
  kind?: string;
  minAssets?: number;
  page?: number;
}

export function buildWhere(query: FoundationQuery): Prisma.FoundationWhereInput {
  const where: Prisma.FoundationWhereInput = {};
  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }
  if (query.state) where.state = query.state.toUpperCase();
  if (query.kind && query.kind in KIND_LABELS) where.kind = query.kind as FoundationKind;
  if (query.minAssets && query.minAssets > 0) where.assets = { gte: BigInt(Math.floor(query.minAssets)) };
  return where;
}

export async function searchFoundations(query: FoundationQuery, limitTo?: number) {
  const where = buildWhere(query);
  const page = Math.max(0, query.page ?? 0);
  const take = limitTo ?? PAGE_SIZE;
  const [total, rows] = await Promise.all([
    prisma.foundation.count({ where }),
    prisma.foundation.findMany({
      where,
      orderBy: [{ assets: { sort: "desc", nulls: "last" } }, { name: "asc" }],
      skip: limitTo ? 0 : page * PAGE_SIZE,
      take,
    }),
  ]);
  return { total, rows, page, pageSize: take };
}

export async function loadedStates(): Promise<{ state: string; count: number; refreshedAt: Date | null }[]> {
  const groups = await prisma.foundation.groupBy({
    by: ["state"],
    _count: { _all: true },
    _max: { sourceUpdatedAt: true },
    orderBy: { state: "asc" },
  });
  return groups
    .filter((g) => g.state)
    .map((g) => ({ state: g.state as string, count: g._count._all, refreshedAt: g._max.sourceUpdatedAt }));
}

/** Public page where the foundation's IRS returns (Form 990 / 990-PF) can be read. */
export function filingsUrl(ein: string): string {
  return `https://projects.propublica.org/nonprofits/organizations/${ein}`;
}
