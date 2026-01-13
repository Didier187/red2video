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

export type AspectRatio = '16:9' | '9:16' | '1:1'

export interface AspectRatioConfig {
  label: string
  description: string
  imageSize: '1792x1024' | '1024x1792' | '1024x1024'
  videoWidth: number
  videoHeight: number
  icon: string
}

export const ASPECT_RATIO_CONFIGS: Record<AspectRatio, AspectRatioConfig> = {
  '16:9': {
    label: 'Landscape',
    description: 'YouTube, Desktop',
    imageSize: '1792x1024',
    videoWidth: 1920,
    videoHeight: 1080,
    icon: '🖥️',
  },
  '9:16': {
    label: 'Portrait',
    description: 'TikTok, Reels, Shorts',
    imageSize: '1024x1792',
    videoWidth: 1080,
    videoHeight: 1920,
    icon: '📱',
  },
  '1:1': {
    label: 'Square',
    description: 'Instagram, Facebook',
    imageSize: '1024x1024',
    videoWidth: 1080,
    videoHeight: 1080,
    icon: '⬜',
  },
}
