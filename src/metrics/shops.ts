import { Gauge } from "prom-client";
import type { CrowdSourceTransaction, Location } from "../index.js";

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
  readonly transactions: ReadonlyArray<CrowdSourceTransaction>;
}

export function registerShopsMetrics(options: ShopsMetricOptions): Gauge[] {
  const { locations, items, transactions } = options;

  const metrics: Gauge[] = [];

  const commodityTotalBuyPriceMetric = new Gauge({
    name: "sc_trading_tools_commodity_buy_price_per_scu_total",
    help: "Commodity total buy price at shop",
    labelNames: [
      "commodity",
      "system",
      "location",
      "locationType",
      // "shop",
      // "securityLevel",
      // "isHidden",
    ],
    collect() {
      Object.values(
        transactions
          .filter((t) => t.transaction === "BUYS")
          .reduce((acc, t) => {
            const key = t.commodity + t.location;
            const known = acc[key] ?? null;
            if (!known || known.timestamp < t.timestamp) {
              acc[key] = t;
            }
            return acc;
          }, {} as Record<string, CrowdSourceTransaction>)
      )
        .map((t) => {
          const commodity =
            items.find((i) => i.toLowerCase() === t.commodity.toLowerCase()) ??
            t.commodity;
          const location = locations.find(
            (l) => l.name.toLowerCase() === t.location.toLowerCase()
          ) ?? { name: t.location, type: "unknown" };
          const system = location.name.split(" > ")[0];

          return [
            commodity,
            system,
            location.name,
            location.type,
            t.price,
          ] as const;
        })
        .forEach(([commodity, system, location, locationType, price]) => {
          this.labels(commodity, system, location, locationType).set(price);
        });
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
      // "shop",
      // "securityLevel",
      // "isHidden",
    ],
    collect() {
      Object.values(
        transactions
          .filter((t) => t.transaction === "SELLS")
          .reduce((acc, t) => {
            const key = t.commodity + t.location;
            const known = acc[key] ?? null;
            if (!known || known.timestamp < t.timestamp) {
              acc[key] = t;
            }
            return acc;
          }, {} as Record<string, CrowdSourceTransaction>)
      )
        .map((t) => {
          const commodity =
            items.find((i) => i.toLowerCase() === t.commodity.toLowerCase()) ??
            t.commodity;
          const location = locations.find(
            (l) => l.name.toLowerCase() === t.location.toLowerCase()
          ) ?? { name: t.location, type: "unknown" };
          const system = location.name.split(" > ")[0];

          return [
            commodity,
            system,
            location.name,
            location.type,
            t.price,
          ] as const;
        })
        .forEach(([commodity, system, location, locationType, price]) => {
          this.labels(commodity, system, location, locationType).set(price);
        });
    },
  });

  metrics.push(commodityTotalBuyPriceMetric, commodityTotalSellPriceMetric);

  return metrics;
}
