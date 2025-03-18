import { GmxSdk } from "@gmx-io/sdk"
import { exportToCsv } from "./csv"
import { tradeActions } from "./tradeActions"

const gmx = new GmxSdk({
	chainId: 42161,
	rpcUrl: "https://arb1.arbitrum.io/rpc",
	oracleUrl: "https://arbitrum-api.gmxinfra.io",
	subsquidUrl:
		"https://gmx.squids.live/gmx-synthetics-arbitrum:live/api/graphql",
	subgraphUrl:
		"https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-arbitrum-stats/api",
})

const { marketsInfoData } = await gmx.markets.getMarketsInfo()

if (!marketsInfoData) {
	throw new Error("No markets info data")
}

const trades = await tradeActions(marketsInfoData, {
	fromTxTimestamp: 1740787200,
	toTxTimestamp: 1742263854,
	subgraphUrl: gmx.config.subgraphUrl,
})

if (!trades) {
	throw new Error("No trades")
}

exportToCsv("rawData", trades, [])
