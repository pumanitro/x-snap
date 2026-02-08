import path from "node:path";

const DEFAULT_DATA_DIR = "./data/x-snap";
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETENTION_DAYS = 0;
const DEFAULT_RATE_LIMIT = 10;
const DEFAULT_PORT = 3000;

export interface AppConfig {
  dataDir: string;
  storageStatePath: string | undefined;
  concurrency: number;
  maxRetries: number;
  retentionDays: number;
  harEnabled: boolean;
  autoScroll: boolean;
  rateLimit: number;
  playwrightWsEndpoint: string | undefined;
  port: number;
}

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (_config) return _config;

  const dataDir = path.resolve(
    process.env.XSNAP_DATA_DIR || DEFAULT_DATA_DIR
  );

  _config = {
    dataDir,
    storageStatePath: process.env.XSNAP_STORAGE_STATE_PATH || undefined,
    concurrency: parseInt(
      process.env.XSNAP_CONCURRENCY || String(DEFAULT_CONCURRENCY),
      10
    ),
    maxRetries: parseInt(
      process.env.XSNAP_MAX_RETRIES || String(DEFAULT_MAX_RETRIES),
      10
    ),
    retentionDays: parseInt(
      process.env.XSNAP_RETENTION_DAYS || String(DEFAULT_RETENTION_DAYS),
      10
    ),
    harEnabled: process.env.XSNAP_HAR_ENABLED === "true",
    autoScroll: process.env.XSNAP_AUTO_SCROLL !== "false",
    rateLimit: parseInt(
      process.env.XSNAP_RATE_LIMIT || String(DEFAULT_RATE_LIMIT),
      10
    ),
    playwrightWsEndpoint: process.env.PLAYWRIGHT_WS_ENDPOINT || undefined,
    port: parseInt(process.env.PORT || String(DEFAULT_PORT), 10),
  };

  return _config;
}
