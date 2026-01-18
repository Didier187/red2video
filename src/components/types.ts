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

export type TitleStyle = 'curiosity' | 'dramatic' | 'emotional' | 'clickbait' | 'straightforward'

export interface TitleOption {
  title: string
  style: TitleStyle
}

export interface YouTubeMetadata {
  titles: TitleOption[]
  description: string
  tags: string[]
  hashtags: string[]
}

export interface ApiError {
  error: string
}

export type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export type StepStatus = 'pending' | 'active' | 'completed'

// Character consistency types
export interface PhysicalDescription {
  age?: string
  gender?: string
  build?: string
  skinTone?: string
  hairColor?: string
  hairStyle?: string
  eyeColor?: string
  facialFeatures?: string
  clothing?: string
  accessories?: string
}

export type CharacterRole = 'protagonist' | 'antagonist' | 'supporting' | 'background'
export type CharacterType = 'human' | 'animal' | 'creature' | 'object'

export interface CharacterDefinition {
  id: string
  name: string
  role: CharacterRole
  type: CharacterType
  physicalDescription: PhysicalDescription
  consistencyPrompt: string
  appearances: number[]
}

export interface CharacterConfig {
  characters: CharacterDefinition[]
  globalStyle?: string
  extractedAt: string
}

export type AspectRatio = '16:9' | '9:16' | '1:1'

export type ImageProvider = 'dall-e' | 'seedream'

export interface ImageProviderConfig {
  label: string
  description: string
  icon: string
}

export const IMAGE_PROVIDER_CONFIGS: Record<ImageProvider, ImageProviderConfig> = {
  'dall-e': {
    label: 'DALL-E 3',
    description: 'OpenAI',
    icon: '🎨',
  },
  'seedream': {
    label: 'SeeDream',
    description: 'ByteDance',
    icon: '🌈',
  },
}

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
