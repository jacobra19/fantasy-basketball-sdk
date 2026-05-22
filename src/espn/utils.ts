/** Recursively pull the first value of `key` from nested JSON (Python json_parsing). */
export function jsonParsing(obj: unknown, key: string): unknown {
  const results: unknown[] = [];

  function extract(value: unknown): void {
    if (value === null || value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        extract(item);
      }
      return;
    }
    if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        if (k === key) {
          results.push(v);
        } else if (
          typeof v === 'object' &&
          v !== null &&
          (Array.isArray(v) || typeof v === 'object')
        ) {
          extract(v);
        }
      }
    }
  }

  extract(obj);
  return results[0];
}

export function buildQueryString(
  params: Record<string, string | number | string[] | number[] | undefined>,
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export function buildCookieHeader(espnS2?: string, swid?: string): string | undefined {
  if (!espnS2 || !swid) {
    return undefined;
  }
  return `espn_s2=${espnS2}; SWID=${swid}`;
}
