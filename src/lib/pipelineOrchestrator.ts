import { randomUUID } from 'crypto'
import {
  fetchRedditContent,
  saveAudioResults,
  saveImageResults,
  prepareScenesForRendering,
} from './pipelineHelpers'
import { loadAutomationConfig } from './automationConfig'
import { generateYouTubeScript } from '../agents/scriptGenerator'
import {
  extractCharacters,
  type CharacterExtractionInput,
} from '../agents/characterExtractor'
import { generateAudioForScenes } from '../agents/audioGenerator'
import { generateImagesForScenes } from '../agents/imageGenerator'
import { generateSeeDreamImagesForScenes } from '../agents/seedreamGenerator'
import { renderVideo } from '../agents/videoRenderer'
import {
  generateYouTubeMetadata,
  selectBestTitle,
  type YouTubeMetadata,
} from '../agents/youtubeMetadataGenerator'
import { saveScript, getScript, updateScript } from './scriptStore'
import { uploadToYouTube } from '../agents/youtubeUploader'
import {
  ASPECT_RATIO_CONFIGS,
  type Voice,
  type AspectRatio,
  type ImageProvider,
  type TitleStyle,
} from '../components/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineConfig {
  redditUrl: string
  voice?: Voice
  imageProvider?: ImageProvider
  aspectRatio?: AspectRatio
  videoQuality?: 'low' | 'medium' | 'high'
  uploadToYouTube?: boolean
  youtubePrivacyStatus?: 'private' | 'unlisted' | 'public'
  titleStyle?: TitleStyle
}

export interface PipelineResult {
  pipelineId: string
  scriptId: string
  videoPath: string
  metadata: YouTubeMetadata
  youtubeVideoId?: string
  youtubeUrl?: string
}

export interface PipelineProgress {
  pipelineId: string
  stage: string
  step: number
  totalSteps: number
  progress: number
  message: string
  error?: string
}

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

const pipelineProgressStore = new Map<string, PipelineProgress>()

export function getPipelineProgress(
  pipelineId: string,
): PipelineProgress | null {
  return pipelineProgressStore.get(pipelineId) ?? null
}

function setProgress(
  pipelineId: string,
  stage: string,
  step: number,
  totalSteps: number,
  progress: number,
  message: string,
) {
  pipelineProgressStore.set(pipelineId, {
    pipelineId,
    stage,
    step,
    totalSteps,
    progress,
    message,
  })
}

function setError(pipelineId: string, error: string) {
  const existing = pipelineProgressStore.get(pipelineId)
  if (existing) {
    existing.error = error
  }
  // Clean up after 10 minutes
  setTimeout(() => pipelineProgressStore.delete(pipelineId), 10 * 60 * 1000)
}

