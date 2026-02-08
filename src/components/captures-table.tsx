"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { ExternalLink, Eye } from "lucide-react";
import type { Capture } from "@/lib/db/schema";

const POLL_INTERVAL_MS = 3_000;
const ACTIVE_STATUSES = ["queued", "running"];

interface CapturesResponse {
  data: Capture[];
  total: number;
}

export function CapturesTable({ refreshKey }: { refreshKey: number }) {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCaptures = useCallback(async () => {
    try {
      const res = await fetch("/api/captures?limit=50");
      const json: CapturesResponse = await res.json();
      setCaptures(json.data);
    } catch (err) {
      console.error("Failed to fetch captures:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaptures();
  }, [fetchCaptures, refreshKey]);

  // Poll while there are active (queued/running) jobs
  useEffect(() => {
    const hasActiveJobs = captures.some((c) =>
      ACTIVE_STATUSES.includes(c.status)
    );

    if (!hasActiveJobs) return;

    const interval = setInterval(fetchCaptures, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [captures, fetchCaptures]);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading captures...
      </div>
    );
  }

  if (captures.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No captures yet. Paste some X/Twitter URLs above to get started.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>URL</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[180px]">Created</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {captures.map((capture) => (
            <TableRow key={capture.id}>
              <TableCell className="font-mono text-xs max-w-[400px] truncate">
                <a
                  href={capture.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline inline-flex items-center gap-1"
                >
                  {capture.url}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </TableCell>
              <TableCell>
                <StatusBadge status={capture.status} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(capture.createdAt).toLocaleString()}
              </TableCell>
              <TableCell>
                {capture.status === "success" && (
                  <Link
                    href={`/captures/${capture.id}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Link>
                )}
                {capture.status === "failed" && (
                  <Link
                    href={`/captures/${capture.id}`}
                    className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                  >
                    Details
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
