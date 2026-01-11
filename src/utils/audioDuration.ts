import { promises as fs } from 'fs'

export async function getAudioDuration(audioPath: string): Promise<number> {
  const buffer = await fs.readFile(audioPath)

  let offset = 0

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++
      continue
    }

    const byte1 = buffer[offset]
    const byte2 = buffer[offset + 1]

    if ((byte1 & 0xe0) !== 0xe0) {
      offset++
      continue
    }

    const version = (byte2 & 0x18) >> 3
    const layer = (byte2 & 0x06) >> 1

    if (layer === 0) {
      offset++
      continue
    }

    const bitrateIndex = (buffer[offset + 2] & 0xf0) >> 4
    const sampleRateIndex = (buffer[offset + 2] & 0x0c) >> 2

    if (bitrateIndex === 0xf || bitrateIndex === 0 || sampleRateIndex === 3) {
      offset++
      continue
    }

    const bitrates = [
      [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
      [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
      [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
      [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
    ]

    const sampleRates = [44100, 48000, 32000]

    const bitrate = bitrates[version][bitrateIndex] * 1000
    const sampleRate = sampleRates[sampleRateIndex]

    const frameSize = Math.floor((144 * bitrate) / sampleRate)

    if (frameSize < 4 || offset + frameSize > buffer.length) {
      offset++
      continue
    }

    const frameDuration = (frameSize * 8) / bitrate

    let frameCount = 0
    let dataOffset = offset

    while (dataOffset < buffer.length - 4) {
      if (
        buffer[dataOffset] === 0xff &&
        (buffer[dataOffset + 1] & 0xe0) === 0xe0
      ) {
        const b2 = buffer[dataOffset + 1]
        const b3 = buffer[dataOffset + 2]
        if ((b2 & 0x18) >> 3 === (b2 & 0x18) >> 3 && (b2 & 0x06) >> 1 !== 0) {
          const brIdx = (b3 & 0xf0) >> 4
          const srIdx = (b3 & 0x0c) >> 2
          if (brIdx !== 0xf && brIdx !== 0 && srIdx !== 3) {
            frameCount++
            dataOffset += frameSize
            continue
          }
        }
      }
      dataOffset++
    }

    return frameCount * frameDuration
  }

  return 0
}
