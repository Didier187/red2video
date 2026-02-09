import OpenAI from 'openai'
import { promises as fs } from 'fs'
import path from 'path'
import { getAudioDuration } from '../utils/audioDuration'

export type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
export type AudioModel = 'tts-1' | 'tts-1-hd'

export interface AudioGenerationOptions {
  voice?: Voice
  model?: AudioModel
  speed?: number // 0.25 to 4.0
}

export interface GeneratedAudio {
  sceneIndex: number
  text: string
  audioBase64: string
  format: 'mp3'
  duration?: number
}

export interface FailedAudio {
  sceneIndex: number
  text: string
  error: string
}

export interface AudioGenerationResult {
  audios: GeneratedAudio[]
  failedAudios: FailedAudio[]
  totalScenes: number
}

const TEMP_DIR = path.join(process.cwd(), '.temp-audio')

const openai = new OpenAI()

/**
 * Simple concurrency limiter (no external dependencies).
 * Returns a wrapper that ensures at most `concurrency` tasks run at once.
 */
function pLimit(concurrency: number) {
  let active = 0
  const queue: Array<() => void> = []

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        active++
        try {
          resolve(await fn())
        } catch (err) {
          reject(err)
        } finally {
          active--
          if (queue.length > 0) queue.shift()!()
        }
      }
      if (active < concurrency) {
        run()
      } else {
        queue.push(run)
      }
    })
  }
}

export async function generateAudioForText(
  text: string,
  options: AudioGenerationOptions = {},
): Promise<{ buffer: Buffer; duration: number }> {
  const { voice = 'nova', model = 'tts-1', speed = 1.0 } = options

  const response = await openai.audio.speech.create({
    model,
    voice,
    input: text,
    speed,
    response_format: 'mp3',
  })

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  await fs.mkdir(TEMP_DIR, { recursive: true })
  const tempPath = path.join(
    TEMP_DIR,
    `${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`,
  )
  await fs.writeFile(tempPath, buffer)

  const duration = await getAudioDuration(tempPath)
  await fs.unlink(tempPath)

  return { buffer, duration }
}

export async function generateAudioForScenes(
  scenes: Array<{ text: string }>,
  options: AudioGenerationOptions = {},
): Promise<AudioGenerationResult> {
  const limit = pLimit(5)

  // Run all audio generations in parallel (capped at 5 concurrent)
  const results = await Promise.allSettled(
    scenes.map((scene, index) =>
      limit(async (): Promise<GeneratedAudio> => {
        const { buffer, duration } = await generateAudioForText(scene.text, options)
        return {
          sceneIndex: index,
          text: scene.text,
          audioBase64: buffer.toString('base64'),
          format: 'mp3',
          duration,
        }
      }),
    ),
  )

  // Separate successful and failed results
  const audios: GeneratedAudio[] = []
  const failedAudios: FailedAudio[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      audios.push(result.value)
    } else {
      const errorMessage =
        result.reason instanceof Error ? result.reason.message : String(result.reason)
      console.error(`Failed to generate audio for scene ${index + 1}:`, errorMessage)
      failedAudios.push({
        sceneIndex: index,
        text: scenes[index].text,
        error: errorMessage,
      })
    }
  })

  return {
    audios,
    failedAudios,
    totalScenes: scenes.length,
  }
}
