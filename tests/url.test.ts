import { describe, it, expect } from "vitest";
import { parseUrls, normalizeUrl } from "../src/lib/url";

describe("normalizeUrl", () => {
  it("rewrites twitter.com to x.com", () => {
    expect(normalizeUrl("https://twitter.com/user/status/123")).toBe(
      "https://x.com/user/status/123"
    );
  });

  it("rewrites www.twitter.com to x.com", () => {
    expect(normalizeUrl("https://www.twitter.com/user/status/123")).toBe(
      "https://x.com/user/status/123"
    );
  });

  it("rewrites www.x.com to x.com", () => {
    expect(normalizeUrl("https://www.x.com/user/status/123")).toBe(
      "https://x.com/user/status/123"
    );
  });

  it("strips tracking params (s, t)", () => {
    expect(
      normalizeUrl("https://x.com/user/status/123?s=20&t=abc123")
    ).toBe("https://x.com/user/status/123");
  });

  it("preserves non-tracking query params", () => {
    expect(
      normalizeUrl("https://x.com/user/status/123?lang=en")
    ).toBe("https://x.com/user/status/123?lang=en");
  });

  it("strips trailing slashes", () => {
    expect(normalizeUrl("https://x.com/user/")).toBe(
      "https://x.com/user"
    );
  });

  it("lowercases hostname", () => {
    expect(normalizeUrl("https://X.COM/user/status/123")).toBe(
      "https://x.com/user/status/123"
    );
  });

  it("ensures https", () => {
    expect(normalizeUrl("http://x.com/user/status/123")).toBe(
      "https://x.com/user/status/123"
    );
  });
});

describe("parseUrls", () => {
  it("parses newline-separated URLs", () => {
    const input = `https://x.com/user1/status/111
https://x.com/user2/status/222`;
    const result = parseUrls(input);
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(0);
  });

  it("parses comma-separated URLs", () => {
    const input = "https://x.com/user1/status/111, https://x.com/user2/status/222";
    const result = parseUrls(input);
    expect(result.valid).toHaveLength(2);
  });

  it("parses space-separated URLs", () => {
    const input = "https://x.com/user1/status/111 https://x.com/user2/status/222";
    const result = parseUrls(input);
    expect(result.valid).toHaveLength(2);
  });

  it("deduplicates identical normalized URLs", () => {
    const input = `https://x.com/user/status/123
https://twitter.com/user/status/123
https://x.com/user/status/123?s=20`;
    const result = parseUrls(input);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].normalized).toBe("https://x.com/user/status/123");
  });

  it("rejects non-X URLs", () => {
    const input = "https://google.com/search?q=test";
    const result = parseUrls(input);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].reason).toContain("Only x.com");
  });

  it("rejects localhost", () => {
    const input = "http://localhost:3000/test";
    const result = parseUrls(input);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].reason).toContain("unsafe host");
  });

  it("rejects private IP addresses", () => {
    const input = "http://192.168.1.1/test";
    const result = parseUrls(input);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
  });

  it("handles mixed valid and invalid URLs", () => {
    const input = `https://x.com/user/status/123
not-a-url
https://google.com/bad
https://x.com/user/status/456`;
    const result = parseUrls(input);
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(2);
  });

  it("handles empty input", () => {
    const result = parseUrls("");
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(0);
  });

  it("accepts twitter.com URLs", () => {
    const input = "https://twitter.com/user/status/789";
    const result = parseUrls(input);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].normalized).toBe("https://x.com/user/status/789");
  });
});
