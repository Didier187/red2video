import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { promises as fs } from 'fs'
import path from 'path'
import { SceneData } from '../video/types'

const MEDIA_DIR = path.join(process.cwd(), '.media-store')

// Keep temp files in development for debugging
const KEEP_TEMP_FILES = process.env.NODE_ENV !== 'production'

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

  // Create a temporary public directory for media files
  const tempPublicDir = path.join(process.cwd(), 'public', 'temp-media', scriptId)
  await fs.mkdir(path.join(tempPublicDir, 'images'), { recursive: true })
  await fs.mkdir(path.join(tempPublicDir, 'audio'), { recursive: true })

  console.log('Copying media files to public directory...')
  progressStore.set(scriptId, { progress: 0, stage: 'preparing' })

  // Copy media files to public directory
  for (let i = 0; i < scenes.length; i++) {
    const sceneNum = String(i + 1).padStart(2, '0')
    const srcImagePath = path.join(MEDIA_DIR, scriptId, 'images', `scene-${sceneNum}.png`)
    const srcAudioPath = path.join(MEDIA_DIR, scriptId, 'audio', `scene-${sceneNum}.mp3`)
    const destImagePath = path.join(tempPublicDir, 'images', `scene-${sceneNum}.png`)
    const destAudioPath = path.join(tempPublicDir, 'audio', `scene-${sceneNum}.mp3`)

    if (await fileExists(srcImagePath)) {
      await fs.copyFile(srcImagePath, destImagePath)
      console.log(`Copied image ${sceneNum}`)
    }
    if (await fileExists(srcAudioPath)) {
      await fs.copyFile(srcAudioPath, destAudioPath)
      console.log(`Copied audio ${sceneNum}`)
    }
  }

  console.log('Bundling Remotion project...')
  progressStore.set(scriptId, { progress: 5, stage: 'bundling' })

  // Bundle the Remotion project with public directory
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), 'src/video/index.ts'),
    webpackOverride: (config) => config,
    publicDir: path.join(process.cwd(), 'public'),
  })

  console.log('Bundle complete...')
  progressStore.set(scriptId, { progress: 15, stage: 'composing' })

  // Calculate duration
  const titleDuration = 4
  const scenesDuration = scenes.reduce((acc, scene) => acc + scene.durationHint, 0)
  const totalDuration = titleDuration + scenesDuration
  const durationInFrames = Math.round(totalDuration * qualitySettings.fps)

  // Prepare scenes with staticFile paths (relative to public directory)
  const scenesWithStaticPaths = await Promise.all(
    scenes.map(async (scene, index) => {
      const sceneNum = String(index + 1).padStart(2, '0')
      const imagePath = path.join(MEDIA_DIR, scriptId, 'images', `scene-${sceneNum}.png`)
      const audioPath = path.join(MEDIA_DIR, scriptId, 'audio', `scene-${sceneNum}.mp3`)

      const hasImage = scene.imagePath && (await fileExists(imagePath))
      const hasAudio = scene.audioPath && (await fileExists(audioPath))

      return {
        ...scene,
        // Use staticFile paths relative to public dir
        imageDataUrl: hasImage ? `/temp-media/${scriptId}/images/scene-${sceneNum}.png` : undefined,
        audioDataUrl: hasAudio ? `/temp-media/${scriptId}/audio/scene-${sceneNum}.mp3` : undefined,
      }
    })
  )

  const loadedImages = scenesWithStaticPaths.filter(s => s.imageDataUrl).length
  const loadedAudio = scenesWithStaticPaths.filter(s => s.audioDataUrl).length
  console.log(`Media prepared: ${loadedImages} images, ${loadedAudio} audio files`)

  console.log('Selecting composition...')

  // Select the composition
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'RedditVideo',
    inputProps: {
      title,
      scenes: scenesWithStaticPaths,
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
      scenes: scenesWithStaticPaths,
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
  progressStore.set(scriptId, { progress: 98, stage: 'finalizing' })

  // Clean up temporary public directory (skip in development for debugging)
  if (!KEEP_TEMP_FILES) {
    try {
      await fs.rm(tempPublicDir, { recursive: true, force: true })
      console.log('Cleaned up temporary media files')
    } catch (e) {
      console.log('Failed to clean up temporary files:', e)
    }
  } else {
    console.log('Keeping temporary media files for development debugging')
  }

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
