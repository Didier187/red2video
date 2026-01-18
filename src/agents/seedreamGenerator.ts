import { promises as fs } from 'fs'
import path from 'path'
import { getScript, updateScript } from '../lib/scriptStore'
import type { CharacterConfig } from '../components/types'
import { enhancePromptWithCharacters } from './promptEnhancer'

export type SeeDreamSize = '1K' | '2K' | '4K'
export type SeeDreamResponseFormat = 'url' | 'b64_json'

export interface SeeDreamOptions {
  size?: SeeDreamSize
  watermark?: boolean
  sequentialImageGeneration?: 'enabled' | 'disabled'
  responseFormat?: SeeDreamResponseFormat
  characterConfig?: CharacterConfig
}

export interface GeneratedSeeDreamImage {
  sceneIndex: number
  prompt: string
  filePath: string
  fileName: string
}

export interface FailedSeeDreamImage {
  sceneIndex: number
  prompt: string
  error: string
}

export interface SeeDreamGenerationResult {
  images: GeneratedSeeDreamImage[]
  failedImages: FailedSeeDreamImage[]
  totalScenes: number
}

interface SeeDreamResponse {
  created: number
  data: Array<{
    url?: string
    b64_json?: string
  }>
}

const MEDIA_DIR = path.join(process.cwd(), '.media-store')
const SEEDREAM_API_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations'
const SEEDREAM_MODEL = 'seedream-4-5-251128'

async function ensureMediaDir(scriptId: string): Promise<string> {
  const scriptDir = path.join(MEDIA_DIR, scriptId, 'images')
  await fs.mkdir(scriptDir, { recursive: true })
  return scriptDir
}

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
  const imagesDir = await ensureMediaDir(scriptId)
  const { characterConfig, ...imageOptions } = options

  // Prepare all generation tasks
  const generateImageTask = async (
    scene: { imagePrompt: string },
    index: number
  ): Promise<GeneratedSeeDreamImage> => {
    const fileName = `scene-${String(index + 1).padStart(2, '0')}.png`
    const filePath = path.join(imagesDir, fileName)

    // Enhance prompt with character consistency if config is provided
    const finalPrompt = characterConfig
      ? enhancePromptWithCharacters(scene.imagePrompt, characterConfig, index)
      : scene.imagePrompt

    const imageBuffer = await generateSeeDreamImage(finalPrompt, imageOptions)
    await fs.writeFile(filePath, imageBuffer)

    return {
      sceneIndex: index,
      prompt: scene.imagePrompt,
      filePath,
      fileName,
    }
  }

  // Run all image generations in parallel using Promise.allSettled
  const results = await Promise.allSettled(
    scenes.map((scene, index) => generateImageTask(scene, index))
  )

  // Separate successful and failed results
  const images: GeneratedSeeDreamImage[] = []
  const failedImages: FailedSeeDreamImage[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      images.push(result.value)
    } else {
      const errorMessage =
        result.reason instanceof Error ? result.reason.message : String(result.reason)
      console.error(`Failed to generate SeeDream image for scene ${index + 1}:`, errorMessage)
      failedImages.push({
        sceneIndex: index,
        prompt: scenes[index].imagePrompt,
        error: errorMessage,
      })
    }
  })

  // Update script store with all successful images
  if (images.length > 0) {
    const currentScript = await getScript(scriptId)
    if (currentScript) {
      const existingMedia = currentScript.media?.scenes || []
      const updatedScenes = [...existingMedia]

      // Ensure array has enough slots
      while (updatedScenes.length < scenes.length) {
        updatedScenes.push({})
      }

      // Update all successful images
      for (const image of images) {
        updatedScenes[image.sceneIndex] = {
          ...updatedScenes[image.sceneIndex],
          imagePath: image.filePath,
        }
      }

      await updateScript(scriptId, {
        media: { scenes: updatedScenes },
      })
    }
  }

  return {
    images,
    failedImages,
    totalScenes: scenes.length,
  }
}

export async function getSeeDreamImageAsBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  return buffer.toString('base64')
}
