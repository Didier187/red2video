import OpenAI from 'openai'
import { promises as fs } from 'fs'
import path from 'path'
import { getScript, updateScript } from '../lib/scriptStore'
import type { CharacterConfig } from '../components/types'
import { enhancePromptWithCharacters } from './promptEnhancer'

export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792'
export type ImageQuality = 'standard' | 'hd'
export type ImageStyle = 'vivid' | 'natural'

export interface ImageGenerationOptions {
  size?: ImageSize
  quality?: ImageQuality
  style?: ImageStyle
  characterConfig?: CharacterConfig
}

export interface GeneratedImage {
  sceneIndex: number
  prompt: string
  filePath: string
  fileName: string
}

export interface FailedImage {
  sceneIndex: number
  prompt: string
  error: string
}

export interface ImageGenerationResult {
  images: GeneratedImage[]
  failedImages: FailedImage[]
  totalScenes: number
}

const openai = new OpenAI()

const MEDIA_DIR = path.join(process.cwd(), '.media-store')

async function ensureMediaDir(scriptId: string): Promise<string> {
  const scriptDir = path.join(MEDIA_DIR, scriptId, 'images')
  await fs.mkdir(scriptDir, { recursive: true })
  return scriptDir
}

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
  const imagesDir = await ensureMediaDir(scriptId)
  const { characterConfig, ...imageOptions } = options

  // Prepare all generation tasks
  const generateImageTask = async (
    scene: { imagePrompt: string },
    index: number
  ): Promise<GeneratedImage> => {
    const fileName = `scene-${String(index + 1).padStart(2, '0')}.png`
    const filePath = path.join(imagesDir, fileName)

    // Enhance prompt with character consistency if config is provided
    const finalPrompt = characterConfig
      ? enhancePromptWithCharacters(scene.imagePrompt, characterConfig, index)
      : scene.imagePrompt

    const imageBuffer = await generateImageForPrompt(finalPrompt, imageOptions)
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
  const images: GeneratedImage[] = []
  const failedImages: FailedImage[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      images.push(result.value)
    } else {
      const errorMessage =
        result.reason instanceof Error ? result.reason.message : String(result.reason)
      console.error(`Failed to generate image for scene ${index + 1}:`, errorMessage)
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

export async function getImageAsBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  return buffer.toString('base64')
}
