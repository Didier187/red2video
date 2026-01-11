import { createFileRoute } from '@tanstack/react-router'
import { promises as fs } from 'fs'
import path from 'path'
import {
  generateAudioForScenes,
  AudioGenerationResult,
  Voice,
  AudioModel,
} from '../agents/audioGenerator'
import { getScript, updateScript } from '../lib/scriptStore'

const MEDIA_DIR = path.join(process.cwd(), '.media-store')

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

          // If scriptId is provided, fetch scenes from stored script
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

          // Save audio files to disk if scriptId is provided
          if (scriptId) {
            const audioDir = path.join(MEDIA_DIR, scriptId, 'audio')
            await fs.mkdir(audioDir, { recursive: true })

            // Get existing script to preserve image paths
            const existingScript = await getScript(scriptId)
            if (!existingScript) {
              return Response.json(
                { error: `Script not found: ${scriptId}` },
                { status: 404 },
              )
            }
            const existingScenes = existingScript.media?.scenes || []

            // Build a map of audio paths and durations by scene index
            const audioPathsMap: Record<number, string> = {}
            const audioDurationsMap: Record<number, number> = {}

            for (const audio of result.audios) {
              const sceneNum = String(audio.sceneIndex + 1).padStart(2, '0')
              const filePath = path.join(audioDir, `scene-${sceneNum}.mp3`)
              const buffer = Buffer.from(audio.audioBase64, 'base64')
              await fs.writeFile(filePath, buffer)
              console.log(`Saved audio for scene ${sceneNum}`)
              console.log(
                `Scene ${sceneNum} audio duration: ${(audio.duration ?? 0).toFixed(2)}s`,
              )

              audioPathsMap[audio.sceneIndex] = filePath
              audioDurationsMap[audio.sceneIndex] = audio.duration ?? 0
            }

            // Merge with existing media - preserve all existing data and add audio paths and durations
            const mergedScenes = scenes.map((_, i) => ({
              ...existingScenes[i],
              audioPath: audioPathsMap[i],
              duration: audioDurationsMap[i],
            }))

            const totalDuration = Object.values(audioDurationsMap).reduce(
              (sum, d) => sum + d,
              0,
            )

            // Mark script as having audio generated and update media paths and durations
            await updateScript(scriptId, {
              audioGenerated: true,
              media: { scenes: mergedScenes },
              script: {
                ...existingScript.script,
                totalDuration,
              },
            })
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
