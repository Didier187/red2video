import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

export const YouTubeMetadataSchema = z.object({
  titles: z.array(
    z.object({
      title: z.string().describe('YouTube video title (max 100 characters)'),
      style: z.enum(['curiosity', 'dramatic', 'emotional', 'clickbait', 'straightforward']).describe('The style/approach of this title'),
    })
  ).describe('Array of 5 title options ranked by expected performance'),
  description: z.string().describe('Full YouTube video description with timestamps, keywords, and call-to-action'),
  tags: z.array(z.string()).describe('Relevant YouTube tags for discoverability'),
  hashtags: z.array(z.string()).describe('3-5 hashtags to include in the description'),
})

export type YouTubeMetadata = z.infer<typeof YouTubeMetadataSchema>

export interface MetadataInput {
  originalTitle: string
  originalDescription: string
  scenes: Array<{
    text: string
    durationHint: number
  }>
  sourceContent: string
  totalDuration: number
}

const SYSTEM_PROMPT = `You are an expert YouTube SEO specialist and copywriter who creates viral video titles and descriptions.

Your expertise includes:
1. Writing titles that maximize click-through rate (CTR)
2. Using power words that trigger curiosity and emotion
3. Optimizing descriptions for YouTube's search algorithm
4. Creating compelling hooks that make viewers click
5. Understanding YouTube trends and what performs well

Title Writing Rules:
- Keep titles under 60 characters for full visibility on mobile
- Use numbers when relevant ("This Man's $50K Mistake...")
- Create curiosity gaps - hint at something without revealing it
- Use emotional triggers: shock, curiosity, outrage, satisfaction
- Avoid clickbait that doesn't deliver - titles must match content
- Capital case for key words, but don't ALL CAPS everything
- Consider using brackets [UPDATE] or parentheses (Gone Wrong) for emphasis

Description Writing Rules:
- First 150 characters are crucial (shown in search results)
- Include timestamps for longer videos
- Add relevant keywords naturally (not stuffed)
- Include a clear call-to-action (subscribe, comment, like)
- Add relevant links and social media
- Use line breaks for readability
- End with hashtags (3-5 relevant ones)

Tag Strategy:
- Mix broad and specific tags
- Include topic keywords, related topics, and trending terms
- Use competitor video tags as inspiration
- Include common misspellings if relevant`

export async function generateYouTubeMetadata(
  input: MetadataInput
): Promise<YouTubeMetadata> {
  const timestamps = generateTimestamps(input.scenes)

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: YouTubeMetadataSchema,
    system: SYSTEM_PROMPT,
    prompt: `Create optimized YouTube metadata for this video.

ORIGINAL TITLE: ${input.originalTitle}
ORIGINAL DESCRIPTION: ${input.originalDescription}

VIDEO CONTENT SUMMARY:
${input.scenes.map((s, i) => `Scene ${i + 1}: ${s.text}`).join('\n')}

SOURCE CONTENT (for context):
${input.sourceContent.slice(0, 2000)}

VIDEO LENGTH: ${Math.round(input.totalDuration)} seconds

TIMESTAMPS FOR DESCRIPTION:
${timestamps}

Create:
1. FIVE title options, ranked by expected performance:
   - Title 1: Curiosity-driven (create an irresistible question/mystery)
   - Title 2: Dramatic/intense (emphasize conflict or stakes)
   - Title 3: Emotional hook (appeal to feelings)
   - Title 4: Mild clickbait (attention-grabbing but honest)
   - Title 5: Straightforward/informative (clear and direct)

2. A FULL DESCRIPTION that includes:
   - Attention-grabbing first line (this shows in search!)
   - Brief summary of the video content
   - The timestamps I provided
   - Call-to-action for engagement
   - Hashtags at the end

3. 10-15 relevant TAGS for YouTube SEO

4. 3-5 HASHTAGS for the description

Remember:
- Titles must be under 100 characters (ideally under 60)
- The content is from Reddit, so use terms like "Reddit story", "AITA", "Reddit drama" etc. if relevant
- Make titles irresistible but honest - don't overpromise
- Description should be at least 200 words for SEO`,
  })

  return object
}

function generateTimestamps(scenes: Array<{ text: string; durationHint: number }>): string {
  let currentTime = 0
  const timestamps: string[] = []

  // Group scenes into logical chapters
  const chapters = [
    { name: 'Intro', endIndex: 0 },
    { name: 'The Setup', endIndex: 2 },
    { name: 'The Story', endIndex: Math.min(6, scenes.length - 2) },
    { name: 'Reactions', endIndex: Math.min(8, scenes.length - 1) },
    { name: 'Conclusion', endIndex: scenes.length - 1 },
  ]

  let chapterIndex = 0
  scenes.forEach((scene, index) => {
    if (index === 0 || index === chapters[chapterIndex]?.endIndex + 1) {
      const minutes = Math.floor(currentTime / 60)
      const seconds = Math.floor(currentTime % 60)
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

      if (chapterIndex < chapters.length) {
        timestamps.push(`${timeStr} - ${chapters[chapterIndex].name}`)
        chapterIndex++
      }
    }
    currentTime += scene.durationHint
  })

  return timestamps.join('\n')
}

export function selectBestTitle(metadata: YouTubeMetadata, preferredStyle?: string): string {
  if (preferredStyle) {
    const preferred = metadata.titles.find(t => t.style === preferredStyle)
    if (preferred) return preferred.title
  }
  // Default to first (highest ranked) title
  return metadata.titles[0]?.title || ''
}
