import { createGitHubAppJwt } from "../../../shared/src/github";
import {
  jsonResponse,
  methodNotAllowed
} from "../../../shared/src/http";

const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";
const GITHUB_API_VERSION = "2026-03-10";
const REQUIRED_SECRET_KEYS = [
  "GITHUB_APP_ID",
  "GITHUB_APP_PRIVATE_KEY",
  "GITHUB_INSTALLATION_ID"
] as const;

type RequiredSecretKey = (typeof REQUIRED_SECRET_KEYS)[number];

export interface CoreConfig {
  infisicalApiUrl: string;
  infisicalIdentityId: string;
  infisicalProjectId: string;
  infisicalEnvironment: string;
  infisicalSecretPath: string;
  githubApiUrl: string;
  githubRepositoryOwner: string;
  githubRepositoryName: string;
}

export interface CoreDependencies {
  fetch: typeof fetch;
  nowSeconds: () => number;
}

interface InfisicalLoginResponse {
  accessToken: string;
  expiresIn: number;
  accessTokenMaxTTL: number;
  tokenType: "Bearer";
}

interface InfisicalSecret {
  secretKey: string;
  secretValue: string;
}

interface InfisicalSecretsResponse {
  secrets: InfisicalSecret[];
}

interface GitHubInstallationTokenResponse {
  token: string;
  expires_at: string;
  permissions: Record<string, string>;
}

const DEFAULT_DEPENDENCIES: CoreDependencies = {
  // The Workers runtime requires fetch to keep its globalThis receiver;
  // passing it unbound throws "Illegal invocation" in production.
  fetch: (input, init) => fetch(input, init),
  nowSeconds: () => Math.floor(Date.now() / 1000)
};

function configFromEnv(env: CoreEnv): CoreConfig {
  return {
    infisicalApiUrl: env.INFISICAL_API_URL,
    infisicalIdentityId: env.INFISICAL_IDENTITY_ID,
    infisicalProjectId: env.INFISICAL_PROJECT_ID,
    infisicalEnvironment: env.INFISICAL_ENVIRONMENT,
    infisicalSecretPath: env.INFISICAL_SECRET_PATH,
    githubApiUrl: env.GITHUB_API_URL,
    githubRepositoryOwner: env.GITHUB_REPOSITORY_OWNER,
    githubRepositoryName: env.GITHUB_REPOSITORY_NAME
  };
}

function normalizedBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`upstream_${response.status}`);
  }
  return (await response.json()) as T;
}

async function loginToInfisical(
  config: CoreConfig,
  accessJwt: string,
  dependencies: CoreDependencies
): Promise<string> {
  const response = await dependencies.fetch(
    `${normalizedBaseUrl(config.infisicalApiUrl)}/api/v1/auth/jwt-auth/login`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        identityId: config.infisicalIdentityId,
        jwt: accessJwt
      })
    }
  );
  const login = await readJson<InfisicalLoginResponse>(response);
  if (!login.accessToken || login.tokenType !== "Bearer") {
    throw new Error("invalid_infisical_login_response");
  }
  return login.accessToken;
}

async function loadGitHubAppSecrets(
  config: CoreConfig,
  infisicalAccessToken: string,
  dependencies: CoreDependencies
): Promise<Record<RequiredSecretKey, string>> {
  const url = new URL(
    `${normalizedBaseUrl(config.infisicalApiUrl)}/api/v3/secrets/raw`
  );
  url.searchParams.set("workspaceId", config.infisicalProjectId);
  url.searchParams.set("environment", config.infisicalEnvironment);
  url.searchParams.set("secretPath", config.infisicalSecretPath);
  url.searchParams.set("viewSecretValue", "true");
  url.searchParams.set("expandSecretReferences", "false");
  url.searchParams.set("recursive", "false");
  url.searchParams.set("include_imports", "false");

  const response = await dependencies.fetch(url, {
    headers: {
      authorization: `Bearer ${infisicalAccessToken}`,
      accept: "application/json"
    }
  });
  const payload = await readJson<InfisicalSecretsResponse>(response);
  const selected = new Map<string, string>();
  for (const secret of payload.secrets) {
    if ((REQUIRED_SECRET_KEYS as readonly string[]).includes(secret.secretKey)) {
      selected.set(secret.secretKey, secret.secretValue);
    }
  }

  for (const key of REQUIRED_SECRET_KEYS) {
    if (!selected.get(key)) {
      throw new Error(`missing_${key.toLowerCase()}`);
    }
  }

  return Object.fromEntries(
    REQUIRED_SECRET_KEYS.map((key) => [key, selected.get(key) as string])
  ) as Record<RequiredSecretKey, string>;
}

