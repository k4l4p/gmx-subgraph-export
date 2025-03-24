import { GmxSdk } from "@gmx-io/sdk"
import { exportToCsv } from "./utils/csv"
import { tradeActionsV2 } from "./utils/tradeActionsV2"

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

// const { fromTimestamp, toTimestamp } = getDailyTimeRange()

const trades = await tradeActionsV2(marketsInfoData, {
	fromTxTimestamp: 1740787200,
	toTxTimestamp: 1742792018,
	subgraphUrl: gmx.config.subgraphUrl,
})

if (!trades) {
	throw new Error("No trades")
}

exportToCsv("data", trades, [])
