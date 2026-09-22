import {
  jsonResponse,
  methodNotAllowed,
  NO_STORE_HEADERS
} from "../../../shared/src/http";

const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

type BrokerFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function handleGatewayRequest(
  request: Request,
  brokerFetch: BrokerFetch
): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    if (request.method !== "GET") return methodNotAllowed("GET");
    return jsonResponse({ status: "ok", service: "broker-gateway", request_id: requestId });
  }

  if (url.pathname !== "/v1/github/installation-token") {
    return jsonResponse({ error: "not_found", request_id: requestId }, 404);
  }
  if (request.method !== "POST") return methodNotAllowed("POST");

  const accessJwt = request.headers.get(ACCESS_JWT_HEADER);
  if (!accessJwt) {
    return jsonResponse({ error: "unauthorized", request_id: requestId }, 401);
  }

  const response = await brokerFetch(
    "https://broker-core.internal/v1/github/installation-token",
    {
      method: "POST",
      headers: {
        [ACCESS_JWT_HEADER]: accessJwt,
        "x-request-id": requestId,
        accept: "application/json"
      }
    }
  );
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(NO_STORE_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  fetch(request: Request, env: GatewayEnv): Promise<Response> {
    return handleGatewayRequest(request, (input, init) =>
      env.BROKER_CORE.fetch(input, init)
    );
  }
} satisfies ExportedHandler<GatewayEnv>;
