import type { CharacterConfig } from '../components/types'
import {
  generateImagesWithProvider,
  getImageAsBase64,
} from './baseImageGenerator'
import type {
  GeneratedImage,
  FailedImage,
  ImageGenerationResult,
} from './baseImageGenerator'

// Re-export shared types under SeeDream aliases for backward compatibility
export type GeneratedSeeDreamImage = GeneratedImage
export type FailedSeeDreamImage = FailedImage
export type SeeDreamGenerationResult = ImageGenerationResult
export { getImageAsBase64 as getSeeDreamImageAsBase64 }

export type SeeDreamSize = '1K' | '2K' | '4K'
export type SeeDreamResponseFormat = 'url' | 'b64_json'

export interface SeeDreamOptions {
  size?: SeeDreamSize
  watermark?: boolean
  sequentialImageGeneration?: 'enabled' | 'disabled'
  responseFormat?: SeeDreamResponseFormat
  characterConfig?: CharacterConfig
}

interface SeeDreamResponse {
  created: number
  data: Array<{
    url?: string
    b64_json?: string
  }>
}

const SEEDREAM_API_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations'
const SEEDREAM_MODEL = 'seedream-4-5-251128'

function getApiKey(): string {
  const apiKey = process.env.ARK_API_KEY
  if (!apiKey) {
    throw new Error('ARK_API_KEY environment variable is not set')
  }
  return apiKey
}

export async function generateSeeDreamImage(
  prompt: string,
  options: SeeDreamOptions = {}
): Promise<Buffer> {
  const {
    size = '2K',
    watermark = true,
    sequentialImageGeneration = 'disabled',
    responseFormat = 'url',
  } = options

  const apiKey = getApiKey()

  const response = await fetch(SEEDREAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: SEEDREAM_MODEL,
      prompt,
      sequential_image_generation: sequentialImageGeneration,
      response_format: responseFormat,
      size,
      stream: false,
      watermark,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SeeDream API error (${response.status}): ${errorText}`)
  }

  const result: SeeDreamResponse = await response.json()

  if (!result.data || result.data.length === 0) {
    throw new Error('No image data returned from SeeDream API')
  }

  const imageData = result.data[0]

  if (responseFormat === 'b64_json' && imageData.b64_json) {
    return Buffer.from(imageData.b64_json, 'base64')
  }

  if (responseFormat === 'url' && imageData.url) {
    const imageResponse = await fetch(imageData.url)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image from URL: ${imageResponse.status}`)
    }
    const arrayBuffer = await imageResponse.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  throw new Error('Invalid response format from SeeDream API')
}

export async function generateSeeDreamImagesForScenes(
  scriptId: string,
  scenes: Array<{ imagePrompt: string }>,
  options: SeeDreamOptions = {}
): Promise<SeeDreamGenerationResult> {
  const { characterConfig, ...imageOptions } = options

  return generateImagesWithProvider(
    scriptId,
    scenes,
    imageOptions,
    characterConfig,
    generateSeeDreamImage,
    'SeeDream'
  )
}
