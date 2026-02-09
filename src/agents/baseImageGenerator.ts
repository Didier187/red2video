import { promises as fs } from 'fs'
import path from 'path'
import { getScript, updateScript } from '../lib/scriptStore'
import type { CharacterConfig } from '../components/types'
import { enhancePromptWithCharacters } from './promptEnhancer'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Inline concurrency limiter (no external dependency needed)
// ---------------------------------------------------------------------------

function pLimit(concurrency: number) {
  let active = 0
  const queue: Array<() => void> = []
  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        active++
        try {
          resolve(await fn())
        } catch (err) {
          reject(err)
        } finally {
          active--
          if (queue.length > 0) queue.shift()!()
        }
      }
      if (active < concurrency) run()
      else queue.push(run)
    })
  }
}

// Cap concurrent image API calls to 3 to avoid rate-limit errors
const limit = pLimit(3)

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const MEDIA_DIR = path.join(process.cwd(), '.media-store')

async function ensureMediaDir(scriptId: string): Promise<string> {
  const scriptDir = path.join(MEDIA_DIR, scriptId, 'images')
  await fs.mkdir(scriptDir, { recursive: true })
  return scriptDir
}

export async function getImageAsBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  return buffer.toString('base64')
}

// ---------------------------------------------------------------------------
// Provider-agnostic orchestration
// ---------------------------------------------------------------------------

/**
 * A function that takes a prompt string and provider-specific options,
 * and returns a Buffer containing the generated image bytes.
 */
export type GenerateImageFn<TOptions> = (
  prompt: string,
  options: TOptions
) => Promise<Buffer>

/**
 * Shared orchestration for batch image generation.
 *
 * @param scriptId        - ID used for file-system paths and script-store updates
 * @param scenes          - Array of scenes containing imagePrompt strings
 * @param providerOptions - Provider-specific options (forwarded to generateFn)
 * @param characterConfig - Optional character consistency config
 * @param generateFn      - The actual provider-specific image generation function
 * @param providerLabel   - Human-readable provider name for log messages
 */
export async function generateImagesWithProvider<TOptions>(
  scriptId: string,
  scenes: Array<{ imagePrompt: string }>,
  providerOptions: TOptions,
  characterConfig: CharacterConfig | undefined,
  generateFn: GenerateImageFn<TOptions>,
  providerLabel: string = 'image'
): Promise<ImageGenerationResult> {
  const imagesDir = await ensureMediaDir(scriptId)

  // Prepare all generation tasks (each wrapped in concurrency limiter)
  const generateImageTask = (
    scene: { imagePrompt: string },
    index: number
  ): Promise<GeneratedImage> => {
    return limit(async () => {
      const fileName = `scene-${String(index + 1).padStart(2, '0')}.png`
      const filePath = path.join(imagesDir, fileName)

      // Enhance prompt with character consistency if config is provided
      const finalPrompt = characterConfig
        ? enhancePromptWithCharacters(scene.imagePrompt, characterConfig, index)
        : scene.imagePrompt

      const imageBuffer = await generateFn(finalPrompt, providerOptions)
      await fs.writeFile(filePath, imageBuffer)

      return {
        sceneIndex: index,
        prompt: scene.imagePrompt,
        filePath,
        fileName,
      }
    })
  }

  // Run all image generations with concurrency limiting via Promise.allSettled
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
      console.error(`Failed to generate ${providerLabel} image for scene ${index + 1}:`, errorMessage)
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
