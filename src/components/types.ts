export interface ScriptContent {
  post: {
    author: string
    title: string
    body: string
  }
  comments: Array<{
    author: string
    text: string
  }>
  plainText: string
}

export interface Scene {
  text: string
  imagePrompt: string
  durationHint: number
}

export interface YouTubeScript {
  id: string
  title: string
  description: string
  scenes: Scene[]
  totalDuration: number
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

export interface GeneratedImage {
  sceneIndex: number
  prompt: string
  filePath: string
  fileName: string
}

export interface ImageGenerationResult {
  images: GeneratedImage[]
  totalScenes: number
}

export interface VideoRenderResult {
  videoPath: string
  fileName: string
  durationSeconds: number
}

export interface ApiError {
  error: string
}

export type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export type StepStatus = 'pending' | 'active' | 'completed'
