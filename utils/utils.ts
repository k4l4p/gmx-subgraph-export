import { ApolloClient, InMemoryCache } from "@apollo/client"
import { OrderType } from "@gmx-io/sdk/types/orders.js"

export type Numeric = number | bigint

export type BigNumberish = string | Numeric

export function formatUnits(value: bigint, decimals: number) {
	let display = value.toString()

	const negative = display.startsWith("-")
	if (negative) display = display.slice(1)

	display = display.padStart(decimals, "0")

	let [integer, fraction] = [
		display.slice(0, display.length - decimals),
		display.slice(display.length - decimals),
	]
	fraction = fraction.replace(/(0+)$/, "")
	return `${negative ? "-" : ""}${integer || "0"}${
		fraction ? `.${fraction}` : ""
	}`
}

export function numberWithCommas(x: BigNumberish) {
	if (x === undefined || x === null) {
		return "..."
	}

	const parts = x.toString().split(".")
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
	return parts.join(".")
}

export const limitDecimals = (amount: BigNumberish, maxDecimals?: number) => {
	let amountStr = amount.toString()
	if (maxDecimals === undefined) {
		return amountStr
	}
	if (maxDecimals === 0) {
		return amountStr.split(".")[0]
	}
	const dotIndex = amountStr.indexOf(".")
	if (dotIndex !== -1) {
		let decimals = amountStr.length - dotIndex - 1
		if (decimals > maxDecimals) {
			amountStr = amountStr.substr(
				0,
				amountStr.length - (decimals - maxDecimals)
			)
		}
	}

	return amountStr
}

export const padDecimals = (amount: BigNumberish, minDecimals: number) => {
	let amountStr = amount.toString()
	const dotIndex = amountStr.indexOf(".")
	if (dotIndex !== -1) {
		const decimals = amountStr.length - dotIndex - 1
		if (decimals < minDecimals) {
			amountStr = amountStr.padEnd(
				amountStr.length + (minDecimals - decimals),
				"0"
			)
		}
	} else {
		amountStr = amountStr + ".0000"
	}
	return amountStr
}

export const formatAmount = (
	amount: BigNumberish | undefined,
	tokenDecimals: number,
	displayDecimals?: number,
	useCommas?: boolean,
	defaultValue?: string,
	visualMultiplier?: number
) => {
	if (defaultValue === undefined || defaultValue === null) {
		defaultValue = "..."
	}
	if (amount === undefined || amount === null || amount === "") {
		return defaultValue
	}
	if (displayDecimals === undefined) {
		displayDecimals = 4
	}
	let amountStr = formatUnits(
		BigInt(amount) * BigInt(visualMultiplier ?? 1),
		tokenDecimals
	)
	amountStr = limitDecimals(amountStr, displayDecimals)
	if (displayDecimals !== 0) {
		amountStr = padDecimals(amountStr, displayDecimals)
	}
	if (useCommas) {
		return numberWithCommas(amountStr)
	}
	return amountStr
}

export function getByKey<T>(
	obj?: { [key: string]: T },
	key?: string
): T | undefined {
	if (!obj || !key) return undefined

	return obj[key]
}
export function getOrderTypeLabel(orderType: OrderType) {
	const orderTypeLabels = {
		[OrderType.MarketSwap]: `Market Swap`,
		[OrderType.LimitSwap]: `Limit Swap`,
		[OrderType.MarketIncrease]: `Market Increase`,
		[OrderType.LimitIncrease]: `Limit Increase`,
		[OrderType.MarketDecrease]: `Market Decrease`,
		[OrderType.LimitDecrease]: `Limit Decrease`,
		[OrderType.StopLossDecrease]: `Stop Loss Decrease`,
		[OrderType.Liquidation]: `Liquidation`,
	}

	return orderTypeLabels[orderType]
}
export const getSyntheticsGraphClient = (subgraphUrl: string) => {
	return new ApolloClient({
		uri: subgraphUrl,
		cache: new InMemoryCache(),
	})
}

export function getDailyTimeRange() {
	const now = new Date()
	// Set to UTC midnight of current day
	const todayStart =
		Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth(),
			now.getUTCDate(),
			0,
			0,
			0,
			0
		) / 1000

	// Set to UTC midnight of previous day
	const yesterdayStart =
		Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth(),
			now.getUTCDate() - 1,
			0,
			0,
			0,
			0
		) / 1000

	return {
		fromTxTimestamp: yesterdayStart,
		toTxTimestamp: todayStart,
	}
}

export function formatEpochToDay(timestamp: number): string {
    const date = new Date(timestamp * 1000)
    return date.toISOString().split('T')[0]
}
