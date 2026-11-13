import { promises as fs } from 'fs'
import path from 'path'
import type { AudioGenerationResult } from '../agents/audioGenerator'
import type { ImageGenerationResult } from '../agents/imageGenerator'
import type { StoredScript } from './scriptStore'
import { getScript, updateScript } from './scriptStore'

const MEDIA_DIR = path.join(process.cwd(), '.media-store')

// ---------------------------------------------------------------------------
// Reddit content fetching
// ---------------------------------------------------------------------------

interface RedditComment {
  author: string
  body: string
  score: number
}

interface RedditPostData {
  title: string
  author: string
  subreddit: string
  selftext: string
  score: number
  num_comments: number
  permalink: string
  top_comments: RedditComment[]
}

export interface ScriptContent {
  post: {
    author: string
    title: string
    body: string
  }
  comments: Array<{
    author: string
    text: string
  }>
  plainText: string
}

interface RedditApiCommentItem {
  kind: string
  data?: {
    author: string
    body: string
    score: number
  }
}

function extractComments(
  commentsData: RedditApiCommentItem[],
  limit: number = 10,
): RedditComment[] {
  const comments: RedditComment[] = []

  for (const item of commentsData) {
    if (item.kind !== 't1' || !item.data) continue
    if (comments.length >= limit) break

    const data = item.data
    if (
      data.author === '[deleted]' ||
      data.body === '[deleted]' ||
      data.body === '[removed]'
    )
      continue

    comments.push({
      author: data.author,
      body: data.body,
      score: data.score,
    })
  }

  return comments
}

function generatePlainText(post: RedditPostData): string {
  let text = `REDDIT POST from r/${post.subreddit}\n`
  text += `Posted by u/${post.author}\n\n`
  text += `TITLE: ${post.title}\n\n`

  if (post.selftext) {
    text += `POST CONTENT:\n${post.selftext}\n\n`
  }

  text += `---\n\nTOP COMMENTS:\n\n`

  for (const comment of post.top_comments) {
    text += `u/${comment.author} (${comment.score} upvotes):\n${comment.body}\n\n`
  }

  return text
}

export async function fetchRedditContent(
  postUrl: string,
): Promise<ScriptContent> {
  // Validate it's a Reddit URL
  const parsedUrl = new URL(postUrl)
  if (
    !parsedUrl.hostname.includes('reddit.com') &&
    !parsedUrl.hostname.includes('redd.it')
  ) {
    throw new Error('URL must be a Reddit post URL')
  }

  const jsonUrl = postUrl.replace(/\/?$/, '.json')

  const response = await fetch(jsonUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!response.ok) {
    throw new Error(`Reddit API error: ${response.status}`)
  }

  const data = await response.json()

  const postData = data[0]?.data?.children?.[0]?.data
  const commentsData = data[1]?.data?.children ?? []

  if (!postData) {
    throw new Error('Could not parse Reddit post data')
  }

  const topComments = extractComments(commentsData)

  const redditPostData: RedditPostData = {
    title: postData.title,
    author: postData.author,
    subreddit: postData.subreddit,
    selftext: postData.selftext,
    score: postData.score,
    num_comments: postData.num_comments,
    permalink: `https://reddit.com${postData.permalink}`,
    top_comments: topComments,
  }

  return {
    post: {
      author: postData.author,
      title: postData.title,
      body: postData.selftext || '',
    },
    comments: topComments.map((c) => ({
      author: c.author,
      text: c.body,
    })),
    plainText: generatePlainText(redditPostData),
  }
}

// ---------------------------------------------------------------------------
// Audio results saving
// ---------------------------------------------------------------------------

export async function saveAudioResults(
  scriptId: string,
  result: AudioGenerationResult,
  scenes: Array<{ text: string }>,
): Promise<void> {
  const audioDir = path.join(MEDIA_DIR, scriptId, 'audio')
  await fs.mkdir(audioDir, { recursive: true })

  const existingScript = await getScript(scriptId)
  if (!existingScript) {
    throw new Error(`Script not found: ${scriptId}`)
  }
  const existingScenes = existingScript.media?.scenes || []

  const audioPathsMap: Record<number, string> = {}
  const audioDurationsMap: Record<number, number> = {}

  for (const audio of result.audios) {
    const sceneNum = String(audio.sceneIndex + 1).padStart(2, '0')
    const filePath = path.join(audioDir, `scene-${sceneNum}.mp3`)
    const buffer = Buffer.from(audio.audioBase64, 'base64')
    await fs.writeFile(filePath, buffer)
    console.log(`Saved audio for scene ${sceneNum}`)
    console.log(
      `Scene ${sceneNum} audio duration: ${(audio.duration ?? 0).toFixed(2)}s`,
    )

    audioPathsMap[audio.sceneIndex] = filePath
    audioDurationsMap[audio.sceneIndex] = audio.duration ?? 0
  }

  const mergedScenes = scenes.map((_, i) => ({
    ...existingScenes[i],
    audioPath: audioPathsMap[i],
    duration: audioDurationsMap[i],
  }))

  const totalDuration = Object.values(audioDurationsMap).reduce(
    (sum, d) => sum + d,
    0,
  )

  await updateScript(scriptId, {
    audioGenerated: true,
    media: { scenes: mergedScenes },
    script: {
      ...existingScript.script,
      totalDuration,
    },
  })
}

// ---------------------------------------------------------------------------
// Image results saving
// ---------------------------------------------------------------------------

export async function saveImageResults(
  scriptId: string,
  result: ImageGenerationResult,
  totalScenes: number,
): Promise<void> {
  const latestScript = await getScript(scriptId)
  const existingMedia = latestScript?.media?.scenes || []

  const mergedMedia = Array.from({ length: totalScenes }, (_, i) => {
    const successfulImage = result.images.find((img) => img.sceneIndex === i)
    return {
      ...existingMedia[i],
      ...(successfulImage ? { imagePath: successfulImage.filePath } : {}),
    }
  })

  const allSuccessful = result.failedImages.length === 0

  await updateScript(scriptId, {
    imagesGenerated: allSuccessful,
    media: { scenes: mergedMedia },
  })
}

// ---------------------------------------------------------------------------
// Scene preparation for video rendering
// ---------------------------------------------------------------------------

export function prepareScenesForRendering(storedScript: StoredScript) {
  return storedScript.script.scenes.map((scene, i) => ({
    ...scene,
    imagePath: storedScript.media?.scenes[i]?.imagePath,
    audioPath: storedScript.media?.scenes[i]?.audioPath,
    duration: storedScript.media?.scenes[i]?.duration,
  }))
}
