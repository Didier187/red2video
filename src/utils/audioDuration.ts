import { promises as fs } from 'fs'

// Bitrate tables for MPEG audio
const BITRATES: Record<string, number[]> = {
  // MPEG Version 1, Layer III
  'V1L3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  // MPEG Version 2/2.5, Layer III
  'V2L3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
}

// Sample rate tables
const SAMPLE_RATES: Record<number, number[]> = {
  0: [11025, 12000, 8000],   // MPEG 2.5
  2: [22050, 24000, 16000],  // MPEG 2
  3: [44100, 48000, 32000],  // MPEG 1
}

// Samples per frame for Layer III
const SAMPLES_PER_FRAME: Record<number, number> = {
  3: 1152, // MPEG 1
  2: 576,  // MPEG 2
  0: 576,  // MPEG 2.5
}

export async function getAudioDuration(audioPath: string): Promise<number> {
  const buffer = await fs.readFile(audioPath)

  let offset = 0
  let totalDuration = 0
  let frameCount = 0

  // Skip ID3v2 tag if present
  if (buffer.length > 10 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    const size = ((buffer[6] & 0x7f) << 21) | ((buffer[7] & 0x7f) << 14) |
                 ((buffer[8] & 0x7f) << 7) | (buffer[9] & 0x7f)
    offset = 10 + size
  }

  while (offset < buffer.length - 4) {
    // Look for frame sync (11 set bits)
    if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) {
      offset++
      continue
    }

    const header = (buffer[offset] << 24) | (buffer[offset + 1] << 16) |
                   (buffer[offset + 2] << 8) | buffer[offset + 3]

    // Extract header fields
    const version = (header >> 19) & 0x03      // MPEG version
    const layer = (header >> 17) & 0x03        // Layer
    const bitrateIndex = (header >> 12) & 0x0f // Bitrate index
    const sampleRateIndex = (header >> 10) & 0x03 // Sample rate index
    const padding = (header >> 9) & 0x01       // Padding bit

    // Validate: layer must be 1 (Layer III), version must be valid
    if (layer !== 1 || version === 1 || sampleRateIndex === 3 ||
        bitrateIndex === 0 || bitrateIndex === 15) {
      offset++
      continue
    }

    // Get bitrate and sample rate
    const bitrateKey = version === 3 ? 'V1L3' : 'V2L3'
    const bitrate = BITRATES[bitrateKey][bitrateIndex] * 1000
    const sampleRates = SAMPLE_RATES[version]
    if (!sampleRates) {
      offset++
      continue
    }
    const sampleRate = sampleRates[sampleRateIndex]
    const samplesPerFrame = SAMPLES_PER_FRAME[version] || 1152

    // Calculate frame size
    const frameSize = Math.floor((samplesPerFrame / 8) * bitrate / sampleRate) + padding

    if (frameSize < 4 || offset + frameSize > buffer.length) {
      offset++
      continue
    }

    // Calculate frame duration in seconds
    const frameDuration = samplesPerFrame / sampleRate
    totalDuration += frameDuration
    frameCount++

    // Move to next frame
    offset += frameSize
  }

  // Add a small buffer (0.1s) to ensure audio completes before scene ends
  return totalDuration + 0.1
}
