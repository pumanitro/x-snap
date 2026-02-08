"use server";

import { ulid } from "ulid";
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { captures, CaptureStatus } from "@/lib/db/schema";
import { parseUrls } from "@/lib/url";
import { checkRateLimit } from "@/lib/rate-limit";
import { getConfig } from "@/lib/config";
import { headers } from "next/headers";

export interface CreateCapturesResult {
  created: string[];
  duplicates: string[];
  invalid: Array<{ input: string; reason: string }>;
  error?: string;
}

export async function createCaptures(
  formData: FormData
): Promise<CreateCapturesResult> {
  const config = getConfig();

  // Rate limiting by IP
  const headersList = await headers();
  const clientIp =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";

  const rateCheck = checkRateLimit(clientIp, config.rateLimit);
  if (!rateCheck.allowed) {
    return {
      created: [],
      duplicates: [],
      invalid: [],
      error: `Rate limit exceeded. Try again in ${Math.ceil(rateCheck.retryAfterMs / 1000)} seconds.`,
    };
  }

  // Parse URLs from textarea
  const urlsInput = formData.get("urls");
  if (!urlsInput || typeof urlsInput !== "string" || !urlsInput.trim()) {
    return {
      created: [],
      duplicates: [],
      invalid: [],
      error: "No URLs provided.",
    };
  }

  const { valid, invalid } = parseUrls(urlsInput);

  if (valid.length === 0) {
    return {
      created: [],
      duplicates: [],
      invalid,
      error: "No valid X/Twitter URLs found.",
    };
  }

  const db = getDb();

  // Check for duplicates (already queued/running with same normalized URL)
  const normalizedUrls = valid.map((v) => v.normalized);
  const existingCaptures = db
    .select({ normalizedUrl: captures.normalizedUrl })
    .from(captures)
    .where(
      and(
        inArray(captures.normalizedUrl, normalizedUrls),
        inArray(captures.status, [CaptureStatus.Queued, CaptureStatus.Running])
      )
    )
    .all();

  const existingSet = new Set(existingCaptures.map((c) => c.normalizedUrl));

  const created: string[] = [];
  const duplicates: string[] = [];

  for (const { original, normalized } of valid) {
    if (existingSet.has(normalized)) {
      duplicates.push(original);
      continue;
    }

    const id = ulid();
    const artifactDir = id; // relative path under dataDir

    db.insert(captures)
      .values({
        id,
        url: original,
        normalizedUrl: normalized,
        status: CaptureStatus.Queued,
        createdAt: Date.now(),
        retryCount: 0,
        artifactDir,
      })
      .run();

    created.push(id);
  }

  return { created, duplicates, invalid };
}
