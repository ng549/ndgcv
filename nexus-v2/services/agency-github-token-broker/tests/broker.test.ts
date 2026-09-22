import {
  generateKeyPairSync,
  verify
} from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  handleCoreRequest,
  type CoreConfig,
  type CoreDependencies
} from "../apps/core/src/index";
import { handleGatewayRequest } from "../apps/gateway/src/index";
import { createGitHubAppJwt } from "../shared/src/github";

const TEST_NOW = 1_800_000_000;

function testKeyPair(): { privateKey: string; publicKey: string } {
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    privateKey: pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey: pair.publicKey.export({ type: "spki", format: "pem" }).toString()
  };
}

function decodeJsonPart(value: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
}

const config: CoreConfig = {
  infisicalApiUrl: "https://app.infisical.test",
  infisicalIdentityId: "identity-id",
  infisicalProjectId: "project-id",
  infisicalEnvironment: "prod",
  infisicalSecretPath: "/Github/agency-build-worker",
  githubApiUrl: "https://api.github.test",
  githubRepositoryOwner: "ng549",
  githubRepositoryName: "ndgcv"
};

describe("GitHub App JWT", () => {
  it("uses the bounded GitHub JWT lifetime and a valid RSA signature", async () => {
    const keys = testKeyPair();
    const token = await createGitHubAppJwt("5025971", keys.privateKey, TEST_NOW);
    const [header, payload, signature] = token.split(".");
    expect(header).toBeTruthy();
    expect(payload).toBeTruthy();
    expect(signature).toBeTruthy();
    expect(decodeJsonPart(header as string)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decodeJsonPart(payload as string)).toEqual({
      iat: TEST_NOW - 60,
      exp: TEST_NOW + 540,
      iss: "5025971"
    });
    expect(
      verify(
        "RSA-SHA256",
        Buffer.from(`${header}.${payload}`),
        keys.publicKey,
        Buffer.from(signature as string, "base64url")
      )
    ).toBe(true);
  });
});

describe("gateway", () => {
  it("rejects token requests without a Cloudflare Access assertion", async () => {
    const brokerFetch = vi.fn<typeof fetch>();
    const response = await handleGatewayRequest(
      new Request("https://broker.example/v1/github/installation-token", {
        method: "POST"
      }),
      brokerFetch
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(brokerFetch).not.toHaveBeenCalled();
  });

  it("forwards only the Access assertion and request ID to the private core", async () => {
    const brokerFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        "https://broker-core.internal/v1/github/installation-token"
      );
      const headers = new Headers(init?.headers);
      expect(headers.get("cf-access-jwt-assertion")).toBe("access-jwt");
      expect(headers.get("x-request-id")).toBe("request-123");
      return new Response(JSON.stringify({ token: "installation-token" }), {
        headers: { "content-type": "application/json" }
      });
    });
    const response = await handleGatewayRequest(
      new Request("https://broker.example/v1/github/installation-token", {
        method: "POST",
        headers: {
          "cf-access-jwt-assertion": "access-jwt",
          "x-request-id": "request-123",
          authorization: "must-not-forward"
        }
      }),
      brokerFetch
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(brokerFetch).toHaveBeenCalledOnce();
  });
});

describe("private broker core", () => {
  it("exchanges the Access JWT, reads only the fixed vault path, and mints a scoped token", async () => {
    const keys = testKeyPair();
    const upstreamFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/v1/auth/jwt-auth/login") {
        const body = JSON.parse(String(init?.body)) as Record<string, string>;
        expect(body).toEqual({ identityId: "identity-id", jwt: "access-jwt" });
        return Response.json({
          accessToken: "infisical-access-token",
          expiresIn: 900,
          accessTokenMaxTTL: 3600,
          tokenType: "Bearer"
        });
      }
      if (url.pathname === "/api/v3/secrets/raw") {
        expect(url.searchParams.get("workspaceId")).toBe("project-id");
        expect(url.searchParams.get("environment")).toBe("prod");
        expect(url.searchParams.get("secretPath")).toBe(
          "/Github/agency-build-worker"
        );
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer infisical-access-token"
        );
        return Response.json({
          secrets: [
            { secretKey: "GITHUB_APP_ID", secretValue: "5025971" },
            {
              secretKey: "GITHUB_APP_PRIVATE_KEY",
              secretValue: keys.privateKey
            },
            { secretKey: "GITHUB_INSTALLATION_ID", secretValue: "163609141" },
            { secretKey: "UNRELATED", secretValue: "ignored" }
          ]
        });
      }
      if (url.pathname === "/app/installations/163609141/access_tokens") {
        const body = JSON.parse(String(init?.body)) as {
          repositories: string[];
          permissions: Record<string, string>;
        };
        expect(body.repositories).toEqual(["ndgcv"]);
        expect(body.permissions).toEqual({
          actions: "read",
          checks: "read",
          contents: "write",
          pull_requests: "write",
          statuses: "read",
          workflows: "write"
        });
        expect(new Headers(init?.headers).get("authorization")).toMatch(
          /^Bearer [^.]+\.[^.]+\.[^.]+$/
        );
        return Response.json({
          token: "installation-token",
          expires_at: "2027-01-15T09:00:00Z",
          permissions: body.permissions
        });
      }
      throw new Error(`unexpected upstream URL: ${url}`);
    });
    const dependencies: CoreDependencies = {
      fetch: upstreamFetch,
      nowSeconds: () => TEST_NOW
    };
    const response = await handleCoreRequest(
      new Request("https://core.internal/v1/github/installation-token", {
        method: "POST",
        headers: {
          "cf-access-jwt-assertion": "access-jwt",
          "x-request-id": "request-123"
        }
      }),
      config,
      dependencies
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({
      token: "installation-token",
      expires_at: "2027-01-15T09:00:00Z",
      repository: "ng549/ndgcv",
      permissions: {
        actions: "read",
        checks: "read",
        contents: "write",
        pull_requests: "write",
        statuses: "read",
        workflows: "write"
      },
      request_id: "request-123"
    });
    expect(upstreamFetch).toHaveBeenCalledTimes(3);
  });

  it("stops before GitHub when a required root credential is absent", async () => {
    const upstreamFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/v1/auth/jwt-auth/login") {
        return Response.json({
          accessToken: "infisical-access-token",
          expiresIn: 900,
          accessTokenMaxTTL: 3600,
          tokenType: "Bearer"
        });
      }
      if (url.pathname === "/api/v3/secrets/raw") {
        return Response.json({
          secrets: [
            { secretKey: "GITHUB_APP_ID", secretValue: "5025971" },
            { secretKey: "GITHUB_INSTALLATION_ID", secretValue: "163609141" }
          ]
        });
      }
      throw new Error("GitHub must not be called");
    });
    const response = await handleCoreRequest(
      new Request("https://core.internal/v1/github/installation-token", {
        method: "POST",
        headers: { "cf-access-jwt-assertion": "access-jwt" }
      }),
      config,
      { fetch: upstreamFetch, nowSeconds: () => TEST_NOW }
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: "token_mint_failed" });
    expect(upstreamFetch).toHaveBeenCalledTimes(2);
  });
});
