export interface SceneData {
  text: string
  imagePrompt: string
  durationHint: number
  imagePath?: string
  audioPath?: string
  // Base64 encoded data URLs for Remotion rendering
  imageDataUrl?: string
  audioDataUrl?: string
}

export interface VideoCompositionProps {
  scriptId: string
  title: string
  scenes: SceneData[]
  fps?: number
}

export interface RenderProgress {
  progress: number
  stage: 'bundling' | 'rendering' | 'encoding' | 'done'
  message: string
}
