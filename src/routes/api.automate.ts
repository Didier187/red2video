import { createFileRoute } from '@tanstack/react-router'
import {
  startPipeline,
  type PipelineConfig,
} from '../lib/pipelineOrchestrator'

interface AutomateRequest {
  url: string
  voice?: PipelineConfig['voice']
  imageProvider?: PipelineConfig['imageProvider']
  aspectRatio?: PipelineConfig['aspectRatio']
  videoQuality?: PipelineConfig['videoQuality']
  uploadToYouTube?: boolean
  youtubePrivacyStatus?: PipelineConfig['youtubePrivacyStatus']
  titleStyle?: PipelineConfig['titleStyle']
}

export const Route = createFileRoute('/api/automate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: AutomateRequest = await request.json()

          if (!body.url) {
            return Response.json(
              { error: 'Missing "url" field — provide a Reddit post URL' },
              { status: 400 },
            )
          }

          // Start pipeline in the background and return immediately
          const pipelineId = startPipeline({
            redditUrl: body.url,
            voice: body.voice,
            imageProvider: body.imageProvider,
            aspectRatio: body.aspectRatio,
            videoQuality: body.videoQuality,
            uploadToYouTube: body.uploadToYouTube,
            youtubePrivacyStatus: body.youtubePrivacyStatus,
            titleStyle: body.titleStyle,
          })

          return Response.json({ pipelineId })
        } catch (error) {
          console.error('Automation error:', error)
          return Response.json(
            {
              error: `Pipeline failed: ${error instanceof Error ? error.message : error}`,
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
