// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { generateYouTubeScript } from '../agents/scriptGenerator'
import { generateAudioForScenes } from '../agents/audioGenerator'
import { generateImagesForScenes } from '../agents/imageGenerator'
import { renderVideo } from '../agents/videoRenderer'
import { generateYouTubeMetadata } from '../agents/youtubeMetadataGenerator'
import { uploadToYouTube } from '../agents/youtubeUploader'
import { isYouTubeAuthorized } from './youtubeAuth'
import { fetchRedditContent } from './pipelineHelpers'
import {
  getPipelineProgress,
  preflightPipeline,
  runPipeline,
  startPipeline,
} from './pipelineOrchestrator'
import type * as PipelineHelpers from './pipelineHelpers'

// All paid / side-effecting dependencies are mocked: no network, no disk.
vi.mock('./pipelineHelpers', async (importOriginal) => {
  const actual = await importOriginal<typeof PipelineHelpers>()
  return {
    toRedditJsonUrl: actual.toRedditJsonUrl,
    fetchRedditContent: vi.fn(),
    saveAudioResults: vi.fn(),
    saveImageResults: vi.fn(),
    prepareScenesForRendering: vi.fn(() => []),
  }
})
vi.mock('./automationConfig', () => ({
  loadAutomationConfig: vi.fn(async () => ({
    defaults: {
      voice: 'nova',
      imageProvider: 'dall-e',
      aspectRatio: '16:9',
      videoQuality: 'medium',
      titleStyle: 'curiosity',
    },
    youtube: {
      privacyStatus: 'unlisted',
      categoryId: '24',
      notifySubscribers: false,
    },
  })),
}))
vi.mock('./youtubeAuth', () => ({ isYouTubeAuthorized: vi.fn() }))
vi.mock('./scriptStore', () => ({
  saveScript: vi.fn(async () => 'script-1'),
  getScript: vi.fn(async () => ({
    script: { title: 'T', scenes: [] },
    media: { scenes: [{ imagePath: '/img/scene-01.png' }] },
  })),
  updateScript: vi.fn(),
}))
vi.mock('../agents/scriptGenerator', () => ({
  generateYouTubeScript: vi.fn(),
}))
vi.mock('../agents/characterExtractor', () => ({
  extractCharacters: vi.fn(async () => ({ characters: [] })),
}))
vi.mock('../agents/audioGenerator', () => ({
  generateAudioForScenes: vi.fn(),
}))
vi.mock('../agents/imageGenerator', () => ({
  generateImagesForScenes: vi.fn(),
}))
vi.mock('../agents/seedreamGenerator', () => ({
  generateSeeDreamImagesForScenes: vi.fn(),
}))
vi.mock('../agents/videoRenderer', () => ({ renderVideo: vi.fn() }))
vi.mock('../agents/youtubeMetadataGenerator', () => ({
  generateYouTubeMetadata: vi.fn(),
  selectBestTitle: vi.fn(() => 'Chosen title'),
}))
vi.mock('../agents/youtubeUploader', () => ({ uploadToYouTube: vi.fn() }))

const POST_URL = 'https://www.reddit.com/r/test/comments/abc123/title/'

const content = {
  post: { author: 'op', title: 'Post title', body: 'Body' },
  comments: [{ author: 'a', text: 'Nice' }],
  plainText: 'plain',
}
const script = {
  title: 'Video title',
  description: 'desc',
  scenes: [{ text: 'Scene 1', imagePrompt: 'img', durationHint: 5 }],
  totalDuration: 5,
}
const metadata = {
  titles: [{ title: 'Chosen title', style: 'curiosity' }],
  description: 'YT description',
  tags: ['tag'],
}

function mockSuccessfulGeneration() {
  vi.mocked(fetchRedditContent).mockResolvedValue(content)
  vi.mocked(generateYouTubeScript).mockResolvedValue(script as never)
  vi.mocked(generateAudioForScenes).mockResolvedValue({
    audios: [],
    failedAudios: [],
  } as never)
  vi.mocked(generateImagesForScenes).mockResolvedValue({
    images: [],
    failedImages: [],
    totalScenes: 1,
  })
  vi.mocked(renderVideo).mockResolvedValue({
    videoPath: '/media/script-1/video.mp4',
  } as never)
  vi.mocked(generateYouTubeMetadata).mockResolvedValue(metadata as never)
}

