import { createFileRoute } from '@tanstack/react-router'

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

interface ScriptContent {
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
  limit: number = 10
): RedditComment[] {
  const comments: RedditComment[] = []

  for (const item of commentsData) {
    if (item.kind !== 't1' || !item.data) continue
    if (comments.length >= limit) break

    const data = item.data
    // Skip deleted/removed comments
    if (data.author === '[deleted]' || data.body === '[deleted]' || data.body === '[removed]') continue

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

export const Route = createFileRoute('/api/reddit')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        
        const url = new URL(request.url)
        const postUrl = url.searchParams.get('url')

        if (!postUrl) {
          return Response.json(
            { error: 'Missing "url" query parameter' },
            { status: 400 }
          )
        }

        // Validate it's a Reddit URL
        try {
          const parsedUrl = new URL(postUrl)
          if (
            !parsedUrl.hostname.includes('reddit.com') &&
            !parsedUrl.hostname.includes('redd.it')
          ) {
            return Response.json(
              { error: 'URL must be a Reddit post URL' },
              { status: 400 }
            )
          }
        } catch {
          return Response.json({ error: 'Invalid URL format' }, { status: 400 })
        }

        // Convert to JSON endpoint
        const jsonUrl = postUrl.replace(/\/?$/, '.json')

        try {
          const response = await fetch(jsonUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          })

          if (!response.ok) {
            return Response.json(
              { error: `Reddit API error: ${response.status}` },
              { status: response.status }
            )
          }

          const data = await response.json()

          // Reddit returns an array: [post, comments]
          const postData = data[0]?.data?.children?.[0]?.data
          const commentsData = data[1]?.data?.children ?? []

          if (!postData) {
            return Response.json(
              { error: 'Could not parse Reddit post data' },
              { status: 500 }
            )
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

          const result: ScriptContent = {
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

          return Response.json(result)
        } catch (error) {
          return Response.json(
            { error: `Failed to fetch Reddit post: ${error}` },
            { status: 500 }
          )
        }
      },
    },
  },
})
