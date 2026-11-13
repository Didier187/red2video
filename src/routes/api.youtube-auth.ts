import { createFileRoute } from '@tanstack/react-router'
import { authorizeYouTube, isYouTubeAuthorized } from '../lib/youtubeAuth'

export const Route = createFileRoute('/api/youtube-auth')({
  server: {
    handlers: {
      // Check authorization status
      GET: async () => {
        const authorized = await isYouTubeAuthorized()
        return Response.json({ authorized })
      },

      // Start the OAuth flow
      POST: async () => {
        try {
          const already = await isYouTubeAuthorized()
          if (already) {
            return Response.json({
              message: 'YouTube is already authorized',
              authorized: true,
            })
          }

          const { authUrl, waitForCallback } = await authorizeYouTube()

          // Start waiting for the callback in the background
          waitForCallback()
            .then(() =>
              console.log('[youtube-auth] Authorization completed successfully'),
            )
            .catch((err) =>
              console.error('[youtube-auth] Authorization failed:', err),
            )

          return Response.json({
            authUrl,
            message:
              'Open the authUrl in your browser to authorize YouTube access. The app will wait up to 5 minutes for you to complete the flow.',
          })
        } catch (error) {
          console.error('YouTube auth error:', error)
          return Response.json(
            {
              error: `YouTube auth failed: ${error instanceof Error ? error.message : error}`,
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