describe('pipelineOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic')
    vi.stubEnv('OPENAI_API_KEY', 'test-openai')
    vi.stubEnv('ARK_API_KEY', '')
    vi.mocked(isYouTubeAuthorized).mockResolvedValue(true)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('preflightPipeline', () => {
    it('passes for a valid config and resolves defaults', async () => {
      const result = await preflightPipeline({ redditUrl: POST_URL })

      expect(result.ok).toBe(true)
      expect(result.problems).toEqual([])
      expect(result.settings).toMatchObject({
        voice: 'nova',
        imageProvider: 'dall-e',
        uploadToYouTube: false,
        youtubePrivacyStatus: 'unlisted',
      })
      expect(fetchRedditContent).not.toHaveBeenCalled()
    })

    it('reports every problem at once', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', '')
      vi.mocked(isYouTubeAuthorized).mockResolvedValue(false)

      const result = await preflightPipeline({
        redditUrl: 'https://example.com/nope',
        imageProvider: 'seedream',
        uploadToYouTube: true,
      })

      expect(result.ok).toBe(false)
      expect(result.problems).toHaveLength(4)
      expect(result.problems.join('\n')).toMatch(/Reddit post URL/)
      expect(result.problems.join('\n')).toMatch(/ANTHROPIC_API_KEY/)
      expect(result.problems.join('\n')).toMatch(/ARK_API_KEY/)
      expect(result.problems.join('\n')).toMatch(/YouTube is not authorized/)
    })

    it('fetches the post when fetchPost is set (dry run)', async () => {
      vi.mocked(fetchRedditContent).mockResolvedValue(content)

      const result = await preflightPipeline(
        { redditUrl: POST_URL },
        { fetchPost: true },
      )

      expect(result.ok).toBe(true)
      expect(result.post).toEqual({
        title: 'Post title',
        author: 'op',
        commentCount: 1,
      })
      expect(generateYouTubeScript).not.toHaveBeenCalled()
    })

    it('reports a failed post fetch as a problem', async () => {
      vi.mocked(fetchRedditContent).mockRejectedValue(
        new Error('Reddit API error: 404'),
      )

      const result = await preflightPipeline(
        { redditUrl: POST_URL },
        { fetchPost: true },
      )

      expect(result.ok).toBe(false)
      expect(result.problems).toEqual(['Reddit API error: 404'])
    })
  })

  describe('runPipeline', () => {
    it('runs all steps and skips upload by default', async () => {
      mockSuccessfulGeneration()

      const result = await runPipeline({ redditUrl: POST_URL })

      expect(result.scriptId).toBe('script-1')
      expect(result.videoPath).toBe('/media/script-1/video.mp4')
      expect(result.youtubeUrl).toBeUndefined()
      expect(uploadToYouTube).not.toHaveBeenCalled()
      expect(getPipelineProgress(result.pipelineId)?.stage).toBe('complete')
    })

    it('uploads with the chosen title and privacy when requested', async () => {
      mockSuccessfulGeneration()
      vi.mocked(uploadToYouTube).mockResolvedValue({
        videoId: 'vid1',
        url: 'https://www.youtube.com/watch?v=vid1',
        status: 'uploaded',
      })

      const result = await runPipeline({
        redditUrl: POST_URL,
        uploadToYouTube: true,
        youtubePrivacyStatus: 'private',
      })

      expect(uploadToYouTube).toHaveBeenCalledWith(
        expect.objectContaining({
          videoPath: '/media/script-1/video.mp4',
          title: 'Chosen title',
          privacyStatus: 'private',
          categoryId: '24',
          thumbnailPath: '/img/scene-01.png',
        }),
      )
      expect(result.youtubeVideoId).toBe('vid1')
    })

    it('fails before any paid call when YouTube is not authorized', async () => {
      mockSuccessfulGeneration()
      vi.mocked(isYouTubeAuthorized).mockResolvedValue(false)

      await expect(
        runPipeline({ redditUrl: POST_URL, uploadToYouTube: true }),
      ).rejects.toThrow('YouTube is not authorized')

      expect(fetchRedditContent).not.toHaveBeenCalled()
      expect(generateYouTubeScript).not.toHaveBeenCalled()
    })

    it('keeps the rendered video path in the error when upload fails', async () => {
      mockSuccessfulGeneration()
      vi.mocked(uploadToYouTube).mockRejectedValue(new Error('quotaExceeded'))

      await expect(
        runPipeline({ redditUrl: POST_URL, uploadToYouTube: true }),
      ).rejects.toThrow(
        /YouTube upload failed \(rendered video kept at \/media\/script-1\/video\.mp4.*quotaExceeded/,
      )
      expect(uploadToYouTube).toHaveBeenCalledTimes(1)
    })

    it('stops when audio generation fails for a scene', async () => {
      mockSuccessfulGeneration()
      vi.mocked(generateAudioForScenes).mockResolvedValue({
        audios: [],
        failedAudios: [{ sceneIndex: 0, error: 'TTS down' }],
      } as never)

      await expect(runPipeline({ redditUrl: POST_URL })).rejects.toThrow(
        'Audio generation failed for 1 scene(s): TTS down',
      )
      expect(generateImagesForScenes).not.toHaveBeenCalled()
      expect(renderVideo).not.toHaveBeenCalled()
    })
  })

  describe('startPipeline', () => {
    it('records errors in the progress store', async () => {
      vi.mocked(fetchRedditContent).mockRejectedValue(
        new Error('Reddit API error: 503'),
      )

      const pipelineId = startPipeline({ redditUrl: POST_URL })
      await vi.waitFor(() => {
        expect(getPipelineProgress(pipelineId)?.error).toBe(
          'Reddit API error: 503',
        )
      })
    })
  })
})
