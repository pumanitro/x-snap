"use client";

import { useState, useCallback } from "react";
import { CaptureForm } from "@/components/capture-form";
import { CapturesTable } from "@/components/captures-table";
import { Separator } from "@/components/ui/separator";

export default function CapturePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCaptureCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Capture Evidence</h1>
        <p className="text-muted-foreground mt-1">
          Paste X/Twitter URLs below to capture evidence snapshots with
          screenshots, PDFs, and cryptographic hashes.
        </p>
      </div>

      <CaptureForm onCaptureCreated={handleCaptureCreated} />

      <Separator />

      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Captures</h2>
        <CapturesTable refreshKey={refreshKey} />
      </div>
    </div>
  );
}
