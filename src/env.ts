import { cleanEnv, host, port, str, url } from "envalid";
import { env as processEnv } from "node:process";

export const env = cleanEnv(processEnv, {
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
