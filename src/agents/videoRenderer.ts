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

function setProgressWithTTL(id: string, progress: number, stage: string) {
  progressStore.set(id, { progress, stage })
  if (progress >= 100 || stage === 'complete' || stage === 'error') {
    setTimeout(() => progressStore.delete(id), 5 * 60 * 1000) // Clean up after 5 min
  }
}

export interface VideoRenderOptions {
  scriptId: string
  title: string
  scenes: SceneData[]
  outputFormat?: 'mp4' | 'webm'
  quality?: 'low' | 'medium' | 'high'
  width?: number
  height?: number
  channelName?: string
  socialHandle?: string
  showOutro?: boolean
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

// Bundle caching to avoid re-bundling on every render
let cachedBundleLocation: string | null = null

async function getOrCreateBundle(): Promise<string> {
  if (cachedBundleLocation) {
    // Verify it still exists
    try {
      await fs.access(cachedBundleLocation)
      return cachedBundleLocation
    } catch {
      cachedBundleLocation = null
    }
  }

  cachedBundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), 'src/video/index.ts'),
    webpackOverride: (config) => config,
  })
  return cachedBundleLocation
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
    width = 1920,
    height = 1080,
    channelName,
    socialHandle,
    showOutro = true,
  } = options

  const qualitySettings = QUALITY_SETTINGS[quality]

  // Ensure output directory exists
  const outputDir = path.join(MEDIA_DIR, scriptId, 'video')
  await fs.mkdir(outputDir, { recursive: true })

  const outputPath = path.join(outputDir, `video.${outputFormat}`)

  console.log('Loading media files from .media-store...')
  setProgressWithTTL(scriptId, 0, 'preparing')

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
  setProgressWithTTL(scriptId, 5, 'bundling')

  // Bundle the Remotion project (cached to avoid re-bundling)
  const bundleLocation = await getOrCreateBundle()

  console.log('Bundle complete...')
  setProgressWithTTL(scriptId, 15, 'composing')

  // Calculate duration - prefer actual audio duration over durationHint
  const titleDuration = 4
  const outroDuration = showOutro ? 5 : 0
  const transitionFrames = 24 // Must match TRANSITION_DURATION_FRAMES in RedditVideoComposition
  const scenesDuration = scenes.reduce((acc, scene) => {
    // Use actual audio duration if available, otherwise fall back to durationHint
    const sceneDuration = scene.duration ?? scene.durationHint
    return acc + sceneDuration
  }, 0)
  const totalRawFrames = Math.round((titleDuration + scenesDuration + outroDuration) * qualitySettings.fps)
  // Subtract transition overlaps (TransitionSeries overlaps adjacent scenes)
  const numTransitions = scenes.length + (showOutro ? 1 : 0)
  const durationInFrames = Math.max(totalRawFrames - numTransitions * transitionFrames, 300)
  const totalDuration = durationInFrames / qualitySettings.fps

  console.log(`Video duration: ${totalDuration.toFixed(2)}s (title: ${titleDuration}s, scenes: ${scenesDuration.toFixed(2)}s, outro: ${outroDuration}s)`)
  console.log('Selecting composition...')

  // Select the composition
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'RedditVideo',
    inputProps: {
      title,
      scenes: scenesWithDataUrls,
      scriptId,
      channelName,
      socialHandle,
      showOutro,
    },
  })

  console.log(`Rendering video: ${durationInFrames} frames at ${qualitySettings.fps}fps...`)
  setProgressWithTTL(scriptId, 20, 'rendering')

  // Render the video
  await renderMedia({
    composition: {
      ...composition,
      durationInFrames,
      fps: qualitySettings.fps,
      width,
      height,
    },
    serveUrl: bundleLocation,
    codec: outputFormat === 'mp4' ? 'h264' : 'vp8',
    outputLocation: outputPath,
    inputProps: {
      title,
      scenes: scenesWithDataUrls,
      scriptId,
      channelName,
      socialHandle,
      showOutro,
    },
    crf: qualitySettings.crf,
    onProgress: ({ progress }) => {
      // Scale progress from 20% to 95% during rendering
      const scaledProgress = Math.round(20 + progress * 75)
      setProgressWithTTL(scriptId, scaledProgress, 'rendering')
      console.log(`Rendering progress: ${Math.round(progress * 100)}%`)
    },
  })

  console.log('Video rendering complete!')
  setProgressWithTTL(scriptId, 100, 'complete')

  return {
    videoPath: outputPath,
    fileName: `video.${outputFormat}`,
    durationSeconds: totalDuration,
  }
}

export async function getVideoAsBuffer(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath)
}
