import { createFileRoute } from '@tanstack/react-router'
import { getPipelineProgress } from '../lib/pipelineOrchestrator'

export const Route = createFileRoute('/api/automate-progress/$pipelineId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { pipelineId } = params
        const progress = getPipelineProgress(pipelineId)

        if (!progress) {
          return Response.json({
            stage: 'unknown',
            step: 0,
            totalSteps: 0,
            progress: 0,
            message: 'Pipeline not found',
          })
        }

        // Include result if pipeline is complete
        const result = (progress as unknown as Record<string, unknown>).result
        return Response.json({ ...progress, result: result ?? undefined })
      },
    },
  },
})
