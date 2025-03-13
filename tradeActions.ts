import { ApolloClient, gql, type NormalizedCacheObject } from "@apollo/client"
import { USD_DECIMALS } from "@gmx-io/sdk/configs/factors.js"
import type { MarketsInfoData } from "@gmx-io/sdk/types/markets.js"
import type { RawTradeAction } from "@gmx-io/sdk/types/tradeHistory.js"
import { getByKey } from "@gmx-io/sdk/utils/objects.js"
import { buildFiltersBody } from "@gmx-io/sdk/utils/subgraph.js"
import { parseContractPrice } from "@gmx-io/sdk/utils/tokens.js"
import { getAddress } from "viem"
import {
	formatAmount,
	getOrderTypeLabel,
	getSyntheticsGraphClient,
} from "./utils"

export const tradeActions = async (
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
	const filtersStr = buildFiltersBody({
		transaction: {
			timestamp_gte: fromTxTimestamp,
			timestamp_lt: toTxTimestamp,
		},
	})
	const client = getSyntheticsGraphClient(subgraphUrl)

	const whereClause = `where: ${filtersStr}`
	const temp = await fetchHistory(client, whereClause)
	const outArr = filterFun(temp, marketsInfo)
	console.log(`converted: ${outArr?.length}`)

	return outArr
}

const filterFun = (arr: RawTradeAction[], marketsInfo: MarketsInfoData) => {
	if (!marketsInfo) return
	const outArr = arr.map((value) => {
		const marketAddress = getAddress(value.marketAddress ?? "")
		const market = getByKey(marketsInfo, marketAddress)
		const indexToken = market?.indexToken
		const longToken = market?.longToken
		const shortToken = market?.shortToken
		const marketName = `${indexToken?.symbol ?? ""}/USD [${
			longToken?.symbol ?? ""
		}-${shortToken?.symbol ?? ""}]`

		const executionPrice = indexToken
			? customFormatUsd(
					parseContractPrice(
						BigInt(value.executionPrice ?? ""),
						indexToken?.decimals
					)
			  )
			: ""
		const indexTokenPriceMin = indexToken
			? customFormatUsd(
					parseContractPrice(
						BigInt(value.indexTokenPriceMin ?? ""),
						indexToken?.decimals
					)
			  )
			: ""
		const indexTokenPriceMax = indexToken
			? customFormatUsd(
					parseContractPrice(
						BigInt(value.indexTokenPriceMax ?? ""),
						indexToken?.decimals
					)
			  )
			: ""
		return {
			account: value.account,
			eventName: value.eventName,
			orderType: getOrderTypeLabel(value.orderType),
			sizeDeltaUsd: customFormatUsd(value.sizeDeltaUsd),
			timestamp: value.transaction.timestamp,
			marketName,
			marketAddress: value.marketAddress,
			isLong: value.isLong,
			priceImpactUsd: customFormatUsd(value.priceImpactUsd),
			pnlUsd: customFormatUsd(value.pnlUsd),
			basePnlUsd: customFormatUsd(value.basePnlUsd),
			executionPrice,
			indexTokenPriceMin,
			indexTokenPriceMax,
		}
	})

	return outArr
}

const fetchHistory = async (
	client: ApolloClient<NormalizedCacheObject>,
	whereClause: string
) => {
	let fromPage = 0
	let toPage = 100
	let currentMax: null | number = null

	while (fromPage !== toPage) {
		const query = gql(`{
      tradeActions(
          orderBy: transaction__timestamp,
          orderDirection: desc,
          skip: ${toPage * 1000},
          first: ${1000},
          ${whereClause}
      ) {
          id
      }
    }`)
		const result = await client!.query({ query, fetchPolicy: "no-cache" })
		const rawData = (result.data.tradeActions ?? []) as any[]
		console.log({ fromPage, toPage, currentMax })

		if (rawData.length === 1000) {
			fromPage = toPage
			if (currentMax === null) {
				toPage += 100
			} else {
				toPage = currentMax
			}
		} else if (rawData.length === 0) {
			currentMax = toPage
			toPage = Math.floor((fromPage + toPage) / 2)
		} else {
			fromPage = toPage
		}
	}

	const test = [...Array(fromPage).keys(), fromPage].map((page) => {
		return async () => {
			const query = gql(`{
      tradeActions(
          orderBy: transaction__timestamp,
          orderDirection: desc,
          skip: ${page * 1000},
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
			return client!.query({ query, fetchPolicy: "no-cache" }).then((r) => ({
				page,
				data: (r.data?.tradeActions ?? []) as RawTradeAction[],
			}))
		}
	})

	const result: Array<{
		page: number
		data: RawTradeAction[]
	}> = []

	const chunkSize = 10
	for (let i = 0; i < test.length; i += chunkSize) {
		const chunk = test.slice(i, i + chunkSize)

		let success = false
		while (!success) {
			try {
				console.time((i + chunk.length).toString())
				const tempResult = await Promise.all(chunk.map((fn) => fn()))
				console.log(`fetched chunk ${i + chunk.length} out of ${test.length}`)
				console.timeEnd((i + chunk.length).toString())
				result.push(...tempResult)
				success = true
			} catch (err) {
				console.log(err)
				console.log("retry")
				console.timeEnd(i.toString())
				await timeout(5000)
			}
		}
	}

	// const result = await Promise.all(test);

	const allActions = result
		.sort((a, b) => a.page - b.page)
		.map((r) => r.data)
		.flat()

	return allActions
}

const customFormatUsd = (value?: string | bigint) =>
	formatAmount(BigInt(value ?? ""), USD_DECIMALS, 2, false)

function timeout(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
