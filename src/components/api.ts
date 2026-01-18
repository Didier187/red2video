import type {
  ScriptContent,
  YouTubeScript,
  AudioGenerationResult,
  ImageGenerationResult,
  GeneratedImage,
  VideoRenderResult,
  YouTubeMetadata,
  ApiError,
  Voice,
  ImageProvider,
  CharacterConfig,
  CharacterDefinition,
} from './types'
import { SAMPLE_TEXT } from './constants'

export async function getRedditPost({
  url,
}: {
  url: string
}): Promise<ScriptContent> {
  const res = await fetch(`/api/reddit?url=${encodeURIComponent(url)}`)
  const data: ScriptContent | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

export async function generateScript(
  content: ScriptContent,
): Promise<YouTubeScript> {
  const res = await fetch('/api/generate-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  })
  const data: YouTubeScript | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

export async function generateAudio({
  scriptId,
  voice,
}: {
  scriptId: string
  voice: Voice
}): Promise<AudioGenerationResult> {
  const res = await fetch('/api/generate-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptId, voice, model: 'tts-1' }),
  })
  const data: AudioGenerationResult | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

export async function generateVoiceSample(voice: Voice): Promise<string> {
  const res = await fetch('/api/generate-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenes: [{ text: SAMPLE_TEXT }],
      voice,
      model: 'tts-1',
    }),
  })
  const data: AudioGenerationResult | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data.audios[0].audioBase64
}

export async function generateImages(params: {
  scriptId: string
  imageSize?: '1792x1024' | '1024x1792' | '1024x1024'
  provider?: ImageProvider
  useCharacterConsistency?: boolean
}): Promise<ImageGenerationResult> {
  const res = await fetch('/api/generate-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scriptId: params.scriptId,
      size: params.imageSize || '1792x1024',
      quality: 'standard',
      style: 'vivid',
      provider: params.provider || 'dall-e',
      useCharacterConsistency: params.useCharacterConsistency,
    }),
  })
  const data: ImageGenerationResult | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

export async function renderVideo(params: {
  scriptId: string
  videoWidth?: number
  videoHeight?: number
}): Promise<VideoRenderResult> {
  const res = await fetch('/api/render-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scriptId: params.scriptId,
      quality: 'medium',
      outputFormat: 'mp4',
      width: params.videoWidth,
      height: params.videoHeight,
    }),
  })
  const data: VideoRenderResult | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

export async function regenerateImage(params: {
  scriptId: string
  sceneIndex: number
  prompt: string
  provider?: ImageProvider
}): Promise<GeneratedImage> {
  const res = await fetch('/api/regenerate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scriptId: params.scriptId,
      sceneIndex: params.sceneIndex,
      prompt: params.prompt,
      size: '1792x1024',
      quality: 'standard',
      style: 'vivid',
      provider: params.provider || 'dall-e',
    }),
  })
  const data: GeneratedImage | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

export interface ImageStatusResponse {
  images: Array<{
    sceneIndex: number
    fileName: string
    prompt: string
  }>
  totalScenes: number
  isComplete: boolean
}

export async function getImageStatus(
  scriptId: string,
): Promise<ImageStatusResponse> {
  const res = await fetch(`/api/image-status/${scriptId}`)
  const data: ImageStatusResponse | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

export async function generateMetadata(params: {
  scriptId: string
  sourceContent: string
}): Promise<YouTubeMetadata> {
  const res = await fetch('/api/generate-metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scriptId: params.scriptId,
      sourceContent: params.sourceContent,
    }),
  })
  const data: YouTubeMetadata | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

export async function extractCharacters(params: {
  scriptId: string
  sourceContent?: string
}): Promise<CharacterConfig> {
  const res = await fetch('/api/extract-characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scriptId: params.scriptId,
      sourceContent: params.sourceContent,
    }),
  })
  const data: CharacterConfig | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

export async function updateCharacters(params: {
  scriptId: string
  characters: CharacterDefinition[]
  globalStyle?: string
}): Promise<CharacterConfig> {
  const res = await fetch('/api/update-characters', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scriptId: params.scriptId,
      characters: params.characters,
      globalStyle: params.globalStyle,
    }),
  })
  const data: CharacterConfig | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}
