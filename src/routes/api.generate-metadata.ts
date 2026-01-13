import { createFileRoute } from '@tanstack/react-router'
import { generateYouTubeMetadata, YouTubeMetadata } from '../agents/youtubeMetadataGenerator'
import { getScript } from '../lib/scriptStore'

interface MetadataRequest {
  scriptId: string
  sourceContent: string
}

export const Route = createFileRoute('/api/generate-metadata')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: MetadataRequest = await request.json()

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

          const script = storedScript.script

          const result: YouTubeMetadata = await generateYouTubeMetadata({
            originalTitle: script.title,
            originalDescription: script.description,
            scenes: script.scenes.map(s => ({
              text: s.text,
              durationHint: s.durationHint,
            })),
            sourceContent: body.sourceContent || '',
            totalDuration: script.totalDuration,
          })

          return Response.json(result)
        } catch (error) {
          console.error('Metadata generation error:', error)
          return Response.json(
            { error: `Failed to generate metadata: ${error}` },
            { status: 500 }
          )
        }
      },
    },
  },
})
