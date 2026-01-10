import { createFileRoute } from '@tanstack/react-router'
import { promises as fs } from 'fs'
import path from 'path'

const MEDIA_DIR = path.join(process.cwd(), '.media-store')

export const Route = createFileRoute('/api/media/$scriptId/images/$fileName')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { scriptId, fileName } = params
          const filePath = path.join(MEDIA_DIR, scriptId, 'images', fileName)

          const fileBuffer = await fs.readFile(filePath)

          return new Response(fileBuffer, {
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=31536000',
            },
          })
        } catch (error) {
          console.error('Media serve error:', error)
          return new Response('Image not found', { status: 404 })
        }
      },
    },
  },
})
