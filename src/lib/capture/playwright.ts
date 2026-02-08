import { chromium, type Browser, type BrowserContext } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { getConfig } from "../config";
import { hashFile } from "./hash";

const CAPTURE_TIMEOUT_MS = 60_000;
const SETTLE_DELAY_MS = 3_000;
const SCROLL_STEP_PX = 800;
const SCROLL_DELAY_MS = 300;
const TWEET_SELECTOR_TIMEOUT_MS = 15_000;
const VIEWPORT = { width: 1280, height: 900 };
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface CaptureResult {
  screenshotPath: string;
  pdfPath: string;
  metadataPath: string;
  hashesPath: string;
  screenshotHash: string;
  pdfHash: string;
  metadataHash: string;
}

interface CaptureMetadata {
  url: string;
  capturedAt: string;
  userAgent: string;
  viewport: { width: number; height: number };
  pageTitle: string;
  playwrightVersion: string;
  harEnabled: boolean;
}

let _browser: Browser | null = null;

/**
 * Get or create a shared browser instance.
 * Reuses a single browser across all captures for efficiency.
 */
export async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) {
    return _browser;
  }

  const config = getConfig();

  if (config.playwrightWsEndpoint) {
    _browser = await chromium.connect(config.playwrightWsEndpoint);
  } else {
    _browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }

  return _browser;
}

/**
 * Close the shared browser instance. Called during shutdown.
 */
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

/**
 * Capture a snapshot of a URL: screenshot, PDF, metadata, hashes.
 * Stores artifacts in the given directory.
 */
export async function captureUrl(
  url: string,
  artifactDir: string
): Promise<CaptureResult> {
  const config = getConfig();
  fs.mkdirSync(artifactDir, { recursive: true });

  const browser = await getBrowser();
  const contextOptions: Parameters<Browser["newContext"]>[0] = {
    viewport: VIEWPORT,
    userAgent: USER_AGENT,
    ignoreHTTPSErrors: true,
  };

  // Load auth storage state if configured
  if (config.storageStatePath && fs.existsSync(config.storageStatePath)) {
    contextOptions.storageState = config.storageStatePath;
  }

  let context: BrowserContext | null = null;

  try {
    context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    page.setDefaultTimeout(CAPTURE_TIMEOUT_MS);

    // Navigate with 'load' strategy (X pages never reach 'networkidle' due to WebSockets)
    const response = await page.goto(url, {
      waitUntil: "load",
      timeout: CAPTURE_TIMEOUT_MS,
    });

    // Wait for tweet content to render (or timeout gracefully)
    await page
      .waitForSelector('[data-testid="tweet"], [data-testid="tweetText"], article', {
        timeout: TWEET_SELECTOR_TIMEOUT_MS,
      })
      .catch(() => {
        // Content may not match selectors (e.g., profile pages, error pages)
      });

    // Settle delay for dynamic content
    await page.waitForTimeout(SETTLE_DELAY_MS);

    // Optional auto-scroll to load lazy content
    if (config.autoScroll) {
      await _autoScroll(page);
    }

    // Capture screenshot
    const screenshotPath = path.join(artifactDir, "screenshot.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Capture PDF
    const pdfPath = path.join(artifactDir, "page.pdf");
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
    });

    // Build metadata
    const metadata: CaptureMetadata = {
      url,
      capturedAt: new Date().toISOString(),
      userAgent: USER_AGENT,
      viewport: VIEWPORT,
      pageTitle: await page.title(),
      playwrightVersion: _getPlaywrightVersion(),
      harEnabled: config.harEnabled,
    };

    const metadataPath = path.join(artifactDir, "metadata.json");
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Compute hashes
    const [screenshotHash, pdfHash, metadataHash] = await Promise.all([
      hashFile(screenshotPath),
      hashFile(pdfPath),
      hashFile(metadataPath),
    ]);

    const hashes = {
      "screenshot.png": screenshotHash,
      "page.pdf": pdfHash,
      "metadata.json": metadataHash,
    };

    const hashesPath = path.join(artifactDir, "hashes.json");
    fs.writeFileSync(hashesPath, JSON.stringify(hashes, null, 2));

    return {
      screenshotPath,
      pdfPath,
      metadataPath,
      hashesPath,
      screenshotHash,
      pdfHash,
      metadataHash,
    };
  } catch (error) {
    // Attempt to capture error-state screenshot
    await _captureErrorState(artifactDir, url, error, context);
    throw error;
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
  }
}

// --- Private helpers ---

async function _autoScroll(
  page: Awaited<ReturnType<BrowserContext["newPage"]>>
): Promise<void> {
  await page.evaluate(
    async ({ stepPx, delayMs }) => {
      await new Promise<void>((resolve) => {
        let totalScrolled = 0;
        const maxScroll = document.body.scrollHeight;
        const timer = setInterval(() => {
          window.scrollBy(0, stepPx);
          totalScrolled += stepPx;
          if (totalScrolled >= maxScroll) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, delayMs);
      });
    },
    { stepPx: SCROLL_STEP_PX, delayMs: SCROLL_DELAY_MS }
  );
  // Wait for any newly loaded content to settle
  await page.waitForTimeout(SETTLE_DELAY_MS);
}

async function _captureErrorState(
  artifactDir: string,
  url: string,
  error: unknown,
  context: BrowserContext | null
): Promise<void> {
  try {
    fs.mkdirSync(artifactDir, { recursive: true });

    // Try to take error-state screenshot if context is still alive
    if (context) {
      const pages = context.pages();
      if (pages.length > 0) {
        const errorScreenshotPath = path.join(
          artifactDir,
          "error-screenshot.png"
        );
        await pages[0]
          .screenshot({ path: errorScreenshotPath, fullPage: true })
          .catch(() => {});
      }
    }

    // Always write error metadata
    const errorMeta = {
      url,
      capturedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    const errorMetaPath = path.join(artifactDir, "error-metadata.json");
    fs.writeFileSync(errorMetaPath, JSON.stringify(errorMeta, null, 2));
  } catch {
    // Best-effort error capture; don't throw from error handler
  }
}

function _getPlaywrightVersion(): string {
  try {
    const pkgPath = require.resolve("playwright/package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.version || "unknown";
  } catch {
    return "unknown";
  }
}
