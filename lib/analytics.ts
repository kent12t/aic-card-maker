export const REPORT_TIME_ZONE = "Asia/Singapore";

/** ISO calendar day in UTC+8, independent of the browser timezone. */
export function singaporeDay(timestamp: number): string {
  return new Date(timestamp + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function singaporeTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: REPORT_TIME_ZONE,
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(timestamp);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
