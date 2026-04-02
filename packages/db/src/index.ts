import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"]
});

/**
 * Run multiple independent queries in a single database transaction.
 * Reduces round-trips and ensures atomicity for read-heavy dashboard pages.
 *
 * @example
 * const [flows, runCount] = await batchQueries(
 *   prisma.flow.findMany({ where: { orgId } }),
 *   prisma.run.count({ where: { orgId } }),
 * );
 */
export function batchQueries<T extends unknown[]>(
  ...queries: { [K in keyof T]: Promise<T[K]> }
): Promise<T> {
  return prisma.$transaction(queries as any) as Promise<T>;
}

/**
 * Paginated query helper that returns items + total count in one transaction.
 */
export async function paginatedQuery<T>(
  findMany: Promise<T[]>,
  count: Promise<number>,
  take: number,
  skip: number
): Promise<{ items: T[]; total: number; hasMore: boolean; page: number }> {
  const [items, total] = await batchQueries(findMany, count);
  return {
    items,
    total,
    hasMore: skip + take < total,
    page: Math.floor(skip / take) + 1,
  };
}
