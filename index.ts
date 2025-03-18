import { GmxSdk } from "@gmx-io/sdk"
import { convertToCSV } from "./utils/csv"
import { uploadStringToDrive } from "./utils/googleDrive"
import { tradeActions } from "./utils/tradeActions"
import { formatEpochToDay, getDailyTimeRange } from "./utils/utils"

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
const { fromTxTimestamp, toTxTimestamp } = getDailyTimeRange()

const trades = await tradeActions(marketsInfoData, {
	fromTxTimestamp,
	toTxTimestamp,
	subgraphUrl: gmx.config.subgraphUrl,
})

if (!trades) {
	throw new Error("No trades")
}

const csv = convertToCSV(trades)

uploadStringToDrive(
	csv,
	`${formatEpochToDay(fromTxTimestamp)}_${formatEpochToDay(toTxTimestamp)}`
)
