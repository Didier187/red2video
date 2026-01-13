import { createFileRoute } from '@tanstack/react-router'
import { getScript } from '../lib/scriptStore'
import { promises as fs } from 'fs'
import path from 'path'

const MEDIA_DIR = path.join(process.cwd(), '.media-store')

interface ImageStatus {
  sceneIndex: number
  fileName: string
  prompt: string
}

interface ImageStatusResponse {
  images: ImageStatus[]
  totalScenes: number
  isComplete: boolean
}

export const Route = createFileRoute('/api/image-status/$scriptId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { scriptId } = params

          const storedScript = await getScript(scriptId)
          if (!storedScript) {
            return Response.json(
              { error: `Script not found: ${scriptId}` },
              { status: 404 }
            )
          }

          const totalScenes = storedScript.script.scenes.length
          const imagesDir = path.join(MEDIA_DIR, scriptId, 'images')
          const images: ImageStatus[] = []

          // Check which images exist on disk
          for (let i = 0; i < totalScenes; i++) {
            const fileName = `scene-${String(i + 1).padStart(2, '0')}.png`
            const filePath = path.join(imagesDir, fileName)

            try {
              await fs.access(filePath)
              // File exists
              images.push({
                sceneIndex: i,
                fileName,
                prompt: storedScript.script.scenes[i].imagePrompt,
              })
            } catch {
              // File doesn't exist yet
            }
          }

          const response: ImageStatusResponse = {
            images,
            totalScenes,
            isComplete: images.length === totalScenes && storedScript.imagesGenerated === true,
          }

          return Response.json(response)
        } catch (error) {
          console.error('Image status error:', error)
          return Response.json(
            { error: `Failed to get image status: ${error}` },
            { status: 500 }
          )
        }
      },
    },
  },
})
