import * as fs from 'fs'
import * as path from 'path'

const CSV_SEPARATOR = ","

function filterFields<T>(data: T, excludedFields: (keyof T)[]): Partial<T> {
	const result = { ...data }
	excludedFields.forEach((field) => delete result[field])
	return result
}

function convertToCSV<T>(
	data: Partial<T>[],
	customHeaders?: Partial<Record<keyof T, string>>
): string {
	const keys = customHeaders ? Object.keys(customHeaders) : Object.keys(data[0])

	const header = keys
		.map((key) => customHeaders?.[key as keyof T] ?? key)
		.join(CSV_SEPARATOR)

	const values = data
		.map((object) =>
			keys
				.map((key) => {
					const value = (object as any)[key]
					const cell = value === undefined ? "" : String(value)
					return cell.includes(CSV_SEPARATOR) ? `"${cell}"` : cell
				})
				.join(CSV_SEPARATOR)
		)
		.join("\n")
	return `${header}\n${values}`
}

export function exportToCsv<T>(
	fileName: string,
	data: T[],
	excludedFields: (keyof T)[],
	customHeaders?: Partial<Record<keyof T, string>>,
	splitCount?: number
) {
	const filteredData = data.map((item) => filterFields(item, excludedFields))
	const csv = convertToCSV(filteredData, customHeaders)

	if (splitCount && splitCount > 0) {
		const chunkSize = Math.ceil(filteredData.length / splitCount)
		for (let i = 0; i < splitCount; i++) {
			const chunk = filteredData.slice(i * chunkSize, (i + 1) * chunkSize)
			const chunkCsv = convertToCSV(chunk, customHeaders)
			const outputPath = path.join(process.cwd(), `${fileName}_part${i + 1}.csv`)
			fs.writeFileSync(outputPath, chunkCsv)
		}
	} else {
		const outputPath = path.join(process.cwd(), `${fileName}.csv`)
		fs.writeFileSync(outputPath, csv)
	}
}