function setComplete(pipelineId: string) {
  setProgress(pipelineId, 'complete', 8, 8, 100, 'Pipeline complete!')
  // Clean up after 10 minutes
  setTimeout(() => pipelineProgressStore.delete(pipelineId), 10 * 60 * 1000)
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * Run the full pipeline synchronously (waits for completion).
 */
export async function runPipeline(
  config: PipelineConfig,
): Promise<PipelineResult> {
  const pipelineId = randomUUID()
  setProgress(pipelineId, 'starting', 0, 7, 0, 'Starting pipeline...')
  return runPipelineWithId(pipelineId, config)
}

/**
 * Start the pipeline in the background. Returns the pipelineId immediately
 * so the caller can poll for progress.
 */
export function startPipeline(config: PipelineConfig): string {
  const pipelineId = randomUUID()
  setProgress(pipelineId, 'starting', 0, 7, 0, 'Starting pipeline...')

  // Run in background — errors are captured in progress store
  runPipelineWithId(pipelineId, config).catch(() => {
    // Error already stored via setError inside runPipelineWithId
  })

  return pipelineId
}

/**
 * Internal: run pipeline with a pre-assigned pipelineId.
 */
async function runPipelineWithId(
  pipelineId: string,
  config: PipelineConfig,
): Promise<PipelineResult> {
  const automationConfig = await loadAutomationConfig()

  const voice = config.voice ?? automationConfig.defaults.voice
  const imageProvider =
    config.imageProvider ?? automationConfig.defaults.imageProvider
  const aspectRatio =
    config.aspectRatio ?? automationConfig.defaults.aspectRatio
  const videoQuality =
    config.videoQuality ?? automationConfig.defaults.videoQuality
  const titleStyle =
    config.titleStyle ?? automationConfig.defaults.titleStyle
  const youtubePrivacy =
    config.youtubePrivacyStatus ?? automationConfig.youtube.privacyStatus

  const totalSteps = config.uploadToYouTube ? 8 : 7

  try {
    // Step 1: Fetch Reddit content
    setProgress(pipelineId, 'fetch', 1, totalSteps, 5, 'Fetching Reddit post...')
    console.log(`[pipeline] Fetching Reddit content: ${config.redditUrl}`)
    const content = await fetchRedditContent(config.redditUrl)

    // Step 2: Generate script
    setProgress(pipelineId, 'script', 2, totalSteps, 15, 'Generating script...')
    console.log('[pipeline] Generating script...')
    const script = await generateYouTubeScript(content)
    const scriptId = await saveScript(script, config.redditUrl)
    console.log(`[pipeline] Script saved: ${scriptId}`)

    // Step 3: Extract characters
    setProgress(pipelineId, 'characters', 3, totalSteps, 25, 'Extracting characters...')
    console.log('[pipeline] Extracting characters...')
    const characterInput: CharacterExtractionInput = {
      scenes: script.scenes,
      sourceContent: content.plainText,
    }
    const characterConfig = await extractCharacters(characterInput)
    await updateScript(scriptId, { characterConfig })

    // Step 4: Generate audio
    setProgress(pipelineId, 'audio', 4, totalSteps, 35, 'Generating audio...')
    console.log(`[pipeline] Generating audio (voice: ${voice})...`)
    const audioResult = await generateAudioForScenes(script.scenes, { voice })
    await saveAudioResults(scriptId, audioResult, script.scenes)

    if (audioResult.failedAudios.length > 0) {
      throw new Error(
        `Audio generation failed for ${audioResult.failedAudios.length} scene(s): ${audioResult.failedAudios.map((f) => f.error).join(', ')}`,
      )
    }

    // Step 5: Generate images
    setProgress(pipelineId, 'images', 5, totalSteps, 50, `Generating images (${imageProvider})...`)
    console.log(`[pipeline] Generating images (provider: ${imageProvider})...`)

    const imageResult =
      imageProvider === 'seedream'
        ? await generateSeeDreamImagesForScenes(scriptId, script.scenes, {
            characterConfig,
          })
        : await generateImagesForScenes(scriptId, script.scenes, {
            characterConfig,
          })
    await saveImageResults(scriptId, imageResult, script.scenes.length)

    if (imageResult.failedImages.length > 0) {
      throw new Error(
        `Image generation failed for ${imageResult.failedImages.length} scene(s): ${imageResult.failedImages.map((f) => f.error).join(', ')}`,
      )
    }

    // Step 6: Render video
    setProgress(pipelineId, 'render', 6, totalSteps, 70, 'Rendering video...')
    console.log(`[pipeline] Rendering video (${aspectRatio}, ${videoQuality})...`)
    const storedScript = await getScript(scriptId)
    if (!storedScript) {
      throw new Error(`Script disappeared: ${scriptId}`)
    }
    const scenesWithMedia = prepareScenesForRendering(storedScript)
    const aspectConfig = ASPECT_RATIO_CONFIGS[aspectRatio]

    const videoResult = await renderVideo({
      scriptId,
      title: script.title,
      scenes: scenesWithMedia,
      quality: videoQuality,
      width: aspectConfig.videoWidth,
      height: aspectConfig.videoHeight,
      showOutro: true,
    })
    console.log(`[pipeline] Video rendered: ${videoResult.videoPath}`)

    // Step 7: Generate YouTube metadata
    setProgress(pipelineId, 'metadata', 7, totalSteps, 85, 'Generating YouTube metadata...')
    console.log('[pipeline] Generating YouTube metadata...')
    const metadata = await generateYouTubeMetadata({
      originalTitle: script.title,
      originalDescription: script.description,
      scenes: script.scenes.map((s) => ({
        text: s.text,
        durationHint: s.durationHint,
      })),
      sourceContent: content.plainText,
      totalDuration: script.totalDuration,
    })

    // Step 8 (optional): Upload to YouTube
    let youtubeVideoId: string | undefined
    let youtubeUrl: string | undefined

    if (config.uploadToYouTube) {
      setProgress(pipelineId, 'upload', 8, totalSteps, 92, 'Uploading to YouTube...')
      console.log('[pipeline] Uploading to YouTube...')

      const chosenTitle = selectBestTitle(metadata, titleStyle)

      const uploadResult = await uploadToYouTube({
        videoPath: videoResult.videoPath,
        title: chosenTitle,
        description: metadata.description,
        tags: metadata.tags,
        privacyStatus: youtubePrivacy,
        categoryId: automationConfig.youtube.categoryId,
        thumbnailPath: storedScript.media?.scenes[0]?.imagePath,
      })

      youtubeVideoId = uploadResult.videoId
      youtubeUrl = uploadResult.url
      console.log(`[pipeline] Uploaded to YouTube: ${youtubeUrl}`)
    }

    setComplete(pipelineId)
    console.log('[pipeline] Pipeline complete!')

    const result: PipelineResult = {
      pipelineId,
      scriptId,
      videoPath: videoResult.videoPath,
      metadata,
      youtubeVideoId,
      youtubeUrl,
    }

    // Store result on the progress entry so polling can retrieve it
    const progress = pipelineProgressStore.get(pipelineId)
    if (progress) {
      ;(progress as PipelineProgress & { result?: PipelineResult }).result =
        result
    }

    return result
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[pipeline] Error: ${errorMsg}`)
    setError(pipelineId, errorMsg)
    throw error
  }
}
