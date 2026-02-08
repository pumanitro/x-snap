"use client";

import { useState } from "react";
import { Image as ImageIcon, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ViewTab = "screenshot" | "page";

const IFRAME_MIN_HEIGHT = "80vh";

interface CaptureViewerProps {
  captureId: string;
  captureUrl: string;
  hasScreenshot: boolean;
  hasHtml: boolean;
}

export function CaptureViewer({
  captureId,
  captureUrl,
  hasScreenshot,
  hasHtml,
}: CaptureViewerProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>(
    hasHtml ? "page" : "screenshot"
  );

  // If neither artifact exists, nothing to show
  if (!hasScreenshot && !hasHtml) {
    return null;
  }

  // If only one exists, show it directly without tabs
  const showTabs = hasScreenshot && hasHtml;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {activeTab === "screenshot" ? (
              <>
                <ImageIcon className="h-4 w-4" />
                Screenshot
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                Webpage
              </>
            )}
          </CardTitle>
          {showTabs && (
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <Button
                variant={activeTab === "page" ? "secondary" : "ghost"}
                size="xs"
                onClick={() => setActiveTab("page")}
              >
                <Globe className="h-3 w-3" />
                Webpage
              </Button>
              <Button
                variant={activeTab === "screenshot" ? "secondary" : "ghost"}
                size="xs"
                onClick={() => setActiveTab("screenshot")}
              >
                <ImageIcon className="h-3 w-3" />
                Screenshot
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === "screenshot" && hasScreenshot && (
          <div className="border rounded-lg overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/artifacts/${captureId}/screenshot.png`}
              alt={`Full-page screenshot of ${captureUrl}`}
              className="w-full h-auto"
            />
          </div>
        )}
        {activeTab === "page" && hasHtml && (
          <div
            className="border rounded-lg overflow-hidden bg-white"
            style={{ minHeight: IFRAME_MIN_HEIGHT }}
          >
            <iframe
              src={`/api/artifacts/${captureId}/page.html`}
              title={`Archived page of ${captureUrl}`}
              className="w-full border-0"
              style={{ minHeight: IFRAME_MIN_HEIGHT }}
              sandbox="allow-same-origin"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
