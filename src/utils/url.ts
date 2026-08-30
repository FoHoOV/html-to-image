/**
 * Resolves `url` against `baseUrl`. Absolute, protocol-relative, and
 * scheme-only references such as `data:` and `mailto:` resolve unchanged.
 *
 * An unresolvable reference is returned as-is so the caller fails on the fetch
 * rather than here.
 */
export function resolveUrl(url: string, baseUrl: string) {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}
