import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { getConfig } from "@/lib/config";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id, path: pathSegments } = await params;
  const config = getConfig();

  // Validate capture ID format (ULID: 26 alphanumeric chars)
  if (!/^[0-9A-Z]{26}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid capture ID" }, { status: 400 });
  }

  // Build and validate file path
  const requestedPath = pathSegments.join("/");
  const fullPath = path.resolve(config.dataDir, id, requestedPath);

  // Path traversal protection: ensure resolved path is within data dir
  const resolvedDataDir = path.resolve(config.dataDir);
  if (!fullPath.startsWith(resolvedDataDir)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 });
  }

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

  const fileBuffer = fs.readFileSync(fullPath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileBuffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
