export type KnownEndpointStatus = "offline" | "tls_error";

export interface KnownEndpointIssue {
  status: KnownEndpointStatus;
  message: string;
}

// No hardcoded offline hosts — all checks are done live via health probes
const KNOWN_OFFLINE_HOSTS: Array<{ host: string; issue: KnownEndpointIssue }> = [];

export function getEndpointKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return url.split("?")[0].replace(/\/+$/, "");
  }
}

export function getEndpointHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function getKnownEndpointIssue(url?: string | null): KnownEndpointIssue | null {
  if (!url) return null;
  const host = getEndpointHost(url);
  const match = KNOWN_OFFLINE_HOSTS.find((entry) => entry.host === host);
  return match?.issue ?? null;
}
