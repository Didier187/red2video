import { createFileRoute } from '@tanstack/react-router'
import { promises as fs } from 'fs'
import path from 'path'

const MEDIA_DIR = path.join(process.cwd(), '.media-store')

export const Route = createFileRoute('/api/media/$scriptId/video/$fileName')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const { scriptId, fileName } = params
          const filePath = path.join(MEDIA_DIR, scriptId, 'video', fileName)

          const fileBuffer = await fs.readFile(filePath)
          const ext = path.extname(fileName).toLowerCase()

          const contentType = ext === '.webm' ? 'video/webm' : 'video/mp4'

          // Check if download is requested
          const url = new URL(request.url)
          const download = url.searchParams.get('download')

          const headers: Record<string, string> = {
            'Content-Type': contentType,
            'Content-Length': fileBuffer.length.toString(),
            'Accept-Ranges': 'bytes',
          }

          if (download) {
            headers['Content-Disposition'] = `attachment; filename="${download}"`
          } else {
            headers['Cache-Control'] = 'public, max-age=31536000'
          }

          return new Response(fileBuffer, { headers })
        } catch (error) {
          console.error('Video serve error:', error)
          return new Response('Video not found', { status: 404 })
        }
      },
    },
  },
})
