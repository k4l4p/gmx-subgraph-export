import { authenticate } from "@google-cloud/local-auth"
import { google } from "googleapis"
import * as path from "path"
import { Readable } from "stream"

const SCOPES = ["https://www.googleapis.com/auth/drive.file"]

export async function uploadStringToDrive(
	csvContent: string,
	fileName: string
) {
	try {
		const auth = await authenticate({
			keyfilePath: path.join(__dirname, "../credentials.json"),
			scopes: SCOPES,
		})

		const drive = google.drive({ version: "v3", auth })

		// Create file metadata
		const fileMetadata = {
			name: `${fileName}.csv`,
			mimeType: "text/csv",
		}

		// Convert string to stream
		const bufferStream = new Readable()
		bufferStream.push(csvContent)
		bufferStream.push(null)

		// Create media object
		const media = {
			mimeType: "text/csv",
			body: bufferStream,
		}

		// Upload file
		const response = await drive.files.create({
			requestBody: fileMetadata,
			media: media,
			fields: "id",
		})

		console.log("File uploaded successfully. File ID:", response.data.id)
		return response.data.id
	} catch (error) {
		console.error("Error uploading file:", error)
		throw error
	}
}
