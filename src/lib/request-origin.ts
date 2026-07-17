function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function configuredDashboardOrigins() {
  return [
    process.env.PORTLESS_URL,
    process.env.BETTER_AUTH_URL,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(","),
  ].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}

export function isTrustedRequestOrigin(requestUrl: string, headers: Headers, configuredOrigins = configuredDashboardOrigins()) {
  const suppliedOrigin = headers.get("origin");
  if (!suppliedOrigin) return true;
  const normalizedSupplied = normalizeOrigin(suppliedOrigin);
  if (!normalizedSupplied) return false;

  const allowed = new Set<string>();
  const requestOrigin = normalizeOrigin(requestUrl);
  if (requestOrigin) allowed.add(requestOrigin);
  for (const origin of configuredOrigins) {
    const normalized = normalizeOrigin(origin);
    if (normalized) allowed.add(normalized);
  }

  const forwardedHost = firstHeaderValue(headers.get("x-forwarded-host"));
  const host = forwardedHost ?? firstHeaderValue(headers.get("host"));
  const forwardedProtocol = firstHeaderValue(headers.get("x-forwarded-proto"));
  const requestProtocol = normalizeOrigin(requestUrl)?.split(":")[0];
  const protocol = forwardedProtocol ?? requestProtocol;
  if (host && (protocol === "http" || protocol === "https")) allowed.add(`${protocol}://${host}`);

  return allowed.has(normalizedSupplied);
}
