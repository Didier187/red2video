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

// ---------------------------------------------------------------------------
// Shared fetch helpers
// ---------------------------------------------------------------------------

async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  const data = await res.json()
  if (!res.ok || (typeof data === 'object' && data !== null && 'error' in data)) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }
  return data as T
}

function postJson<T>(url: string, body: unknown): Promise<T> {
  return apiCall<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function putJson<T>(url: string, body: unknown): Promise<T> {
  return apiCall<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function getRedditPost({
  url,
}: {
  url: string
}): Promise<ScriptContent> {
  return apiCall<ScriptContent>(`/api/reddit?url=${encodeURIComponent(url)}`)
}

export function generateScript(
  content: ScriptContent,
): Promise<YouTubeScript> {
  return postJson<YouTubeScript>('/api/generate-script', content)
}

export function generateAudio({
  scriptId,
  voice,
}: {
  scriptId: string
  voice: Voice
}): Promise<AudioGenerationResult> {
  return postJson<AudioGenerationResult>('/api/generate-audio', {
    scriptId,
    voice,
    model: 'tts-1',
  })
}

export async function generateVoiceSample(voice: Voice): Promise<string> {
  const data = await postJson<AudioGenerationResult>('/api/generate-audio', {
    scenes: [{ text: SAMPLE_TEXT }],
    voice,
    model: 'tts-1',
  })
  return data.audios[0].audioBase64
}

export function generateImages(params: {
  scriptId: string
  imageSize?: '1792x1024' | '1024x1792' | '1024x1024'
  provider?: ImageProvider
  useCharacterConsistency?: boolean
}): Promise<ImageGenerationResult> {
  return postJson<ImageGenerationResult>('/api/generate-images', {
    scriptId: params.scriptId,
    size: params.imageSize || '1792x1024',
    quality: 'standard',
    style: 'vivid',
    provider: params.provider || 'dall-e',
    useCharacterConsistency: params.useCharacterConsistency,
  })
}

export function renderVideo(params: {
  scriptId: string
  videoWidth?: number
  videoHeight?: number
}): Promise<VideoRenderResult> {
  return postJson<VideoRenderResult>('/api/render-video', {
    scriptId: params.scriptId,
    quality: 'medium',
    outputFormat: 'mp4',
    width: params.videoWidth,
    height: params.videoHeight,
  })
}

export function regenerateImage(params: {
  scriptId: string
  sceneIndex: number
  prompt: string
  provider?: ImageProvider
}): Promise<GeneratedImage> {
  return postJson<GeneratedImage>('/api/regenerate-image', {
    scriptId: params.scriptId,
    sceneIndex: params.sceneIndex,
    prompt: params.prompt,
    size: '1792x1024',
    quality: 'standard',
    style: 'vivid',
    provider: params.provider || 'dall-e',
  })
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

export function getImageStatus(
  scriptId: string,
): Promise<ImageStatusResponse> {
  return apiCall<ImageStatusResponse>(`/api/image-status/${scriptId}`)
}

export function generateMetadata(params: {
  scriptId: string
  sourceContent: string
}): Promise<YouTubeMetadata> {
  return postJson<YouTubeMetadata>('/api/generate-metadata', {
    scriptId: params.scriptId,
    sourceContent: params.sourceContent,
  })
}

export function extractCharacters(params: {
  scriptId: string
  sourceContent?: string
}): Promise<CharacterConfig> {
  return postJson<CharacterConfig>('/api/extract-characters', {
    scriptId: params.scriptId,
    sourceContent: params.sourceContent,
  })
}

export function updateCharacters(params: {
  scriptId: string
  characters: CharacterDefinition[]
  globalStyle?: string
}): Promise<CharacterConfig> {
  return putJson<CharacterConfig>('/api/update-characters', {
    scriptId: params.scriptId,
    characters: params.characters,
    globalStyle: params.globalStyle,
  })
}
