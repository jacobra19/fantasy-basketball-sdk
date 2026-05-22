export interface FetchClient {
  fetch: typeof globalThis.fetch;
}

export function createFetchClient(
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): FetchClient {
  return { fetch: fetchFn };
}
