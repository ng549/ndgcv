# Agency GitHub Token Broker

Two Cloudflare Workers issue short-lived, repository-scoped GitHub App installation tokens without copying the GitHub App private key into Cloudflare or Factory.

## Security boundary

- `agency-github-token-broker-gateway` is the only public Worker. Cloudflare Access must protect its entire hostname and admit only the dedicated Factory service credential.
- `agency-github-token-broker-core` has `workers_dev` and preview URLs disabled. It is reachable only through a Cloudflare service binding from the gateway.
- The Access-signed JWT is forwarded to the core and exchanged through Infisical JWT Auth. No long-lived Infisical Universal Auth secret is stored in Cloudflare.
- The core reads only Production at `/Github/agency-build-worker` in Infisical project `6ca97018-6ddd-4b34-ae77-df37c681a93b` and selects only the three required key names.
- The GitHub installation token is further scoped to repository `ng549/ndgcv` and to the requested permission subset. It expires according to GitHub's response.
- Token responses and all errors use `Cache-Control: no-store`. Logs contain request metadata, never tokens or private keys.

## Runtime flow

1. Factory calls `POST /v1/github/installation-token` with its Cloudflare Access service-token headers.
2. Cloudflare Access validates the service credential and adds `Cf-Access-Jwt-Assertion`.
3. The gateway passes only that assertion and a request ID to the private core over a service binding.
4. The core exchanges the Access JWT for a short-lived Infisical access token.
5. The core reads the fixed Infisical path, creates a GitHub App JWT in memory, and requests a one-hour installation token.
6. The token is returned to Factory and is never persisted by either Worker.

## Local verification

```sh
npm install
npm run check
npm run deploy:core:dry
npm run deploy:gateway:dry
```

No real credentials are required for the test suite. Tests generate an ephemeral RSA key in memory.

## Deployment order

1. Deploy the core Worker.
2. Deploy the gateway Worker with the service binding.
3. Create a Cloudflare Access self-hosted application for the gateway hostname and an allow policy limited to the Factory service credential.
4. Attach Infisical JWT Auth to machine identity `fb4c9d5a-f397-4efd-bb31-56d3a5f5ee07`, using the Cloudflare Access JWKS URL, exact issuer, application audience, and service-token claims.
5. Run a staging acceptance request, then exercise branch creation, commit, push, pull-request creation, and CI observation without merging.

The Access policy and Infisical JWT Auth method are required. Do not expose the gateway without both controls in place.
