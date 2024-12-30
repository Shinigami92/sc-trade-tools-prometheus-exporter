import express from "express";
import { register } from "prom-client";
import { env } from "./env.js";
import { registerShopsMetrics } from "./metrics/shops.js";
import { registerLeaderboardMetrics } from "./metrics/leaderboard.js";
import ky from "ky";

const app = express();

app.get("/", (req, res) => {
  res.send(`<html lang="en">
  <head>
    <title>SC Trade Tools Prometheus Exporter</title>
  </head>
  <body>
    <h1>SC Trade Tools Prometheus Exporter</h1>
    <p><a href="/metrics">Metrics</a></p>
  </body>
</html>
`);
});

// Disable SSL certificate validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export interface Location {
  name: string;
  type: string;
}

const [locations, items] = await Promise.all([
  ky.get<Location[]>(`${env.BASE_URL}/locations`).json(),
  ky.get<string[]>(`${env.BASE_URL}/items`).json(),
]);

console.log(`Found ${locations.length} locations and ${items.length} items`);

registerShopsMetrics({ locations, items });
registerLeaderboardMetrics();

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (ex: unknown) {
    if (ex instanceof Error) {
      res.status(500).end(`# ${ex.message}`);
    } else {
      res.status(500).end(`# ${String(ex)}`);
    }
  }
});

app.listen(env.PORT, env.HOST, () => {
  console.log(`Server running at http://${env.HOST}:${env.PORT}/`);
});
