import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

export const SceneSchema = z.object({
  text: z
    .string()
    .describe(
      'Voiceover text for this scene. Must be a complete thought/sentence that flows naturally into the next scene. Should NOT end mid-sentence or leave ideas hanging.'
    ),
  imagePrompt: z
    .string()
    .describe(
      'Detailed, cinematic prompt for AI image generation. Include setting, lighting, mood, and key visual elements.'
    ),
  durationHint: z
    .number()
    .describe('Duration in seconds (typically 5-8 seconds per scene)'),
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

CRITICAL - Story Continuity Rules:
- The script must tell ONE CONTINUOUS STORY from start to finish
- Each scene MUST flow directly into the next - no abrupt topic changes
- Scene transitions should feel natural, as if one person is telling the whole story
- NEVER leave a thought unfinished - complete each idea before moving on
- If a scene ends mid-sentence or mid-thought, it's WRONG
- The narrative arc should be: Setup → Build-up → Climax → Resolution
- Think of it as one continuous monologue broken into visual segments

Guidelines for scenes:
- Start with a compelling hook scene (3-5 seconds)
- Each scene should be 5-15 seconds for optimal pacing
- Use conversational, natural language for voiceover
- Scene text should END at natural pause points (end of sentences, not mid-thought)
- Image prompts should be detailed, cinematic, and visually interesting
- Include emotional beats and variety in pacing
- End with a satisfying conclusion that wraps up the story`

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

IMPORTANT: Create ONE CONTINUOUS STORY that flows naturally from scene to scene. The viewer should feel like they're hearing one seamless narration, just with different visuals for each segment.

Structure your script as:
1. HOOK (Scene 1): Grab attention immediately with the most dramatic/interesting part
2. SETUP (Scenes 2-3): Introduce the situation and characters
3. STORY (Scenes 4-7): Tell the main narrative with rising tension
4. REACTIONS (Scenes 8-9): Include the best community reactions/comments
5. CONCLUSION (Final scene): Wrap up with a satisfying ending or verdict

Rules for scene text:
- Each scene's voiceover must END at a complete thought (full sentence)
- The NEXT scene should naturally continue from where the previous left off
- Use transition words/phrases: "But then...", "And that's when...", "Here's the thing...", "Now...", "So..."
- NO scene should feel disconnected from the one before it
- Read all scenes together - they should sound like ONE continuous story

Make sure each scene has:
- Clear voiceover text that completes its thought AND connects to the next
- A detailed image prompt for AI image generation
- Duration hint (5-8 seconds per scene is ideal)

Target length: 60-90 seconds total for optimal engagement.`,
  })

  return object
}
