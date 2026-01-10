import OpenAI from 'openai'
import { promises as fs } from 'fs'
import path from 'path'

export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792'
export type ImageQuality = 'standard' | 'hd'
export type ImageStyle = 'vivid' | 'natural'

export interface ImageGenerationOptions {
  size?: ImageSize
  quality?: ImageQuality
  style?: ImageStyle
}

export interface GeneratedImage {
  sceneIndex: number
  prompt: string
  filePath: string
  fileName: string
}

export interface ImageGenerationResult {
  images: GeneratedImage[]
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

  const base64Data = response.data[0].b64_json
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
  const images: GeneratedImage[] = []

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const fileName = `scene-${String(i + 1).padStart(2, '0')}.png`
    const filePath = path.join(imagesDir, fileName)

    try {
      const imageBuffer = await generateImageForPrompt(scene.imagePrompt, options)
      await fs.writeFile(filePath, imageBuffer)

      images.push({
        sceneIndex: i,
        prompt: scene.imagePrompt,
        filePath,
        fileName,
      })
    } catch (error) {
      console.error(`Failed to generate image for scene ${i + 1}:`, error)
      throw error
    }
  }

  return {
    images,
    totalScenes: scenes.length,
  }
}

export async function getImageAsBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  return buffer.toString('base64')
}
