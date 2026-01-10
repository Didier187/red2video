import { createFileRoute } from '@tanstack/react-router'
import { generateYouTubeScript, YouTubeScript } from '../agents/scriptGenerator'
import { saveScript } from '../lib/scriptStore'

interface ScriptInput {
  post: {
    author: string
    title: string
    body: string
  }
  comments: Array<{
    author: string
    text: string
  }>
  plainText: string
  redditUrl?: string
}

export const Route = createFileRoute('/api/generate-script')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: ScriptInput = await request.json()

          if (!body.plainText || !body.post) {
            return Response.json(
              { error: 'Missing required fields: post and plainText' },
              { status: 400 }
            )
          }

          const script: YouTubeScript = await generateYouTubeScript(body)

          // Save script to file store
          const scriptId = await saveScript(script, body.redditUrl)

          return Response.json({ ...script, id: scriptId })
        } catch (error) {
          console.error('Script generation error:', error)
          return Response.json(
            { error: `Failed to generate script: ${error}` },
            { status: 500 }
          )
        }
      },
    },
  },
})
