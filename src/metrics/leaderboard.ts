import ky from "ky";
import { Gauge } from "prom-client";
import { env } from "../env.js";

interface LeaderboardPosition {
  readonly position: number;
  readonly name: string;
  readonly points: number;
}

export function registerLeaderboardMetrics(): Gauge[] {
  const metrics: Gauge[] = [];

  metrics.push(
    new Gauge({
      name: "sc_trading_tools_leaderboard_current_points_total",
      help: "Current leaderboard",
      labelNames: ["handle"],
      async collect() {
        const positions = await ky
          .get<LeaderboardPosition[]>(
            `${env.BASE_URL}/crowdsource/leaderboards/current`
          )
          .json();

        for (const position of positions) {
          this.labels(position.name).set(position.points);
        }
      },
    })
  );

  return metrics;
}
