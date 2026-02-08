import { z } from "zod/v4";

const ALLOWED_HOSTNAMES = ["x.com", "twitter.com", "www.x.com", "www.twitter.com"];
const TRACKING_PARAMS = ["s", "t", "ref_src", "ref_url", "src"];

/**
 * Zod schema for validating a single X/Twitter URL.
 */
export const xUrlSchema = z.string().transform((val, ctx) => {
  const trimmed = val.trim();
  if (!trimmed) {
    ctx.addIssue({ code: "custom", message: "Empty URL" });
    return z.NEVER;
  }

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    ctx.addIssue({ code: "custom", message: `Invalid URL: ${trimmed}` });
    return z.NEVER;
  }

  // SSRF protection: reject IPs, localhost, private ranges
  if (_isUnsafeHost(url.hostname)) {
    ctx.addIssue({
      code: "custom",
      message: `Blocked URL (unsafe host): ${trimmed}`,
    });
    return z.NEVER;
  }

  // Only allow x.com / twitter.com
  if (!ALLOWED_HOSTNAMES.includes(url.hostname.toLowerCase())) {
    ctx.addIssue({
      code: "custom",
      message: `Only x.com / twitter.com URLs are allowed: ${trimmed}`,
    });
    return z.NEVER;
  }

  return trimmed;
});

/**
 * Normalize an X/Twitter URL to a canonical form.
 * - Rewrites twitter.com → x.com
 * - Strips tracking params
 * - Lowercases hostname
 * - Ensures https
 */
export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);

  // Rewrite twitter.com → x.com
  let hostname = url.hostname.toLowerCase();
  if (hostname === "twitter.com" || hostname === "www.twitter.com") {
    hostname = "x.com";
  }
  if (hostname === "www.x.com") {
    hostname = "x.com";
  }

  // Strip tracking params
  for (const param of TRACKING_PARAMS) {
    url.searchParams.delete(param);
  }

  // Rebuild clean URL
  const search = url.searchParams.toString();
  const cleanPath = url.pathname.replace(/\/+$/, "") || "/";
  return `https://${hostname}${cleanPath}${search ? `?${search}` : ""}`;
}

/**
 * Parse a textarea input containing one or many X/Twitter URLs.
 * Splits by newlines, commas, and whitespace.
 * Returns valid normalized URLs and invalid entries.
 */
export function parseUrls(input: string): {
  valid: Array<{ original: string; normalized: string }>;
  invalid: Array<{ input: string; reason: string }>;
} {
  const raw = input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .flatMap((s) => s.split(/\s+/))
    .filter(Boolean);

  const valid: Array<{ original: string; normalized: string }> = [];
  const invalid: Array<{ input: string; reason: string }> = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    const result = xUrlSchema.safeParse(entry);
    if (!result.success) {
      const reason =
        result.error.issues[0]?.message || "Invalid URL";
      invalid.push({ input: entry, reason });
      continue;
    }

    const normalized = normalizeUrl(result.data);
    if (seen.has(normalized)) {
      continue; // deduplicate silently within batch
    }
    seen.add(normalized);
    valid.push({ original: result.data, normalized });
  }

  return { valid, invalid };
}

// --- Private helpers ---

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc/i,
  /^fd/i,
  /^fe80/i,
];

function _isUnsafeHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Reject localhost
  if (lower === "localhost" || lower === "localhost.localdomain") {
    return true;
  }

  // Reject IP addresses (both v4 and v6 patterns)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lower)) {
    // IPv4 - check private ranges
    return PRIVATE_IP_RANGES.some((re) => re.test(lower)) || true;
  }

  if (lower.startsWith("[") || lower.includes(":")) {
    // IPv6
    return true;
  }

  return false;
}
