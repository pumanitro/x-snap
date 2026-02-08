import path from "node:path";
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { captures, CaptureStatus } from "./db/schema";
import { getConfig } from "./config";
import { captureUrl, closeBrowser } from "./capture/playwright";

const POLL_INTERVAL_MS = 2_000;
const RETRY_BASE_DELAY_MS = 5_000;
const RETRY_MULTIPLIER = 4;

let _isRunning = false;
let _pollTimer: ReturnType<typeof setTimeout> | null = null;
let _activeJobs = 0;

/**
 * Start the background worker loop.
 * Called once from instrumentation.ts on server boot.
 */
export function startWorker(): void {
  if (_isRunning) return;
  _isRunning = true;

  console.log("[worker] Starting background capture worker...");

  // Recover stale "running" jobs from previous crash
  _recoverStaleJobs();

  // Start poll loop
  _schedulePoll();

  // Graceful shutdown
  process.on("SIGINT", _shutdown);
  process.on("SIGTERM", _shutdown);
}

// --- Core loop ---

function _schedulePoll(): void {
  if (!_isRunning) return;
  _pollTimer = setTimeout(_pollAndProcess, POLL_INTERVAL_MS);
}

async function _pollAndProcess(): Promise<void> {
  if (!_isRunning) return;

  try {
    const config = getConfig();
    const availableSlots = config.concurrency - _activeJobs;

    if (availableSlots <= 0) {
      _schedulePoll();
      return;
    }

    const db = getDb();
    const pendingJobs = db
      .select()
      .from(captures)
      .where(eq(captures.status, CaptureStatus.Queued))
      .limit(availableSlots)
      .all();

    if (pendingJobs.length > 0) {
      console.log(`[worker] Picked up ${pendingJobs.length} job(s)`);
    }

    for (const job of pendingJobs) {
      _activeJobs++;
      _processJob(job.id, job.url, job.artifactDir, job.retryCount).finally(
        () => {
          _activeJobs--;
        }
      );
    }
  } catch (error) {
    console.error("[worker] Poll error:", error);
  }

  _schedulePoll();
}

// --- Job processing ---

async function _processJob(
  jobId: string,
  url: string,
  artifactRelDir: string,
  currentRetryCount: number
): Promise<void> {
  const config = getConfig();
  const db = getDb();
  const artifactDir = path.join(config.dataDir, artifactRelDir);

  // Mark as running
  db.update(captures)
    .set({ status: CaptureStatus.Running, startedAt: Date.now() })
    .where(eq(captures.id, jobId))
    .run();

  try {
    console.log(`[worker] Capturing: ${url}`);
    const result = await captureUrl(url, artifactDir);

    // Mark success
    db.update(captures)
      .set({
        status: CaptureStatus.Success,
        completedAt: Date.now(),
        screenshotHash: result.screenshotHash,
        pdfHash: result.pdfHash,
        metadataHash: result.metadataHash,
        errorMessage: null,
      })
      .where(eq(captures.id, jobId))
      .run();

    console.log(`[worker] Success: ${url}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`[worker] Failed: ${url} -`, errorMessage);

    const shouldRetry = currentRetryCount < config.maxRetries;

    if (shouldRetry) {
      const delay = _getRetryDelay(currentRetryCount);
      console.log(
        `[worker] Scheduling retry ${currentRetryCount + 1}/${config.maxRetries} in ${delay}ms`
      );

      // Requeue with incremented retry count after delay
      setTimeout(() => {
        db.update(captures)
          .set({
            status: CaptureStatus.Queued,
            retryCount: currentRetryCount + 1,
            errorMessage,
          })
          .where(eq(captures.id, jobId))
          .run();
      }, delay);

      // Set to failed temporarily until retry kicks in
      db.update(captures)
        .set({
          status: CaptureStatus.Failed,
          completedAt: Date.now(),
          errorMessage: `${errorMessage} (retry ${currentRetryCount + 1} scheduled)`,
        })
        .where(eq(captures.id, jobId))
        .run();
    } else {
      // Final failure
      db.update(captures)
        .set({
          status: CaptureStatus.Failed,
          completedAt: Date.now(),
          errorMessage,
        })
        .where(eq(captures.id, jobId))
        .run();
    }
  }
}

// --- Helpers ---

function _recoverStaleJobs(): void {
  try {
    const db = getDb();
    const staleJobs = db
      .update(captures)
      .set({ status: CaptureStatus.Queued })
      .where(eq(captures.status, CaptureStatus.Running))
      .run();

    if (staleJobs.changes > 0) {
      console.log(
        `[worker] Recovered ${staleJobs.changes} stale running job(s)`
      );
    }
  } catch (error) {
    console.error("[worker] Error recovering stale jobs:", error);
  }
}

function _getRetryDelay(retryCount: number): number {
  // Exponential backoff: 5s, 20s, 80s
  return RETRY_BASE_DELAY_MS * Math.pow(RETRY_MULTIPLIER, retryCount);
}

async function _shutdown(): Promise<void> {
  if (!_isRunning) return;
  console.log("[worker] Shutting down...");

  _isRunning = false;
  if (_pollTimer) {
    clearTimeout(_pollTimer);
    _pollTimer = null;
  }

  // Wait for active jobs to complete (max 30s)
  const MAX_SHUTDOWN_WAIT_MS = 30_000;
  const SHUTDOWN_CHECK_MS = 500;
  const start = Date.now();

  while (_activeJobs > 0 && Date.now() - start < MAX_SHUTDOWN_WAIT_MS) {
    console.log(
      `[worker] Waiting for ${_activeJobs} active job(s) to finish...`
    );
    await new Promise((r) => setTimeout(r, SHUTDOWN_CHECK_MS));
  }

  await closeBrowser();
  console.log("[worker] Shutdown complete.");
}
