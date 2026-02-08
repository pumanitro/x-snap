import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { captures } from "@/lib/db/schema";
import { getConfig } from "@/lib/config";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import { CaptureViewer } from "@/components/capture-viewer";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

interface CaptureMetadata {
  url: string;
  capturedAt: string;
  userAgent: string;
  viewport: { width: number; height: number };
  pageTitle: string;
  playwrightVersion: string;
  harEnabled: boolean;
}

export default async function CaptureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const capture = db
    .select()
    .from(captures)
    .where(eq(captures.id, id))
    .get();

  if (!capture) {
    notFound();
  }

  // Read metadata if available
  const config = getConfig();
  const artifactDir = path.join(config.dataDir, capture.artifactDir);
  let metadata: CaptureMetadata | null = null;
  let hashes: Record<string, string> | null = null;

  try {
    const metaPath = path.join(artifactDir, "metadata.json");
    if (fs.existsSync(metaPath)) {
      metadata = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    }
  } catch {
    // metadata unavailable
  }

  try {
    const hashesPath = path.join(artifactDir, "hashes.json");
    if (fs.existsSync(hashesPath)) {
      hashes = JSON.parse(fs.readFileSync(hashesPath, "utf-8"));
    }
  } catch {
    // hashes unavailable
  }

  const hasScreenshot =
    capture.status === "success" &&
    fs.existsSync(path.join(artifactDir, "screenshot.png"));

  const hasPdf =
    capture.status === "success" &&
    fs.existsSync(path.join(artifactDir, "page.pdf"));

  const hasHtml =
    capture.status === "success" &&
    fs.existsSync(path.join(artifactDir, "page.html"));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/gallery">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Gallery
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight">Capture Detail</h1>
          <a
            href={capture.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-1 break-all"
          >
            {capture.url}
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        </div>
        <StatusBadge status={capture.status} />
      </div>

      {/* Error message */}
      {capture.errorMessage && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Error:</p>
          <p className="mt-1 font-mono text-xs">{capture.errorMessage}</p>
        </div>
      )}

      {/* Screenshot / Page viewer */}
      <CaptureViewer
        captureId={capture.id}
        captureUrl={capture.url}
        hasScreenshot={hasScreenshot}
        hasHtml={hasHtml}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Downloads */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Download className="h-4 w-4" />
              Downloads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hasScreenshot && (
              <a
                href={`/api/artifacts/${capture.id}/screenshot.png`}
                download={`screenshot-${capture.id}.png`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ImageIcon className="h-4 w-4" />
                screenshot.png
              </a>
            )}
            {hasPdf && (
              <a
                href={`/api/artifacts/${capture.id}/page.pdf`}
                download={`page-${capture.id}.pdf`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <FileText className="h-4 w-4" />
                page.pdf
              </a>
            )}
            {hasHtml && (
              <a
                href={`/api/artifacts/${capture.id}/page.html`}
                download={`page-${capture.id}.html`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Globe className="h-4 w-4" />
                page.html
              </a>
            )}
            {metadata && (
              <a
                href={`/api/artifacts/${capture.id}/metadata.json`}
                download={`metadata-${capture.id}.json`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Info className="h-4 w-4" />
                metadata.json
              </a>
            )}
          </CardContent>
        </Card>

        {/* Hashes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Hash className="h-4 w-4" />
              SHA-256 Hashes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hashes ? (
              Object.entries(hashes).map(([file, hash]) => (
                <div key={file} className="text-xs">
                  <p className="font-medium text-foreground">{file}</p>
                  <p className="font-mono text-muted-foreground break-all">
                    {hash}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                No hashes available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      {metadata && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Capture Metadata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <MetaRow label="Page Title" value={metadata.pageTitle} />
              <MetaRow label="Captured At" value={metadata.capturedAt} />
              <MetaRow label="User Agent" value={metadata.userAgent} mono />
              <MetaRow
                label="Viewport"
                value={`${metadata.viewport.width}x${metadata.viewport.height}`}
              />
              <MetaRow
                label="Playwright Version"
                value={metadata.playwrightVersion}
              />
              <MetaRow
                label="HAR Enabled"
                value={metadata.harEnabled ? "Yes" : "No"}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capture timing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Timing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <MetaRow
              label="Created"
              value={new Date(capture.createdAt).toLocaleString()}
            />
            <MetaRow
              label="Started"
              value={
                capture.startedAt
                  ? new Date(capture.startedAt).toLocaleString()
                  : "-"
              }
            />
            <MetaRow
              label="Completed"
              value={
                capture.completedAt
                  ? new Date(capture.completedAt).toLocaleString()
                  : "-"
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={`${mono ? "font-mono text-xs break-all" : ""} text-foreground`}
      >
        {value || "-"}
      </p>
    </div>
  );
}
