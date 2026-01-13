import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'

// Spy on the modules
vi.spyOn(fs.promises, 'mkdir')
vi.spyOn(fs.promises, 'writeFile')
vi.spyOn(fs.promises, 'readFile')
vi.spyOn(fs.promises, 'readdir')
vi.spyOn(fs.promises, 'unlink')

import {
  saveScript,
  getScript,
  updateScript,
  deleteScript,
  listScripts,
  cleanupOldScripts,
  type StoredScript,
} from './scriptStore'

const mockMkdir = vi.mocked(fs.promises.mkdir)
const mockWriteFile = vi.mocked(fs.promises.writeFile)
const mockReadFile = vi.mocked(fs.promises.readFile)
const mockReaddir = vi.mocked(fs.promises.readdir)
const mockUnlink = vi.mocked(fs.promises.unlink)

const mockScript: StoredScript['script'] = {
  title: 'Test Video Title',
  description: 'A test video description',
  scenes: [
    { text: 'Scene 1 text', imagePrompt: 'A scenic image', durationHint: 5 },
    { text: 'Scene 2 text', imagePrompt: 'Another image', durationHint: 7 },
  ],
  totalDuration: 12,
}

describe('scriptStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMkdir.mockResolvedValue(undefined as any)
    mockWriteFile.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('saveScript', () => {
    it('should save a script and return a UUID', async () => {
      const id = await saveScript(mockScript)

      // Should return a valid UUID format
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('.script-store'),
        { recursive: true }
      )
      expect(mockWriteFile).toHaveBeenCalled()
    })

    it('should include reddit URL when provided', async () => {
      const redditUrl = 'https://reddit.com/r/test/post/123'
      await saveScript(mockScript, redditUrl)

      const writeCall = mockWriteFile.mock.calls[0]
      const savedData = JSON.parse(writeCall[1] as string)

      expect(savedData.redditUrl).toBe(redditUrl)
    })

    it('should set audioGenerated to false by default', async () => {
      await saveScript(mockScript)

      const writeCall = mockWriteFile.mock.calls[0]
      const savedData = JSON.parse(writeCall[1] as string)

      expect(savedData.audioGenerated).toBe(false)
    })

    it('should generate a createdAt timestamp', async () => {
      const beforeTime = new Date().toISOString()
      await saveScript(mockScript)
      const afterTime = new Date().toISOString()

      const writeCall = mockWriteFile.mock.calls[0]
      const savedData = JSON.parse(writeCall[1] as string)

      expect(savedData.createdAt).toBeDefined()
      expect(new Date(savedData.createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      )
      expect(new Date(savedData.createdAt).getTime()).toBeLessThanOrEqual(
        new Date(afterTime).getTime()
      )
    })

    it('should handle directory creation errors gracefully', async () => {
      mockMkdir.mockRejectedValue(new Error('EEXIST'))

      // Should not throw
      const id = await saveScript(mockScript)
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('should write to the correct file path', async () => {
      const id = await saveScript(mockScript)

      const writeCall = mockWriteFile.mock.calls[0]
      expect(writeCall[0]).toContain(`${id}.json`)
    })
  })

  describe('getScript', () => {
    const storedScript: StoredScript = {
      id: 'test-uuid-1234',
      createdAt: new Date().toISOString(),
      script: mockScript,
      audioGenerated: false,
    }

    it('should return a script when it exists', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(storedScript) as any)

      const result = await getScript('test-uuid-1234')

      expect(result).toEqual(storedScript)
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining('test-uuid-1234.json'),
        'utf-8'
      )
    })

    it('should return null when script does not exist', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'))

      const result = await getScript('non-existent-id')

      expect(result).toBeNull()
    })

    it('should return null on JSON parse error', async () => {
      mockReadFile.mockResolvedValue('invalid json {{{' as any)

      const result = await getScript('bad-json-id')

      expect(result).toBeNull()
    })
  })

  describe('updateScript', () => {
    const existingScript: StoredScript = {
      id: 'test-uuid-1234',
      createdAt: '2024-01-01T00:00:00.000Z',
      script: mockScript,
      audioGenerated: false,
    }

    it('should update an existing script', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(existingScript) as any)

      const result = await updateScript('test-uuid-1234', {
        audioGenerated: true,
      })

      expect(result).toBe(true)

      const writeCall = mockWriteFile.mock.calls[0]
      const updatedData = JSON.parse(writeCall[1] as string)

      expect(updatedData.audioGenerated).toBe(true)
      expect(updatedData.id).toBe('test-uuid-1234')
      expect(updatedData.createdAt).toBe('2024-01-01T00:00:00.000Z')
    })

    it('should return false when script does not exist', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'))

      const result = await updateScript('non-existent-id', {
        audioGenerated: true,
      })

      expect(result).toBe(false)
      expect(mockWriteFile).not.toHaveBeenCalled()
    })

    it('should update media information', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(existingScript) as any)

      const media = {
        scenes: [
          { audioPath: '/audio/scene-0.mp3', duration: 5.5 },
          { audioPath: '/audio/scene-1.mp3', duration: 7.2 },
        ],
      }

      await updateScript('test-uuid-1234', { media })

      const writeCall = mockWriteFile.mock.calls[0]
      const updatedData = JSON.parse(writeCall[1] as string)

      expect(updatedData.media).toEqual(media)
    })

    it('should update video generation status', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(existingScript) as any)

      await updateScript('test-uuid-1234', {
        videoGenerated: true,
        videoPath: '/videos/output.mp4',
      })

      const writeCall = mockWriteFile.mock.calls[0]
      const updatedData = JSON.parse(writeCall[1] as string)

      expect(updatedData.videoGenerated).toBe(true)
      expect(updatedData.videoPath).toBe('/videos/output.mp4')
    })

    it('should preserve existing fields when updating', async () => {
      const scriptWithMedia: StoredScript = {
        ...existingScript,
        media: {
          scenes: [{ audioPath: '/audio/scene-0.mp3' }],
        },
      }
      mockReadFile.mockResolvedValue(JSON.stringify(scriptWithMedia) as any)

      await updateScript('test-uuid-1234', { imagesGenerated: true })

      const writeCall = mockWriteFile.mock.calls[0]
      const updatedData = JSON.parse(writeCall[1] as string)

      expect(updatedData.media.scenes).toHaveLength(1)
      expect(updatedData.imagesGenerated).toBe(true)
    })
  })

  describe('deleteScript', () => {
    it('should delete an existing script', async () => {
      mockUnlink.mockResolvedValue(undefined)

      const result = await deleteScript('test-uuid-1234')

      expect(result).toBe(true)
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining('test-uuid-1234.json')
      )
    })

    it('should return false when delete fails', async () => {
      mockUnlink.mockRejectedValue(new Error('ENOENT'))

      const result = await deleteScript('non-existent-id')

      expect(result).toBe(false)
    })
  })

  describe('listScripts', () => {
    it('should return all scripts sorted by creation date (newest first)', async () => {
      const scripts: StoredScript[] = [
        {
          id: 'older',
          createdAt: '2024-01-01T00:00:00.000Z',
          script: mockScript,
        },
        {
          id: 'newer',
          createdAt: '2024-01-02T00:00:00.000Z',
          script: mockScript,
        },
      ]

      mockReaddir.mockResolvedValue(['older.json', 'newer.json'] as any)
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(scripts[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(scripts[1]) as any)

      const result = await listScripts()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('newer')
      expect(result[1].id).toBe('older')
    })

    it('should only read .json files', async () => {
      mockReaddir.mockResolvedValue([
        'script.json',
        'readme.txt',
        '.gitkeep',
      ] as any)
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          id: 'script',
          createdAt: new Date().toISOString(),
          script: mockScript,
        }) as any
      )

      const result = await listScripts()

      expect(result).toHaveLength(1)
      expect(mockReadFile).toHaveBeenCalledTimes(1)
    })

    it('should return empty array when directory is empty', async () => {
      mockReaddir.mockResolvedValue([] as any)

      const result = await listScripts()

      expect(result).toEqual([])
    })

    it('should return empty array on read error', async () => {
      mockReaddir.mockRejectedValue(new Error('ENOENT'))

      const result = await listScripts()

      expect(result).toEqual([])
    })

    it('should ensure store directory exists', async () => {
      mockReaddir.mockResolvedValue([] as any)

      await listScripts()

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('.script-store'),
        { recursive: true }
      )
    })
  })

  describe('cleanupOldScripts', () => {
    it('should delete scripts older than 24 hours', async () => {
      const now = Date.now()
      const oldDate = new Date(now - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      const newDate = new Date(now - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago

      const scripts: StoredScript[] = [
        { id: 'old-script', createdAt: oldDate, script: mockScript },
        { id: 'new-script', createdAt: newDate, script: mockScript },
      ]

      mockReaddir.mockResolvedValue(['old-script.json', 'new-script.json'] as any)
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(scripts[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(scripts[1]) as any)
      mockUnlink.mockResolvedValue(undefined)

      const deleted = await cleanupOldScripts()

      expect(deleted).toBe(1)
      expect(mockUnlink).toHaveBeenCalledTimes(1)
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining('old-script.json')
      )
    })

    it('should not delete scripts less than 24 hours old', async () => {
      const recentDate = new Date().toISOString()

      mockReaddir.mockResolvedValue(['recent.json'] as any)
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          id: 'recent',
          createdAt: recentDate,
          script: mockScript,
        }) as any
      )

      const deleted = await cleanupOldScripts()

      expect(deleted).toBe(0)
      expect(mockUnlink).not.toHaveBeenCalled()
    })

    it('should return 0 when no scripts exist', async () => {
      mockReaddir.mockResolvedValue([] as any)

      const deleted = await cleanupOldScripts()

      expect(deleted).toBe(0)
    })

    it('should delete multiple old scripts', async () => {
      const oldDate1 = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      const oldDate2 = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

      mockReaddir.mockResolvedValue(['old1.json', 'old2.json'] as any)
      mockReadFile
        .mockResolvedValueOnce(
          JSON.stringify({ id: 'old1', createdAt: oldDate1, script: mockScript }) as any
        )
        .mockResolvedValueOnce(
          JSON.stringify({ id: 'old2', createdAt: oldDate2, script: mockScript }) as any
        )
      mockUnlink.mockResolvedValue(undefined)

      const deleted = await cleanupOldScripts()

      expect(deleted).toBe(2)
      expect(mockUnlink).toHaveBeenCalledTimes(2)
    })
  })
})
