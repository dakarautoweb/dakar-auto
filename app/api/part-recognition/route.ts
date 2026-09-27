import { handlePartRecognitionRequest } from '@/src/services/part-recognition/handle-request'

// Photo → catalog category/subcategory, via OpenAI (see
// src/services/part-recognition/). Nothing is stored: the image is only
// forwarded to the provider for this one request.
//
// Leaves headroom above the 20s provider timeout for parsing the upload.
export const maxDuration = 30

export async function POST(request: Request) {
  return handlePartRecognitionRequest(request)
}
