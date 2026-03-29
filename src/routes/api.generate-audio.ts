import { createFileRoute } from '@tanstack/react-router'
import {
  generateAudioForScenes,
  type AudioGenerationResult,
  type Voice,
  type AudioModel,
} from '../agents/audioGenerator'
import { getScript } from '../lib/scriptStore'
import { saveAudioResults } from '../lib/pipelineHelpers'

interface AudioRequest {
  scriptId?: string
  scenes?: Array<{ text: string }>
  voice?: Voice
  model?: AudioModel
  speed?: number
}

export const Route = createFileRoute('/api/generate-audio')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: AudioRequest = await request.json()

          let scenes: Array<{ text: string }>
          const scriptId = body.scriptId

          if (scriptId) {
            const storedScript = await getScript(scriptId)
            if (!storedScript) {
              return Response.json(
                { error: `Script not found: ${scriptId}` },
                { status: 404 },
              )
            }
            scenes = storedScript.script.scenes
          } else if (
            body.scenes &&
            Array.isArray(body.scenes) &&
            body.scenes.length > 0
          ) {
            scenes = body.scenes
          } else {
            return Response.json(
              { error: 'Missing scriptId or scenes array' },
              { status: 400 },
            )
          }

          const result: AudioGenerationResult = await generateAudioForScenes(
            scenes,
            {
              voice: body.voice,
              model: body.model,
              speed: body.speed,
            },
          )

          if (scriptId) {
            await saveAudioResults(scriptId, result, scenes)
          }

          return Response.json(result)
        } catch (error) {
          console.error('Audio generation error:', error)
          return Response.json(
            { error: `Failed to generate audio: ${error}` },
            { status: 500 },
          )
        }
      },
    },
  },
})
