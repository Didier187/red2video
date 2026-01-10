import { createFileRoute } from '@tanstack/react-router'
import { getProgress } from '../agents/videoRenderer'

export const Route = createFileRoute('/api/render-progress/$scriptId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { scriptId } = params
        const progress = getProgress(scriptId)
        return Response.json(progress)
      },
    },
  },
})
