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

export interface AudioGenerationResult {
  audios: GeneratedAudio[]
  totalScenes: number
}

const TEMP_DIR = path.join(process.cwd(), '.temp-audio')

const openai = new OpenAI()

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
  const audios: GeneratedAudio[] = []

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const { buffer, duration } = await generateAudioForText(scene.text, options)

    audios.push({
      sceneIndex: i,
      text: scene.text,
      audioBase64: buffer.toString('base64'),
      format: 'mp3',
      duration,
    })
  }

  return {
    audios,
    totalScenes: scenes.length,
  }
}
