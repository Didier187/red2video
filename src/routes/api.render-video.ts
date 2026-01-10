import { createFileRoute } from '@tanstack/react-router'
import { renderVideo, VideoRenderResult } from '../agents/videoRenderer'
import { getScript, updateScript } from '../lib/scriptStore'

interface VideoRenderRequest {
  scriptId: string
  quality?: 'low' | 'medium' | 'high'
  outputFormat?: 'mp4' | 'webm'
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

          // Prepare scenes with media paths
          const scenesWithMedia = storedScript.script.scenes.map((scene, i) => ({
            ...scene,
            imagePath: storedScript.media?.scenes[i]?.imagePath,
            audioPath: storedScript.media?.scenes[i]?.audioPath,
          }))

          const result: VideoRenderResult = await renderVideo({
            scriptId: body.scriptId,
            title: storedScript.script.title,
            scenes: scenesWithMedia,
            quality: body.quality,
            outputFormat: body.outputFormat,
          })

          // Update script with video info
          await updateScript(body.scriptId, {
            // @ts-expect-error extending StoredScript type
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
