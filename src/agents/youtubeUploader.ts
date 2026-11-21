import { google } from 'googleapis'
import { createReadStream } from 'fs'
import { getAuthenticatedClient } from '../lib/youtubeAuth'

export interface YouTubeUploadOptions {
  videoPath: string
  title: string
  description: string
  tags: string[]
  privacyStatus: 'private' | 'unlisted' | 'public'
  categoryId?: string
  thumbnailPath?: string
}

export interface YouTubeUploadResult {
  videoId: string
  url: string
  status: string
}

export async function uploadToYouTube(
  options: YouTubeUploadOptions,
): Promise<YouTubeUploadResult> {
  const auth = await getAuthenticatedClient()
  const youtube = google.youtube({ version: 'v3', auth })

  console.log(`[youtube-upload] Uploading: ${options.videoPath}`)
  console.log(`[youtube-upload] Title: ${options.title}`)

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: options.title,
        description: options.description,
        tags: options.tags,
        categoryId: options.categoryId || '24',
        defaultLanguage: 'en',
      },
      status: {
        privacyStatus: options.privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: createReadStream(options.videoPath),
    },
  })

  const videoId = response.data.id
  if (!videoId) {
    throw new Error('YouTube upload returned no video ID')
  }
  const url = `https://www.youtube.com/watch?v=${videoId}`

  console.log(`[youtube-upload] Video uploaded: ${url}`)

  // Upload custom thumbnail if provided
  if (options.thumbnailPath) {
    try {
      await youtube.thumbnails.set({
        videoId,
        media: {
          body: createReadStream(options.thumbnailPath),
        },
      })
      console.log('[youtube-upload] Custom thumbnail uploaded')
    } catch (error) {
      // Custom thumbnails require channel verification — non-fatal
      console.warn(
        '[youtube-upload] Thumbnail upload failed (channel may need verification):',
        error instanceof Error ? error.message : error,
      )
    }
  }

  return {
    videoId,
    url,
    status: response.data.status?.uploadStatus || 'uploaded',
  }
}
