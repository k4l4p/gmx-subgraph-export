import { USD_DECIMALS } from "@gmx-io/sdk/configs/factors.js"
import type { MarketsInfoData } from "@gmx-io/sdk/types/markets.js"
import type { RawTradeAction } from "@gmx-io/sdk/types/tradeHistory.js"
import { parseContractPrice } from "@gmx-io/sdk/utils/tokens.js"
import { getAddress } from "viem"
import { formatAmount, getByKey, getOrderTypeLabel } from "./utils"

export const convertTradeActions = (
	arr: RawTradeAction[],
	marketsInfo: MarketsInfoData
) => {
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

		const date = new Date(value.transaction.timestamp * 1000).toUTCString()

		const trxHash = value.transaction.hash
		return {
			account: value.account,
			eventName: value.eventName,
			orderType: getOrderTypeLabel(value.orderType),
			sizeDeltaUsd: customFormatUsd(value.sizeDeltaUsd),
			timestamp: value.transaction.timestamp,
			date,
			marketName,
			marketAddress: value.marketAddress,
			isLong: value.isLong,
			priceImpactUsd: customFormatUsd(value.priceImpactUsd),
			pnlUsd: customFormatUsd(value.pnlUsd),
			basePnlUsd: customFormatUsd(value.basePnlUsd),
			executionPrice,
			indexTokenPriceMin,
			indexTokenPriceMax,
			trxHash,
		}
	})

	return outArr
}

const customFormatUsd = (value?: string | bigint) =>
	formatAmount(BigInt(value ?? ""), USD_DECIMALS, 2, false)
