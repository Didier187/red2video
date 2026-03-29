import { createFileRoute } from '@tanstack/react-router'
import { fetchRedditContent } from '../lib/pipelineHelpers'

export const Route = createFileRoute('/api/reddit')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const postUrl = url.searchParams.get('url')

        if (!postUrl) {
          return Response.json(
            { error: 'Missing "url" query parameter' },
            { status: 400 },
          )
        }

        try {
          const result = await fetchRedditContent(postUrl)
          return Response.json(result)
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error)
          const status = message.includes('Reddit API error') ? 502 : 500
          return Response.json({ error: message }, { status })
        }
      },
    },
  },
})
