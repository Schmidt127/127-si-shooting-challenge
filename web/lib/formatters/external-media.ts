/** Detect Adobe-hosted documents — these must not be iframe-embedded (502 / X-Frame-Options). */

function parseHttpUrl(url: string): URL | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isAdobeDocumentUrl(url: string): boolean {
  const parsed = parseHttpUrl(url);
  if (!parsed) return false;

  const host = parsed.hostname.toLowerCase();
  return host.includes("adobe.com") || host.endsWith("acrobat.com");
}

export function isPdfUrl(url: string): boolean {
  const parsed = parseHttpUrl(url);
  if (!parsed) return false;
  return /\.pdf$/i.test(parsed.pathname);
}

export function isGoogleDriveUrl(url: string): boolean {
  const parsed = parseHttpUrl(url);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase();
  return host === "drive.google.com" || host === "docs.google.com" || host.endsWith(".googleusercontent.com");
}

/** Adobe, PDF, and Google Drive links must open in a new tab — they cannot be embedded. */
export function shouldOpenExternally(url: string): boolean {
  return isAdobeDocumentUrl(url) || isPdfUrl(url) || isGoogleDriveUrl(url);
}

export function externalLinkHostname(url: string): string {
  return parseHttpUrl(url)?.hostname.replace(/^www\./, "") ?? "external site";
}
