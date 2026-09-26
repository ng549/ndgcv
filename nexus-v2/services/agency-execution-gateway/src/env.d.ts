// Worker secrets are not knowable to `wrangler types`; declare them here so
// they merge into the generated ExecGatewayEnv interface. Values are set with
// `wrangler secret put` and never committed.
interface ExecGatewayEnv {
  GATEWAY_BEARER_TOKEN: string;
  FACTORY_API_KEY: string;
}
