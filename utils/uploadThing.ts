import { UTApi } from "uploadthing/server"
import type { FileEsque } from "uploadthing/types"

export const uploadCsv = async (
	csvString: string,
	filename: string,
	customId: string
) => {
	const token = process.env.UPLOADTHING_TOKEN ?? ""
	if (!token) throw new Error("No uploadthing secret")
	const utapi = new UTApi({
		token,
	})
	const blob = new Blob([csvString], { type: "text/csv" })
	const file: FileEsque = blob
	file.name = filename
	file.customId = customId

	try {
		const response = await utapi.uploadFiles(file)

		return response
	} catch (error) {
		console.error("Error uploading file:", error)
		throw error
	}
}
