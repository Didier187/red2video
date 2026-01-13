import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'

// Spy on fs.promises.readFile
vi.spyOn(fs.promises, 'readFile')

import { getAudioDuration } from './audioDuration'

const mockedReadFile = vi.mocked(fs.promises.readFile)

describe('getAudioDuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ID3v2 tag handling', () => {
    it('should skip ID3v2 tag when present', async () => {
      // Create a buffer with ID3v2 header (ID3) + size + a valid MP3 frame
      const id3Header = Buffer.from([
        0x49, 0x44, 0x33, // "ID3"
        0x04, 0x00, // Version 4.0
        0x00, // Flags
        0x00, 0x00, 0x00, 0x10, // Size: 16 bytes (syncsafe integer)
      ])
      const id3Content = Buffer.alloc(16) // 16 bytes of ID3 content

      // MPEG 1 Layer III frame header (44100 Hz, 128kbps)
      const frameHeader = Buffer.from([
        0xff, 0xfb, // Frame sync + MPEG1 Layer III
        0x90, // 128kbps, 44100Hz
        0x00, // padding, etc.
      ])

      const buffer = Buffer.concat([id3Header, id3Content, frameHeader])
      mockedReadFile.mockResolvedValue(buffer as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      // Should return 0.1 (the buffer) since no complete frame was found
      expect(duration).toBeCloseTo(0.1, 1)
    })

    it('should handle files without ID3v2 tag', async () => {
      // MPEG 1 Layer III frame header without ID3 tag
      const frameHeader = Buffer.from([
        0xff, 0xfb, // Frame sync + MPEG1 Layer III
        0x90, // 128kbps, 44100Hz
        0x00, // padding, etc.
      ])

      mockedReadFile.mockResolvedValue(frameHeader as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      expect(duration).toBeCloseTo(0.1, 1)
    })
  })

  describe('frame sync detection', () => {
    it('should find frame sync bytes (0xFF with 0xE0 mask)', async () => {
      // Valid frame sync is 11 set bits: 0xFF followed by byte with top 3 bits set
      const invalidSync = Buffer.from([0x00, 0x00, 0x00])
      const validSync = Buffer.from([0xff, 0xe0])

      mockedReadFile.mockResolvedValue(Buffer.concat([invalidSync, validSync]) as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      // Function should have processed the buffer
      expect(mockedReadFile).toHaveBeenCalledWith('/test/audio.mp3')
      expect(duration).toBeGreaterThanOrEqual(0.1)
    })

    it('should skip invalid sync bytes', async () => {
      // 0xFF without proper second byte should be skipped
      const buffer = Buffer.from([
        0xff, 0x00, // Invalid - second byte doesn't have 0xE0 mask
        0xff, 0x10, // Invalid - second byte doesn't have 0xE0 mask
      ])

      mockedReadFile.mockResolvedValue(buffer as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      // Should return just the buffer since no valid frames found
      expect(duration).toBeCloseTo(0.1, 1)
    })
  })

  describe('MPEG version detection', () => {
    it('should handle MPEG Version 1 (version bits = 3)', async () => {
      // MPEG1 Layer III: 0xFF 0xFB (version=3, layer=1)
      // 128kbps at 44100Hz
      const validMpeg1Frame = createMpeg1Frame(128, 44100)
      mockedReadFile.mockResolvedValue(validMpeg1Frame as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      expect(duration).toBeGreaterThan(0.1)
    })

    it('should handle MPEG Version 2 (version bits = 2)', async () => {
      // MPEG2 Layer III
      const validMpeg2Frame = createMpeg2Frame(64, 22050)
      mockedReadFile.mockResolvedValue(validMpeg2Frame as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      expect(duration).toBeGreaterThan(0.1)
    })

    it('should reject invalid MPEG version (version bits = 1)', async () => {
      // Version bits = 01 is reserved/invalid
      const invalidFrame = Buffer.from([
        0xff, 0xe2, // Frame sync + version=01 (invalid)
        0x90, 0x00,
      ])

      mockedReadFile.mockResolvedValue(invalidFrame as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      // Should return only the buffer since frame is invalid
      expect(duration).toBeCloseTo(0.1, 1)
    })
  })

  describe('bitrate validation', () => {
    it('should reject bitrate index 0 (free format)', async () => {
      // Bitrate index 0 is "free format" - not supported
      const frame = Buffer.from([
        0xff, 0xfb, // MPEG1 Layer III
        0x00, // Bitrate index 0
        0x00,
      ])

      mockedReadFile.mockResolvedValue(frame as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      expect(duration).toBeCloseTo(0.1, 1)
    })

    it('should reject bitrate index 15 (bad)', async () => {
      // Bitrate index 15 is invalid
      const frame = Buffer.from([
        0xff, 0xfb, // MPEG1 Layer III
        0xf0, // Bitrate index 15
        0x00,
      ])

      mockedReadFile.mockResolvedValue(frame as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      expect(duration).toBeCloseTo(0.1, 1)
    })
  })

  describe('sample rate validation', () => {
    it('should reject sample rate index 3 (reserved)', async () => {
      // Sample rate index 3 is reserved
      const frame = Buffer.from([
        0xff, 0xfb, // MPEG1 Layer III
        0x9c, // Valid bitrate, sample rate index 3
        0x00,
      ])

      mockedReadFile.mockResolvedValue(frame as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      expect(duration).toBeCloseTo(0.1, 1)
    })
  })

  describe('duration calculation', () => {
    it('should add 0.1s buffer to calculated duration', async () => {
      // Create a minimal valid frame that can be parsed
      const frame = createMpeg1Frame(128, 44100)
      mockedReadFile.mockResolvedValue(frame as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      // Duration should include the 0.1s buffer
      expect(duration).toBeGreaterThanOrEqual(0.1)
    })

    it('should return 0.1 for empty file', async () => {
      mockedReadFile.mockResolvedValue(Buffer.alloc(0) as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      expect(duration).toBeCloseTo(0.1, 1)
    })

    it('should return 0.1 for file with no valid frames', async () => {
      // Random data with no valid MP3 frames
      const randomData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04])
      mockedReadFile.mockResolvedValue(randomData as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      expect(duration).toBeCloseTo(0.1, 1)
    })
  })

  describe('frame size calculation', () => {
    it('should correctly calculate frame size with padding', async () => {
      // Frame with padding bit set
      const frameWithPadding = createMpeg1FrameWithPadding(128, 44100, true)
      mockedReadFile.mockResolvedValue(frameWithPadding as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      expect(duration).toBeGreaterThanOrEqual(0.1)
    })

    it('should skip frames with invalid frame size', async () => {
      // Create a frame header that would result in size < 4
      const tinyFrame = Buffer.from([
        0xff, 0xfb,
        0x10, // Very low bitrate
        0x00,
      ])

      mockedReadFile.mockResolvedValue(tinyFrame as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      // Should return buffer only since frame is too small
      expect(duration).toBeCloseTo(0.1, 1)
    })
  })

  describe('layer validation', () => {
    it('should only accept Layer III (layer bits = 1)', async () => {
      // Layer bits = 01 means Layer III
      const layerIIIFrame = createMpeg1Frame(128, 44100)
      mockedReadFile.mockResolvedValue(layerIIIFrame as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      expect(duration).toBeGreaterThan(0.1)
    })

    it('should reject Layer I (layer bits = 3)', async () => {
      // Layer bits = 11 means Layer I
      const layerIFrame = Buffer.from([
        0xff, 0xfe, // Frame sync + MPEG1 Layer I
        0x90, 0x00,
      ])

      mockedReadFile.mockResolvedValue(layerIFrame as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      expect(duration).toBeCloseTo(0.1, 1)
    })

    it('should reject Layer II (layer bits = 2)', async () => {
      // Layer bits = 10 means Layer II
      const layerIIFrame = Buffer.from([
        0xff, 0xfc, // Frame sync + MPEG1 Layer II
        0x90, 0x00,
      ])

      mockedReadFile.mockResolvedValue(layerIIFrame as any)

      const duration = await getAudioDuration('/test/audio.mp3')

      expect(duration).toBeCloseTo(0.1, 1)
    })
  })
})

// Helper functions to create valid MP3 frame headers

function createMpeg1Frame(bitrate: number, sampleRate: number): Buffer {
  const bitrateIndex = getBitrateIndex('V1L3', bitrate)
  const sampleRateIndex = getSampleRateIndex(3, sampleRate)

  const byte2 = (bitrateIndex << 4) | (sampleRateIndex << 2)

  // Calculate frame size to create a properly sized buffer
  const frameSize = Math.floor((1152 / 8) * (bitrate * 1000) / sampleRate)

  const frame = Buffer.alloc(Math.max(frameSize, 4))
  frame[0] = 0xff
  frame[1] = 0xfb
  frame[2] = byte2
  frame[3] = 0x00

  return frame
}

function createMpeg2Frame(bitrate: number, sampleRate: number): Buffer {
  const bitrateIndex = getBitrateIndex('V2L3', bitrate)
  const sampleRateIndex = getSampleRateIndex(2, sampleRate)

  const byte2 = (bitrateIndex << 4) | (sampleRateIndex << 2)

  const frameSize = Math.floor((576 / 8) * (bitrate * 1000) / sampleRate)

  const frame = Buffer.alloc(Math.max(frameSize, 4))
  frame[0] = 0xff
  frame[1] = 0xf3
  frame[2] = byte2
  frame[3] = 0x00

  return frame
}

function createMpeg1FrameWithPadding(bitrate: number, sampleRate: number, padding: boolean): Buffer {
  const bitrateIndex = getBitrateIndex('V1L3', bitrate)
  const sampleRateIndex = getSampleRateIndex(3, sampleRate)

  const paddingBit = padding ? 1 : 0
  const byte2 = (bitrateIndex << 4) | (sampleRateIndex << 2) | (paddingBit << 1)

  const frameSize = Math.floor((1152 / 8) * (bitrate * 1000) / sampleRate) + (padding ? 1 : 0)

  const frame = Buffer.alloc(Math.max(frameSize, 4))
  frame[0] = 0xff
  frame[1] = 0xfb
  frame[2] = byte2
  frame[3] = 0x00

  return frame
}

function getBitrateIndex(key: 'V1L3' | 'V2L3', bitrate: number): number {
  const bitrates: Record<string, number[]> = {
    'V1L3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
    'V2L3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
  }
  return bitrates[key].indexOf(bitrate)
}

function getSampleRateIndex(version: number, sampleRate: number): number {
  const sampleRates: Record<number, number[]> = {
    0: [11025, 12000, 8000],
    2: [22050, 24000, 16000],
    3: [44100, 48000, 32000],
  }
  return sampleRates[version]?.indexOf(sampleRate) ?? -1
}
