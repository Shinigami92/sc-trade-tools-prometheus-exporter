import { cleanEnv, host, num, port, str, url } from "envalid";
import { env as processEnv } from "node:process";

export const env = cleanEnv(processEnv, {
  API_TOKEN: str(),
  SCRAPE_INTERVAL: num({
    default: 15 * 60 * 1000,
  }),
  BASE_URL: url({
    default: "https://sc-trade.tools/api",
  }),
  HOST: host({
    default: "127.0.0.1",
  }),
  PORT: port({
    default: 9020,
  }),
  NODE_ENV: str({
    choices: ["development", "production"],
    default: "production",
  }),
});
