import OpenAI from 'openai'
import type { CharacterConfig } from '../components/types'
import {
  generateImagesWithProvider,
  getImageAsBase64,
  type ImageGenerationResult,
} from './baseImageGenerator'

// Re-export shared types so existing imports continue to work
export type {
  GeneratedImage,
  FailedImage,
  ImageGenerationResult,
} from './baseImageGenerator'
export { getImageAsBase64 }

export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792'
export type ImageQuality = 'standard' | 'hd'
export type ImageStyle = 'vivid' | 'natural'

export interface ImageGenerationOptions {
  size?: ImageSize
  quality?: ImageQuality
  style?: ImageStyle
  characterConfig?: CharacterConfig
}

const openai = new OpenAI()

export async function generateImageForPrompt(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<Buffer> {
  const { size = '1792x1024', quality = 'standard', style = 'vivid' } = options

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size,
    quality,
    style,
    response_format: 'b64_json',
  })

  const base64Data = response.data?.[0]?.b64_json
  if (!base64Data) {
    throw new Error('No image data returned from DALL-E')
  }

  return Buffer.from(base64Data, 'base64')
}

export async function generateImagesForScenes(
  scriptId: string,
  scenes: Array<{ imagePrompt: string }>,
  options: ImageGenerationOptions = {}
): Promise<ImageGenerationResult> {
  const { characterConfig, ...imageOptions } = options

  return generateImagesWithProvider(
    scriptId,
    scenes,
    imageOptions,
    characterConfig,
    generateImageForPrompt,
    'DALL-E'
  )
}
