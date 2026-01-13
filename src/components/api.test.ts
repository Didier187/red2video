import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getRedditPost,
  generateScript,
  generateAudio,
  generateVoiceSample,
  generateImages,
  renderVideo,
  regenerateImage,
  getImageStatus,
} from './api'
import type { ScriptContent, YouTubeScript, Voice } from './types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const mockScriptContent: ScriptContent = {
    post: {
      author: 'testuser',
      title: 'Test Post Title',
      body: 'This is the test post body',
    },
    comments: [
      { author: 'commenter1', text: 'First comment' },
      { author: 'commenter2', text: 'Second comment' },
    ],
    plainText: 'Test Post Title\nThis is the test post body\nFirst comment\nSecond comment',
  }

  const mockYouTubeScript: YouTubeScript = {
    id: 'script-123',
    title: 'Generated Video Title',
    description: 'Generated video description',
    scenes: [
      { text: 'Scene 1', imagePrompt: 'Image prompt 1', durationHint: 5 },
      { text: 'Scene 2', imagePrompt: 'Image prompt 2', durationHint: 7 },
    ],
    totalDuration: 12,
  }

  describe('getRedditPost', () => {
    it('should fetch a Reddit post successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockScriptContent),
      })

      const result = await getRedditPost({
        url: 'https://reddit.com/r/test/comments/123',
      })

      expect(result).toEqual(mockScriptContent)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/reddit?url=https%3A%2F%2Freddit.com%2Fr%2Ftest%2Fcomments%2F123'
      )
    })

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })

      await expect(
        getRedditPost({ url: 'https://reddit.com/r/test/comments/123' })
      ).rejects.toThrow('Internal server error')
    })

    it('should throw error when response contains error field', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ error: 'Invalid Reddit URL' }),
      })

      await expect(
        getRedditPost({ url: 'invalid-url' })
      ).rejects.toThrow('Invalid Reddit URL')
    })

    it('should encode URL parameters properly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockScriptContent),
      })

      await getRedditPost({ url: 'https://reddit.com/r/test?param=value&other=123' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('https://reddit.com/r/test?param=value&other=123'))
      )
    })
  })

  describe('generateScript', () => {
    it('should generate a script from content', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockYouTubeScript),
      })

      const result = await generateScript(mockScriptContent)

      expect(result).toEqual(mockYouTubeScript)
      expect(mockFetch).toHaveBeenCalledWith('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockScriptContent),
      })
    })

    it('should throw error on generation failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Script generation failed' }),
      })

      await expect(generateScript(mockScriptContent)).rejects.toThrow(
        'Script generation failed'
      )
    })
  })

  describe('generateAudio', () => {
    it('should generate audio for a script', async () => {
      const mockAudioResult = {
        audios: [
          { sceneIndex: 0, text: 'Scene 1', audioBase64: 'base64data', format: 'mp3' as const },
        ],
        totalScenes: 1,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAudioResult),
      })

      const result = await generateAudio({ scriptId: 'script-123', voice: 'nova' })

      expect(result).toEqual(mockAudioResult)
      expect(mockFetch).toHaveBeenCalledWith('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: 'script-123', voice: 'nova', model: 'tts-1' }),
      })
    })

    it('should support all voice options', async () => {
      const voices: Voice[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']

      for (const voice of voices) {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ audios: [], totalScenes: 0 }),
        })

        await generateAudio({ scriptId: 'test', voice })

        expect(mockFetch).toHaveBeenLastCalledWith('/api/generate-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining(`"voice":"${voice}"`),
        })
      }
    })

    it('should throw error on audio generation failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'TTS API error' }),
      })

      await expect(
        generateAudio({ scriptId: 'script-123', voice: 'nova' })
      ).rejects.toThrow('TTS API error')
    })
  })

  describe('generateVoiceSample', () => {
    it('should generate a voice sample', async () => {
      const mockSampleResult = {
        audios: [{ audioBase64: 'sample-base64-data' }],
        totalScenes: 1,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSampleResult),
      })

      const result = await generateVoiceSample('nova')

      expect(result).toBe('sample-base64-data')
    })

    it('should use SAMPLE_TEXT for voice samples', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ audios: [{ audioBase64: 'data' }], totalScenes: 1 }),
      })

      await generateVoiceSample('echo')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.scenes).toHaveLength(1)
      expect(callBody.scenes[0].text).toBe(
        'Welcome to this Reddit story. Let me tell you about something interesting.'
      )
    })

    it('should throw error on sample generation failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Voice sample failed' }),
      })

      await expect(generateVoiceSample('fable')).rejects.toThrow('Voice sample failed')
    })
  })

  describe('generateImages', () => {
    it('should generate images for a script', async () => {
      const mockImageResult = {
        images: [
          { sceneIndex: 0, prompt: 'prompt1', filePath: '/path/0.png', fileName: 'scene-00.png' },
        ],
        totalScenes: 1,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockImageResult),
      })

      const result = await generateImages('script-123')

      expect(result).toEqual(mockImageResult)
      expect(mockFetch).toHaveBeenCalledWith('/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: 'script-123',
          size: '1792x1024',
          quality: 'standard',
          style: 'vivid',
        }),
      })
    })

    it('should throw error on image generation failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'DALL-E API error' }),
      })

      await expect(generateImages('script-123')).rejects.toThrow('DALL-E API error')
    })
  })

  describe('renderVideo', () => {
    it('should render a video', async () => {
      const mockRenderResult = {
        videoPath: '/videos/output.mp4',
        fileName: 'output.mp4',
        durationSeconds: 45,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRenderResult),
      })

      const result = await renderVideo('script-123')

      expect(result).toEqual(mockRenderResult)
      expect(mockFetch).toHaveBeenCalledWith('/api/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: 'script-123',
          quality: 'medium',
          outputFormat: 'mp4',
        }),
      })
    })

    it('should throw error on render failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Remotion render failed' }),
      })

      await expect(renderVideo('script-123')).rejects.toThrow('Remotion render failed')
    })
  })

  describe('regenerateImage', () => {
    it('should regenerate a single image', async () => {
      const mockRegenerateResult = {
        sceneIndex: 1,
        prompt: 'new prompt',
        filePath: '/path/1.png',
        fileName: 'scene-01.png',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegenerateResult),
      })

      const result = await regenerateImage({
        scriptId: 'script-123',
        sceneIndex: 1,
        prompt: 'new prompt',
      })

      expect(result).toEqual(mockRegenerateResult)
      expect(mockFetch).toHaveBeenCalledWith('/api/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId: 'script-123',
          sceneIndex: 1,
          prompt: 'new prompt',
          size: '1792x1024',
          quality: 'standard',
          style: 'vivid',
        }),
      })
    })

    it('should throw error on regenerate failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Scene index out of range' }),
      })

      await expect(
        regenerateImage({ scriptId: 'script-123', sceneIndex: 99, prompt: 'test' })
      ).rejects.toThrow('Scene index out of range')
    })
  })

  describe('getImageStatus', () => {
    it('should get image generation status', async () => {
      const mockStatusResult = {
        images: [
          { sceneIndex: 0, fileName: 'scene-00.png', prompt: 'prompt1' },
          { sceneIndex: 1, fileName: 'scene-01.png', prompt: 'prompt2' },
        ],
        totalScenes: 3,
        isComplete: false,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStatusResult),
      })

      const result = await getImageStatus('script-123')

      expect(result).toEqual(mockStatusResult)
      expect(mockFetch).toHaveBeenCalledWith('/api/image-status/script-123')
    })

    it('should return isComplete: true when all images generated', async () => {
      const mockStatusResult = {
        images: [
          { sceneIndex: 0, fileName: 'scene-00.png', prompt: 'prompt1' },
          { sceneIndex: 1, fileName: 'scene-01.png', prompt: 'prompt2' },
        ],
        totalScenes: 2,
        isComplete: true,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStatusResult),
      })

      const result = await getImageStatus('script-123')

      expect(result.isComplete).toBe(true)
    })

    it('should throw error on status check failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Script not found' }),
      })

      await expect(getImageStatus('non-existent')).rejects.toThrow('Script not found')
    })
  })

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(
        getRedditPost({ url: 'https://reddit.com/r/test' })
      ).rejects.toThrow('Network error')
    })

    it('should handle JSON parse errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(
        getRedditPost({ url: 'https://reddit.com/r/test' })
      ).rejects.toThrow('Invalid JSON')
    })

    it('should use generic error message when no error field', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })

      await expect(
        getRedditPost({ url: 'https://reddit.com/r/test' })
      ).rejects.toThrow('Request failed: 500')
    })
  })
})
