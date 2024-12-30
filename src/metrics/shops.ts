import ky from "ky";
import { Gauge } from "prom-client";
import { env } from "../env.js";
import type { Location } from "../index.js";

type ScuSize = 1 | 2 | 4 | 8 | 16 | 24 | 32;

interface Transaction {
  readonly location: string;
  readonly shop: string;
  readonly securityLevel: number;
  readonly faction: string;
  readonly action: "BUYS" | "SELLS";
  readonly itemQuantityInScu: number;
  readonly itemName: string;
  readonly price: number;
  readonly quantityInScu: number;
  readonly maxQuantityInScu: number;
  readonly boxSizesInScu: ReadonlyArray<ScuSize>;
  readonly isHidden: boolean;
}

export interface ShopsMetricOptions {
  readonly locations: ReadonlyArray<Location>;
  readonly items: ReadonlyArray<string>;
}

export function registerShopsMetrics(options: ShopsMetricOptions): Gauge[] {
  const { locations, items } = options;

  const metrics: Gauge[] = [];

  let lastScraped: Date | null = null;
  let lastScrapedTransactions: Transaction[] = [];

  async function collectTransactions(): Promise<Transaction[]> {
    const now = new Date();

    if (lastScraped && lastScraped.getTime() + 1000 * 60 * 5 > now.getTime()) {
      return lastScrapedTransactions;
    }

    const promises = await Promise.allSettled(
      items.map((item) =>
        ky
          .get<Transaction[]>(`${env.BASE_URL}/items/${item}/transactions`, {
            headers: {
              Token: env.API_TOKEN,
            },
          })
          .json()
      )
    );

    lastScraped = now;

    const transactions: Transaction[] = [];

    for (const promise of promises) {
      if (promise.status === "rejected") {
        console.error(promise.reason);
      } else {
        transactions.push(...promise.value);
      }
    }

    lastScrapedTransactions = transactions;

    return transactions;
  }

  const commodityTotalBuyPriceMetric = new Gauge({
    name: "sc_trading_tools_commodity_buy_price_per_scu_total",
    help: "Commodity total buy price at shop",
    labelNames: [
      "commodity",
      "system",
      "location",
      "locationType",
      "shop",
      "securityLevel",
      "isHidden",
    ],
    async collect() {
      const transactions = await collectTransactions();

      for (const transaction of transactions) {
        if (transaction.action === "BUYS") {
          this.labels(
            transaction.itemName,
            transaction.location.split(" > ")[0],
            transaction.location,
            locations.find((location) => location.name === transaction.location)
              ?.type ?? "unknown",
            transaction.shop,
            `${transaction.securityLevel}`,
            `${transaction.isHidden}`
          ).set(transaction.price);
        }
      }
    },
  });

  const commodityTotalSellPriceMetric = new Gauge({
    name: "sc_trading_tools_commodity_sell_price_per_scu_total",
    help: "Commodity total sell price at shop",
    labelNames: [
      "commodity",
      "system",
      "location",
      "locationType",
      "shop",
      "securityLevel",
      "isHidden",
    ],
    async collect() {
      const transactions = await collectTransactions();

      for (const transaction of transactions) {
        if (transaction.action === "SELLS") {
          this.labels(
            transaction.itemName,
            transaction.location.split(" > ")[0],
            transaction.location,
            locations.find((location) => location.name === transaction.location)
              ?.type ?? "unknown",
            transaction.shop,
            `${transaction.securityLevel}`,
            `${transaction.isHidden}`
          ).set(transaction.price);
        }
      }
    },
  });

  metrics.push(commodityTotalBuyPriceMetric, commodityTotalSellPriceMetric);

  return metrics;
}
