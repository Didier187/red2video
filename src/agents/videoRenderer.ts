import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { promises as fs } from 'fs'
import path from 'path'
import { SceneData } from '../video/types'

const MEDIA_DIR = path.join(process.cwd(), '.media-store')

// Progress tracking for SSE
const progressStore: Map<string, { progress: number; stage: string }> = new Map()

export function getProgress(scriptId: string) {
  return progressStore.get(scriptId) || { progress: 0, stage: 'initializing' }
}

export function clearProgress(scriptId: string) {
  progressStore.delete(scriptId)
}

export interface VideoRenderOptions {
  scriptId: string
  title: string
  scenes: SceneData[]
  outputFormat?: 'mp4' | 'webm'
  quality?: 'low' | 'medium' | 'high'
}

export interface VideoRenderResult {
  videoPath: string
  fileName: string
  durationSeconds: number
}

const QUALITY_SETTINGS = {
  low: { crf: 28, fps: 24 },
  medium: { crf: 23, fps: 30 },
  high: { crf: 18, fps: 30 },
}

// Check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

// Read file and convert to base64 data URL
async function fileToDataUrl(filePath: string, mimeType: string): Promise<string | undefined> {
  try {
    const buffer = await fs.readFile(filePath)
    const base64 = buffer.toString('base64')
    return `data:${mimeType};base64,${base64}`
  } catch {
    return undefined
  }
}

export async function renderVideo(options: VideoRenderOptions): Promise<VideoRenderResult> {
  const {
    scriptId,
    title,
    scenes,
    outputFormat = 'mp4',
    quality = 'medium',
  } = options

  const qualitySettings = QUALITY_SETTINGS[quality]

  // Ensure output directory exists
  const outputDir = path.join(MEDIA_DIR, scriptId, 'video')
  await fs.mkdir(outputDir, { recursive: true })

  const outputPath = path.join(outputDir, `video.${outputFormat}`)

  console.log('Loading media files from .media-store...')
  progressStore.set(scriptId, { progress: 0, stage: 'preparing' })

  // Load all media files as base64 data URLs directly from .media-store
  const scenesWithDataUrls = await Promise.all(
    scenes.map(async (scene, index) => {
      const sceneNum = String(index + 1).padStart(2, '0')
      const imagePath = path.join(MEDIA_DIR, scriptId, 'images', `scene-${sceneNum}.png`)
      const audioPath = path.join(MEDIA_DIR, scriptId, 'audio', `scene-${sceneNum}.mp3`)

      const imageExists = await fileExists(imagePath)
      const audioExists = await fileExists(audioPath)

      const imageDataUrl = imageExists ? await fileToDataUrl(imagePath, 'image/png') : undefined
      const audioDataUrl = audioExists ? await fileToDataUrl(audioPath, 'audio/mpeg') : undefined

      console.log(`Scene ${sceneNum}: image=${imageExists}, audio=${audioExists}`)

      return {
        ...scene,
        imageDataUrl,
        audioDataUrl,
      }
    })
  )

  const loadedImages = scenesWithDataUrls.filter(s => s.imageDataUrl).length
  const loadedAudio = scenesWithDataUrls.filter(s => s.audioDataUrl).length
  console.log(`Media loaded: ${loadedImages} images, ${loadedAudio} audio files as base64`)

  console.log('Bundling Remotion project...')
  progressStore.set(scriptId, { progress: 5, stage: 'bundling' })

  // Bundle the Remotion project (no public dir needed)
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), 'src/video/index.ts'),
    webpackOverride: (config) => config,
  })

  console.log('Bundle complete...')
  progressStore.set(scriptId, { progress: 15, stage: 'composing' })

  // Calculate duration - prefer actual audio duration over durationHint
  const titleDuration = 4
  const scenesDuration = scenes.reduce((acc, scene) => {
    // Use actual audio duration if available, otherwise fall back to durationHint
    const sceneDuration = scene.duration ?? scene.durationHint
    return acc + sceneDuration
  }, 0)
  const totalDuration = titleDuration + scenesDuration
  const durationInFrames = Math.round(totalDuration * qualitySettings.fps)

  console.log(`Video duration: ${totalDuration.toFixed(2)}s (title: ${titleDuration}s, scenes: ${scenesDuration.toFixed(2)}s)`)
  console.log('Selecting composition...')

  // Select the composition
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'RedditVideo',
    inputProps: {
      title,
      scenes: scenesWithDataUrls,
      scriptId,
    },
  })

  console.log(`Rendering video: ${durationInFrames} frames at ${qualitySettings.fps}fps...`)
  progressStore.set(scriptId, { progress: 20, stage: 'rendering' })

  // Render the video
  await renderMedia({
    composition: {
      ...composition,
      durationInFrames,
      fps: qualitySettings.fps,
    },
    serveUrl: bundleLocation,
    codec: outputFormat === 'mp4' ? 'h264' : 'vp8',
    outputLocation: outputPath,
    inputProps: {
      title,
      scenes: scenesWithDataUrls,
      scriptId,
    },
    crf: qualitySettings.crf,
    onProgress: ({ progress }) => {
      // Scale progress from 20% to 95% during rendering
      const scaledProgress = Math.round(20 + progress * 75)
      progressStore.set(scriptId, { progress: scaledProgress, stage: 'rendering' })
      console.log(`Rendering progress: ${Math.round(progress * 100)}%`)
    },
  })

  console.log('Video rendering complete!')
  progressStore.set(scriptId, { progress: 100, stage: 'complete' })

  return {
    videoPath: outputPath,
    fileName: `video.${outputFormat}`,
    durationSeconds: totalDuration,
  }
}

export async function getVideoAsBuffer(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath)
}
