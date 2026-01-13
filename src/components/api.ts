import type {
  ScriptContent,
  YouTubeScript,
  AudioGenerationResult,
  ImageGenerationResult,
  GeneratedImage,
  VideoRenderResult,
  ApiError,
  Voice,
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

export async function generateImages(
  scriptId: string,
): Promise<ImageGenerationResult> {
  const res = await fetch('/api/generate-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scriptId,
      size: '1792x1024',
      quality: 'standard',
      style: 'vivid',
    }),
  })
  const data: ImageGenerationResult | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

export async function renderVideo(scriptId: string): Promise<VideoRenderResult> {
  const res = await fetch('/api/render-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptId, quality: 'medium', outputFormat: 'mp4' }),
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
