import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const CaptureStatus = {
  Queued: "queued",
  Running: "running",
  Success: "success",
  Failed: "failed",
} as const;

export type CaptureStatusType =
  (typeof CaptureStatus)[keyof typeof CaptureStatus];

export const captures = sqliteTable("captures", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  normalizedUrl: text("normalized_url").notNull(),
  status: text("status").notNull().default(CaptureStatus.Queued),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  startedAt: integer("started_at", { mode: "number" }),
  completedAt: integer("completed_at", { mode: "number" }),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  artifactDir: text("artifact_dir").notNull(),
  screenshotHash: text("screenshot_hash"),
  pdfHash: text("pdf_hash"),
  metadataHash: text("metadata_hash"),
});

export type Capture = typeof captures.$inferSelect;
export type NewCapture = typeof captures.$inferInsert;
