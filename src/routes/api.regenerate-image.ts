import { createFileRoute } from '@tanstack/react-router'
import { promises as fs } from 'fs'
import path from 'path'
import {
  generateImageForPrompt,
  ImageSize,
  ImageQuality,
  ImageStyle,
  GeneratedImage,
} from '../agents/imageGenerator'
import { getScript } from '../lib/scriptStore'

interface RegenerateImageRequest {
  scriptId: string
  sceneIndex: number
  prompt: string
  size?: ImageSize
  quality?: ImageQuality
  style?: ImageStyle
}

const MEDIA_DIR = path.join(process.cwd(), '.media-store')

export const Route = createFileRoute('/api/regenerate-image')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: RegenerateImageRequest = await request.json()

          if (!body.scriptId) {
            return Response.json(
              { error: 'Missing scriptId' },
              { status: 400 }
            )
          }

          if (body.sceneIndex === undefined || body.sceneIndex < 0) {
            return Response.json(
              { error: 'Invalid sceneIndex' },
              { status: 400 }
            )
          }

          if (!body.prompt || !body.prompt.trim()) {
            return Response.json(
              { error: 'Missing prompt' },
              { status: 400 }
            )
          }

          const storedScript = await getScript(body.scriptId)
          if (!storedScript) {
            return Response.json(
              { error: `Script not found: ${body.scriptId}` },
              { status: 404 }
            )
          }

          if (body.sceneIndex >= storedScript.script.scenes.length) {
            return Response.json(
              { error: `Scene index ${body.sceneIndex} out of range` },
              { status: 400 }
            )
          }

          const fileName = `scene-${String(body.sceneIndex + 1).padStart(2, '0')}.png`
          const filePath = path.join(MEDIA_DIR, body.scriptId, 'images', fileName)

          const imageBuffer = await generateImageForPrompt(body.prompt.trim(), {
            size: body.size || '1792x1024',
            quality: body.quality || 'standard',
            style: body.style || 'vivid',
          })

          await fs.writeFile(filePath, imageBuffer)

          const result: GeneratedImage = {
            sceneIndex: body.sceneIndex,
            prompt: body.prompt.trim(),
            filePath,
            fileName,
          }

          return Response.json(result)
        } catch (error) {
          console.error('Image regeneration error:', error)
          return Response.json(
            { error: `Failed to regenerate image: ${error}` },
            { status: 500 }
          )
        }
      },
    },
  },
})
