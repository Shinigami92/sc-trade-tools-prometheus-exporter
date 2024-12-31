import express from "express";
import ky from "ky";
import { readFile, writeFile } from "node:fs/promises";
import { register } from "prom-client";
import { env } from "./env.js";
import { registerLeaderboardMetrics } from "./metrics/leaderboard.js";
import { registerShopsMetrics } from "./metrics/shops.js";

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

// The SC Trade Tools API will cache responses for 1 hour server side based on the latest server startup time
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

export interface Location {
  name: string;
  type: string;
}

const [locations, items] = await Promise.all([
  ky.get<Location[]>(`${env.BASE_URL}/locations`).json(),
  ky.get<string[]>(`${env.BASE_URL}/items`).json(),
]);

export interface CrowdSourceTransaction {
  location: string;
  transaction: "SELLS" | "BUYS";
  commodity: string;
  price: number;
  quantity: number;
  saturation: number;
  timestamp: string;
}

const transactions: CrowdSourceTransaction[] = [];

try {
  const transactionsCsvContent = await readFile("transactions.csv", "utf-8");

  transactions.push(
    ...transactionsCsvContent.split("\n").map((line) => {
      const [
        location,
        transaction,
        commodity,
        price,
        quantity,
        saturation,
        timestamp,
      ] = line.split(";");
      return {
        location,
        transaction: transaction as "SELLS" | "BUYS",
        commodity,
        price: Number(price),
        quantity: Number(quantity),
        saturation: Number(saturation),
        timestamp,
      };
    })
  );
} catch {}

let latestTransaction = transactions[0] ?? null;

async function fetchTransactions() {
  let page = 0;
  let response;

  do {
    console.log(`Fetching page ${page}...`);
    response = await ky
      .get<{
        content: Array<{
          location: string;
          transaction: "SELLS" | "BUYS";
          commodity: string;
          price: number;
          quantity: number;
          saturation: number;
          boxSizesInScu: null;
          batchId: string;
          timestamp: string;
        }>;
        pageable: {
          pageNumber: number;
          pageSize: number;
          sort: {
            sorted: boolean;
            empty: boolean;
            unsorted: boolean;
          };
          offset: number;
          paged: boolean;
          unpaged: boolean;
        };
        last: boolean;
        totalElements: number;
        totalPages: number;
        first: boolean;
        size: number;
        number: number;
        sort: {
          sorted: boolean;
          empty: boolean;
          unsorted: boolean;
        };
        numberOfElements: number;
        empty: boolean;
      }>(`${env.BASE_URL}/crowdsource/commodity-listings?page=${page}`)
      .json();

    if (latestTransaction != null) {
      const knownTransaction = response.content.findIndex(
        (t) => t.timestamp === latestTransaction.timestamp
      );

      if (knownTransaction !== -1) {
        console.log(`Found known transaction at index ${knownTransaction}`);
        response.content = response.content.slice(0, knownTransaction);
        transactions.push(
          ...response.content.map((t) => ({
            location: t.location,
            transaction: t.transaction,
            commodity: t.commodity,
            price: t.price,
            quantity: t.quantity,
            saturation: t.saturation,
            timestamp: t.timestamp,
          }))
        );
        break;
      }
    }

    transactions.push(
      ...response.content.map((t) => ({
        location: t.location,
        transaction: t.transaction,
        commodity: t.commodity,
        price: t.price,
        quantity: t.quantity,
        saturation: t.saturation,
        timestamp: t.timestamp,
      }))
    );

    page++;
  } while (response.last === false);

  await writeFile(
    "transactions.csv",
    transactions
      .map(
        ({
          location,
          transaction,
          commodity,
          price,
          quantity,
          saturation,
          timestamp,
        }) =>
          [
            location,
            transaction,
            commodity,
            price,
            quantity,
            saturation,
            timestamp,
          ].join(";")
      )
      .join("\n")
  );

  console.log(
    `Next fetch will be at ${new Date(
      Date.now() + ONE_HOUR_IN_MS
    ).toISOString()}`
  );
}

await fetchTransactions();
setInterval(async () => await fetchTransactions(), ONE_HOUR_IN_MS);

console.log(`Found ${locations.length} locations and ${items.length} items`);

registerShopsMetrics({ locations, items, transactions });
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
