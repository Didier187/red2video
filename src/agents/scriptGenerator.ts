import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

export const SceneSchema = z.object({
  text: z.string().describe('Voiceover text for this scene'),
  imagePrompt: z
    .string()
    .describe('Detailed prompt for generating the background image'),
  durationHint: z.number().describe('Approximate duration in seconds'),
})

export const YouTubeScriptSchema = z.object({
  title: z.string().describe('Catchy YouTube video title'),
  description: z.string().describe('YouTube video description'),
  scenes: z.array(SceneSchema).describe('Array of scenes for the video'),
  totalDuration: z.number().describe('Total estimated video duration in seconds'),
})

export type Scene = z.infer<typeof SceneSchema>
export type YouTubeScript = z.infer<typeof YouTubeScriptSchema>

export interface ScriptInput {
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

const SYSTEM_PROMPT = `You are an expert YouTube scriptwriter specializing in converting Reddit content into engaging, high-retention video scripts.

Your goal is to create scripts that:
1. Hook viewers in the first 5 seconds
2. Maintain engagement through storytelling techniques
3. Include natural pauses and emphasis points
4. Create vivid, specific image prompts that AI image generators can use
5. Balance entertainment with the original content's message

Guidelines for scenes:
- Start with a compelling hook scene (3-5 seconds)
- Each scene should be 5-15 seconds for optimal pacing
- Use conversational, natural language for voiceover
- Image prompts should be detailed, cinematic, and visually interesting
- Include emotional beats and variety in pacing
- End with a call-to-action or thought-provoking conclusion`

export async function generateYouTubeScript(
  input: ScriptInput
): Promise<YouTubeScript> {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: YouTubeScriptSchema,
    system: SYSTEM_PROMPT,
    prompt: `Transform this Reddit thread into a high-retention YouTube video script.

REDDIT CONTENT:
${input.plainText}

Create an engaging script with:
1. An attention-grabbing hook
2. The main story/discussion from the post
3. The most interesting/funny/insightful comments
4. A satisfying conclusion

Make sure each scene has:
- Clear voiceover text (conversational tone)
- A detailed image prompt for AI image generation
- Appropriate duration hint

The total video should be 60-120 seconds for optimal YouTube Shorts/TikTok format, or longer for standard YouTube if the content warrants it.`,
  })

  return object
}