async function requestGitHubInstallationToken(
  config: CoreConfig,
  secrets: Record<RequiredSecretKey, string>,
  dependencies: CoreDependencies
): Promise<GitHubInstallationTokenResponse> {
  if (!/^\d+$/.test(secrets.GITHUB_INSTALLATION_ID)) {
    throw new Error("invalid_github_installation_id");
  }
  const appJwt = await createGitHubAppJwt(
    secrets.GITHUB_APP_ID,
    secrets.GITHUB_APP_PRIVATE_KEY,
    dependencies.nowSeconds()
  );
  const endpoint = `${normalizedBaseUrl(config.githubApiUrl)}/app/installations/${secrets.GITHUB_INSTALLATION_ID}/access_tokens`;
  const response = await dependencies.fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${appJwt}`,
      "content-type": "application/json",
      "user-agent": "agency-github-token-broker/0.1",
      "x-github-api-version": GITHUB_API_VERSION
    },
    body: JSON.stringify({
      repositories: [config.githubRepositoryName],
      permissions: {
        actions: "read",
        checks: "read",
        contents: "write",
        pull_requests: "write",
        statuses: "read",
        workflows: "write"
      }
    })
  });
  const token = await readJson<GitHubInstallationTokenResponse>(response);
  if (!token.token || !token.expires_at) {
    throw new Error("invalid_github_token_response");
  }
  return token;
}

export async function handleCoreRequest(
  request: Request,
  config: CoreConfig,
  dependencies: CoreDependencies = DEFAULT_DEPENDENCIES
): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    if (request.method !== "GET") return methodNotAllowed("GET");
    return jsonResponse({ status: "ok", service: "broker-core", request_id: requestId });
  }

  if (url.pathname !== "/v1/github/installation-token") {
    return jsonResponse({ error: "not_found", request_id: requestId }, 404);
  }
  if (request.method !== "POST") return methodNotAllowed("POST");

  const accessJwt = request.headers.get(ACCESS_JWT_HEADER);
  if (!accessJwt) {
    return jsonResponse({ error: "unauthorized", request_id: requestId }, 401);
  }

  try {
    const infisicalAccessToken = await loginToInfisical(
      config,
      accessJwt,
      dependencies
    );
    const secrets = await loadGitHubAppSecrets(
      config,
      infisicalAccessToken,
      dependencies
    );
    const token = await requestGitHubInstallationToken(
      config,
      secrets,
      dependencies
    );

    console.log(
      JSON.stringify({
        event: "github_installation_token_minted",
        request_id: requestId,
        repository: `${config.githubRepositoryOwner}/${config.githubRepositoryName}`,
        expires_at: token.expires_at
      })
    );

    return jsonResponse({
      token: token.token,
      expires_at: token.expires_at,
      repository: `${config.githubRepositoryOwner}/${config.githubRepositoryName}`,
      permissions: token.permissions,
      request_id: requestId
    });
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : "unknown_error";
    console.error(
      JSON.stringify({
        event: "github_installation_token_failed",
        request_id: requestId,
        error_code: errorCode
      })
    );
    return jsonResponse(
      { error: "token_mint_failed", request_id: requestId },
      502
    );
  }
}

export default {
  fetch(request: Request, env: CoreEnv): Promise<Response> {
    return handleCoreRequest(request, configFromEnv(env));
  }
} satisfies ExportedHandler<CoreEnv>;
