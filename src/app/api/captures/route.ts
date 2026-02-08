import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { captures } from "@/lib/db/schema";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const status = searchParams.get("status");
  const limit = Math.min(
    parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10),
    MAX_LIMIT
  );
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const db = getDb();

  let query = db.select().from(captures);

  if (status) {
    query = query.where(eq(captures.status, status)) as typeof query;
  }

  const results = query
    .orderBy(desc(captures.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  // Get total count for pagination
  let countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(captures);

  if (status) {
    countQuery = countQuery.where(
      eq(captures.status, status)
    ) as typeof countQuery;
  }

  const [{ count }] = countQuery.all();

  return NextResponse.json({ data: results, total: count, limit, offset });
}
