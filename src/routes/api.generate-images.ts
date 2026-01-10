import { createFileRoute } from '@tanstack/react-router'
import {
  generateImagesForScenes,
  ImageGenerationResult,
  ImageSize,
  ImageQuality,
  ImageStyle,
} from '../agents/imageGenerator'
import { getScript, updateScript } from '../lib/scriptStore'

interface ImageRequest {
  scriptId: string
  size?: ImageSize
  quality?: ImageQuality
  style?: ImageStyle
}

export const Route = createFileRoute('/api/generate-images')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: ImageRequest = await request.json()

          if (!body.scriptId) {
            return Response.json(
              { error: 'Missing scriptId' },
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

          const result: ImageGenerationResult = await generateImagesForScenes(
            body.scriptId,
            storedScript.script.scenes,
            {
              size: body.size,
              quality: body.quality,
              style: body.style,
            }
          )

          // Update script with image paths
          const sceneMedia = result.images.map((img) => ({
            imagePath: img.filePath,
          }))

          // Re-fetch script to get latest media state (in case audio was generated during image generation)
          const latestScript = await getScript(body.scriptId)
          const existingMedia = latestScript?.media?.scenes || []
          const mergedMedia = storedScript.script.scenes.map((_, i) => ({
            ...existingMedia[i],
            ...sceneMedia[i],
          }))

          await updateScript(body.scriptId, {
            imagesGenerated: true,
            media: { scenes: mergedMedia },
          })

          return Response.json(result)
        } catch (error) {
          console.error('Image generation error:', error)
          return Response.json(
            { error: `Failed to generate images: ${error}` },
            { status: 500 }
          )
        }
      },
    },
  },
})
