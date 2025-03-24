import {
	gql,
	type ApolloClient,
	type DocumentNode,
	type NormalizedCacheObject,
} from "@apollo/client"
import type { MarketsInfoData } from "@gmx-io/sdk/types/markets.js"
import type { RawTradeAction } from "@gmx-io/sdk/types/tradeHistory.js"
import { buildFiltersBody } from "@gmx-io/sdk/utils/subgraph.js"
import { convertTradeActions } from "./convertTradeActions"
import { formatEpochToDay, getSyntheticsGraphClient } from "./utils"

export const epochDivider = (from: number, to: number) => {
	const temp: Array<number> = []
	for (let i = from; i < to; i += 60 * 60 * 24) {
		temp.push(i)
	}
	temp.push(to)

	const ret: Array<[number, number]> = []
	for (let i = 0; i < temp.length - 1; i++) {
		ret.push([temp[i], temp[i + 1]])
	}

	return ret.toReversed()
}

export const tradeActionsV2 = async (
	marketsInfo: MarketsInfoData,
	{
		subgraphUrl,
		fromTxTimestamp,
		toTxTimestamp,
	}: {
		subgraphUrl: string
		fromTxTimestamp: number
		toTxTimestamp: number
	}
) => {
	const client = getSyntheticsGraphClient(subgraphUrl)

	const epochArr = epochDivider(fromTxTimestamp, toTxTimestamp)

	const temp = await batchFetch(client, epochArr)

	const outArr = convertTradeActions(temp, marketsInfo)

	return outArr
}

const batchFetch = async (
	client: ApolloClient<NormalizedCacheObject>,
	epochArr: [number, number][]
): Promise<RawTradeAction[]> => {
	const tempArr = epochArr.slice(0, 5)
	const nextArr = epochArr.slice(5)
	const temp = await Promise.all(
		tempArr.map(async (epoch) => {
			return fetchHistory(client, epoch[0], epoch[1])
		})
	)

	if (nextArr.length === 0) {
		return temp.flat()
	}

	return temp.flat().concat(await batchFetch(client, nextArr))
}

const fetchHistory = async (
	client: ApolloClient<NormalizedCacheObject>,
	from: number,
	to: number
): Promise<RawTradeAction[]> => {
	const filtersStr = buildFiltersBody({
		transaction: {
			timestamp_gte: from,
			timestamp_lt: to,
		},
	})

	const whereClause = `where: ${filtersStr}`

	let counter = 0
	let aggrResult: Array<{
		data: RawTradeAction[]
		page: number
	}> = []

	return new Promise(async function recurseFetch(resolve, reject) {
		const queryArr: Array<{
			page: number
			query: DocumentNode
		}> = []
		for (let i = counter * 10; i < 10 * (counter + 1); i++) {
			const query = gql(`{
      tradeActions(
          orderBy: transaction__timestamp,
          orderDirection: desc,
          skip: ${i * 1000},
          first: ${1000},
          ${whereClause}
      ) {
          id
          eventName

          account
          marketAddress
          swapPath
          initialCollateralTokenAddress

          initialCollateralDeltaAmount
          sizeDeltaUsd
          triggerPrice
          acceptablePrice
          executionPrice
          minOutputAmount
          executionAmountOut

          priceImpactUsd
          priceImpactDiffUsd
          positionFeeAmount
          borrowingFeeAmount
          fundingFeeAmount
          liquidationFeeAmount
          pnlUsd
          basePnlUsd

          collateralTokenPriceMax
          collateralTokenPriceMin

          indexTokenPriceMin
          indexTokenPriceMax

          orderType
          orderKey
          isLong
          shouldUnwrapNativeToken

          reason
          reasonBytes

          transaction {
              timestamp
              hash
          }
      }
    }`)
			queryArr.push({
				query,
				page: i,
			})
		}

		console.log(
			`fetching page ${counter} of ${formatEpochToDay(
				from
			)} to ${formatEpochToDay(to)}`
		)
		const result = await Promise.all(
			queryArr.map(async ({ query, page }) => {
				return client.query({ query, fetchPolicy: "no-cache" }).then((r) => ({
					page,
					data: (r.data?.tradeActions ?? []) as RawTradeAction[],
				}))
			})
		).catch((e) => {
			console.log(e)
			reject(e)
			return []
		})
		aggrResult = aggrResult.concat(result)
		counter++

		if (result.some((r) => r.data.length === 0)) {
			resolve(
				aggrResult.toSorted((a, b) => a.page - b.page).flatMap((r) => r.data)
			)
			return
		}

		recurseFetch(resolve, reject)
	})
}
