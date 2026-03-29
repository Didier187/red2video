import { createFileRoute } from '@tanstack/react-router'
import { renderVideo, type VideoRenderResult } from '../agents/videoRenderer'
import { getScript, updateScript } from '../lib/scriptStore'
import { prepareScenesForRendering } from '../lib/pipelineHelpers'

interface VideoRenderRequest {
  scriptId: string
  quality?: 'low' | 'medium' | 'high'
  outputFormat?: 'mp4' | 'webm'
  width?: number
  height?: number
}

export const Route = createFileRoute('/api/render-video')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: VideoRenderRequest = await request.json()

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

          // Check if images and audio are generated
          if (!storedScript.imagesGenerated) {
            return Response.json(
              { error: 'Images must be generated before rendering video' },
              { status: 400 }
            )
          }

          const scenesWithMedia = prepareScenesForRendering(storedScript)

          const result: VideoRenderResult = await renderVideo({
            scriptId: body.scriptId,
            title: storedScript.script.title,
            scenes: scenesWithMedia,
            quality: body.quality,
            outputFormat: body.outputFormat,
            width: body.width,
            height: body.height,
          })

          // Update script with video info
          await updateScript(body.scriptId, {
            videoGenerated: true,
            videoPath: result.videoPath,
          })

          return Response.json(result)
        } catch (error) {
          console.error('Video render error:', error)
          return Response.json(
            { error: `Failed to render video: ${error}` },
            { status: 500 }
          )
        }
      },
    },
  },
})
