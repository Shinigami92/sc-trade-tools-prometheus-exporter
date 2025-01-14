# SC Trade Tools Prometheus Exporter

This is an unofficial Prometheus exporter for [SC Trade Tools](https://sc-trade.tools).

You can run it with the following command:

```sh
docker run -d --restart unless-stopped --name sc-trade-tools-prometheus-exporter -e 'HOST=0.0.0.0' -e 'PORT=9020' -p 9020:9020 shini92/sc-trade-tools-prometheus-exporter:latest
```

The first boot up will take a while because an index will be build up and cached.

## Metrics

```sh
# HELP sc_trading_tools_commodity_buy_price_per_scu_total Commodity total buy price at shop
# TYPE sc_trading_tools_commodity_buy_price_per_scu_total gauge
sc_trading_tools_commodity_buy_price_per_scu_total{commodity,system,location,locationType}

# HELP sc_trading_tools_commodity_sell_price_per_scu_total Commodity total sell price at shop
# TYPE sc_trading_tools_commodity_sell_price_per_scu_total gauge
sc_trading_tools_commodity_sell_price_per_scu_total{commodity,system,location,locationType}

# HELP sc_trading_tools_commodity_buy_quantity_scu_total Commodity total buy quantity at shop
# TYPE sc_trading_tools_commodity_buy_quantity_scu_total gauge
sc_trading_tools_commodity_buy_quantity_scu_total{commodity,system,location,locationType}

# HELP sc_trading_tools_commodity_sell_quantity_scu_total Commodity total sell quantity at shop
# TYPE sc_trading_tools_commodity_sell_quantity_scu_total gauge
sc_trading_tools_commodity_sell_quantity_scu_total{commodity,system,location,locationType}

# HELP sc_trading_tools_commodity_buy_saturation_scu_total Commodity total buy saturation at shop
# TYPE sc_trading_tools_commodity_buy_saturation_scu_total gauge
sc_trading_tools_commodity_buy_saturation_scu_total{commodity,system,location,locationType}

# HELP sc_trading_tools_commodity_sell_saturation_scu_total Commodity total sell saturation at shop
# TYPE sc_trading_tools_commodity_sell_saturation_scu_total gauge
sc_trading_tools_commodity_sell_saturation_scu_total{commodity,system,location,locationType}

# HELP sc_trading_tools_leaderboard_current_points_total Current leaderboard
# TYPE sc_trading_tools_leaderboard_current_points_total gauge
sc_trading_tools_leaderboard_current_points_total{handle}
```

## Example Prometheus Configuration

```yaml
scrape_configs:
  - job_name: "sc-trade-tools-exporter"
    scrape_interval: 15m
    scrape_timeout: 30s
    static_configs:
      - targets: ["localhost:9020"]
```

> Note: The buy and sell prices are cached for 1h in the API anyway, so only some metrics are updated every 15 minutes.
