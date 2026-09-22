export const NO_STORE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  "x-content-type-options": "nosniff"
} as const;

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...NO_STORE_HEADERS
    }
  });
}

export function methodNotAllowed(allow: string): Response {
  const response = jsonResponse({ error: "method_not_allowed" }, 405);
  response.headers.set("allow", allow);
  return response;
}
