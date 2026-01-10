import OpenAI from 'openai'

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
}

export interface AudioGenerationResult {
  audios: GeneratedAudio[]
  totalScenes: number
}

const openai = new OpenAI()

export async function generateAudioForText(
  text: string,
  options: AudioGenerationOptions = {}
): Promise<Buffer> {
  const { voice = 'nova', model = 'tts-1', speed = 1.0 } = options

  const response = await openai.audio.speech.create({
    model,
    voice,
    input: text,
    speed,
    response_format: 'mp3',
  })

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function generateAudioForScenes(
  scenes: Array<{ text: string }>,
  options: AudioGenerationOptions = {}
): Promise<AudioGenerationResult> {
  const audios: GeneratedAudio[] = []

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const audioBuffer = await generateAudioForText(scene.text, options)

    audios.push({
      sceneIndex: i,
      text: scene.text,
      audioBase64: audioBuffer.toString('base64'),
      format: 'mp3',
    })
  }

  return {
    audios,
    totalScenes: scenes.length,
  }
}
