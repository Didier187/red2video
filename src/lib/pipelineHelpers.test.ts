// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRedditContent, toRedditJsonUrl } from './pipelineHelpers'

const redditPayload = [
  {
    data: {
      children: [
        {
          data: {
            title: 'Post title',
            author: 'op',
            subreddit: 'test',
            selftext: 'Body text',
            score: 10,
            num_comments: 2,
            permalink: '/r/test/comments/abc123/post_title/',
          },
        },
      ],
    },
  },
  {
    data: {
      children: [
        { kind: 't1', data: { author: 'a', body: 'Nice', score: 5 } },
        { kind: 't1', data: { author: '[deleted]', body: 'x', score: 1 } },
        { kind: 'more' },
      ],
    },
  },
]

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('toRedditJsonUrl', () => {
  it('appends .json to a post URL', () => {
    expect(
      toRedditJsonUrl('https://www.reddit.com/r/test/comments/abc123/title/'),
    ).toBe('https://www.reddit.com/r/test/comments/abc123/title.json')
  })

  it('strips query strings and fragments from share links', () => {
    expect(
      toRedditJsonUrl(
        'https://www.reddit.com/r/test/comments/abc123/title/?utm_source=share&utm_medium=web#top',
      ),
    ).toBe('https://www.reddit.com/r/test/comments/abc123/title.json')
  })

  it('does not double the .json suffix', () => {
    expect(
      toRedditJsonUrl('https://old.reddit.com/r/test/comments/abc123.json'),
    ).toBe('https://old.reddit.com/r/test/comments/abc123.json')
  })

  it('expands redd.it short links', () => {
    expect(toRedditJsonUrl('https://redd.it/abc123')).toBe(
      'https://www.reddit.com/comments/abc123.json',
    )
  })

  it.each([
    'not a url',
    'https://notreddit.com/r/test/comments/abc123/',
    'https://reddit.com.evil.example/r/test/comments/abc123/',
    'ftp://www.reddit.com/r/test/comments/abc123/',
    'https://www.reddit.com/r/test/',
  ])('rejects %s', (url) => {
    expect(() => toRedditJsonUrl(url)).toThrow('must be a Reddit post URL')
  })
})

describe('fetchRedditContent', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('parses the post and filters deleted comments', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(redditPayload))

    const content = await fetchRedditContent(
      'https://www.reddit.com/r/test/comments/abc123/title/?utm_source=share',
    )

    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.reddit.com/r/test/comments/abc123/title.json',
      expect.any(Object),
    )
    expect(content.post).toEqual({
      author: 'op',
      title: 'Post title',
      body: 'Body text',
    })
    expect(content.comments).toEqual([{ author: 'a', text: 'Nice' }])
    expect(content.plainText).toContain('TITLE: Post title')
  })

  it('retries on 429 and succeeds', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse(redditPayload))

    const promise = fetchRedditContent(
      'https://www.reddit.com/r/test/comments/abc123/',
    )
    await vi.runAllTimersAsync()
    const content = await promise

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(content.post.title).toBe('Post title')
  })

  it('retries network errors then gives up with a Reddit API error', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNRESET'))

    const promise = fetchRedditContent(
      'https://www.reddit.com/r/test/comments/abc123/',
    )
    const assertion = expect(promise).rejects.toThrow(
      'Reddit API error: network failure (ECONNRESET)',
    )
    await vi.runAllTimersAsync()
    await assertion
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('does not retry on 404', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 404))

    await expect(
      fetchRedditContent('https://www.reddit.com/r/test/comments/abc123/'),
    ).rejects.toThrow('Reddit API error: 404')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does not call fetch for an invalid URL', async () => {
    await expect(
      fetchRedditContent('https://example.com/comments/abc'),
    ).rejects.toThrow('must be a Reddit post URL')
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
