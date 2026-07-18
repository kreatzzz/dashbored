/**
 * A supported connection and a discovered container can intentionally point
 * at the same browser URL (Portainer is the usual case). Preserve the first
 * card so the Launcher has one clear route to that application.
 */
export function uniqueLauncherUrls<T extends { launchUrl: string }>(entries: T[]): T[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = normalizeLaunchUrl(entry.launchUrl);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeLaunchUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}
