import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { captures } from "@/lib/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const capture = db
    .select()
    .from(captures)
    .where(eq(captures.id, id))
    .get();

  if (!capture) {
    return NextResponse.json({ error: "Capture not found" }, { status: 404 });
  }

  return NextResponse.json(capture);
}
