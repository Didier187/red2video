import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import type {
  CharacterConfig,
  CharacterDefinition,
  CharacterRole,
  CharacterType,
} from '../components/types'
import { randomUUID } from 'crypto'

const PhysicalDescriptionSchema = z.object({
  age: z
    .string()
    .optional()
    .describe('Approximate age or age range (e.g., "mid-30s", "elderly", "teenager")'),
  gender: z
    .string()
    .optional()
    .describe('Gender presentation (e.g., "male", "female", "non-binary")'),
  build: z
    .string()
    .optional()
    .describe('Body type (e.g., "athletic", "slim", "heavyset", "average")'),
  skinTone: z
    .string()
    .optional()
    .describe('Skin tone description (e.g., "fair", "olive", "dark brown", "tan")'),
  hairColor: z
    .string()
    .optional()
    .describe('Hair color (e.g., "dark brown", "blonde", "gray", "red")'),
  hairStyle: z
    .string()
    .optional()
    .describe('Hair style (e.g., "short and neat", "long wavy", "bald", "ponytail")'),
  eyeColor: z
    .string()
    .optional()
    .describe('Eye color (e.g., "blue", "brown", "green", "hazel")'),
  facialFeatures: z
    .string()
    .optional()
    .describe('Notable facial features (e.g., "sharp jawline", "round face", "beard", "glasses")'),
  clothing: z
    .string()
    .optional()
    .describe('Typical clothing or outfit (e.g., "business suit", "casual jeans and t-shirt")'),
  accessories: z
    .string()
    .optional()
    .describe('Notable accessories (e.g., "wedding ring", "watch", "necklace", "hat")'),
})

const CharacterSchema = z.object({
  name: z
    .string()
    .describe('Character name or identifier (e.g., "John", "The Manager", "OP\'s Wife")'),
  role: z
    .enum(['protagonist', 'antagonist', 'supporting', 'background'])
    .describe('Role in the story'),
  type: z
    .enum(['human', 'animal', 'creature', 'object'])
    .describe('Type of character'),
  physicalDescription: PhysicalDescriptionSchema.describe(
    'Detailed physical description for visual consistency'
  ),
  appearances: z
    .array(z.number())
    .describe('Zero-based scene indices where this character appears or is mentioned'),
})

const CharacterExtractionSchema = z.object({
  characters: z
    .array(CharacterSchema)
    .describe('All identified characters from the story'),
  globalStyle: z
    .string()
    .optional()
    .describe(
      'Suggested visual style for all images (e.g., "photorealistic digital art", "cinematic", "illustration")'
    ),
})

const SYSTEM_PROMPT = `You are an expert at analyzing stories and extracting character information for visual consistency in AI-generated images.

Your task is to identify all recurring characters in a story and create detailed physical descriptions that will help maintain visual consistency across multiple AI-generated images.

IMPORTANT GUIDELINES:

1. CHARACTER IDENTIFICATION:
   - Identify the main characters (protagonist, antagonist, supporting, background)
   - Include characters mentioned multiple times across scenes
   - Use descriptive names if no name is given (e.g., "The Boss", "OP's Mother")
   - "OP" (Original Poster) is typically the protagonist in Reddit stories

2. PHYSICAL DESCRIPTIONS:
   - Be SPECIFIC and CONSISTENT - vague descriptions lead to inconsistent images
   - If details are not explicitly mentioned, INFER reasonable details that fit the story context
   - Use precise terms (not "tall" but "approximately 6'2" or "notably tall")
   - Include clothing that matches the story context
   - Consider the story's setting when inferring details

3. SCENE APPEARANCES:
   - Track which scenes (0-indexed) each character appears in
   - Include scenes where the character is mentioned even if not physically present
   - This helps apply character consistency only to relevant scenes

4. VISUAL STYLE:
   - Suggest a consistent visual style that fits the story's tone
   - Examples: "photorealistic, cinematic lighting", "digital illustration, warm tones", "dramatic, high contrast"

Remember: The goal is to ensure AI image generators produce consistent-looking characters across all scenes.`

function buildConsistencyPrompt(
  name: string,
  physicalDescription: z.infer<typeof PhysicalDescriptionSchema>
): string {
  const parts: string[] = []

  if (physicalDescription.age) parts.push(physicalDescription.age)
  if (physicalDescription.gender) parts.push(physicalDescription.gender)
  if (physicalDescription.skinTone) parts.push(`${physicalDescription.skinTone} skin`)
  if (physicalDescription.build) parts.push(`${physicalDescription.build} build`)
  if (physicalDescription.hairColor && physicalDescription.hairStyle) {
    parts.push(`${physicalDescription.hairColor} ${physicalDescription.hairStyle} hair`)
  } else if (physicalDescription.hairColor) {
    parts.push(`${physicalDescription.hairColor} hair`)
  } else if (physicalDescription.hairStyle) {
    parts.push(`${physicalDescription.hairStyle} hair`)
  }
  if (physicalDescription.eyeColor) parts.push(`${physicalDescription.eyeColor} eyes`)
  if (physicalDescription.facialFeatures) parts.push(physicalDescription.facialFeatures)
  if (physicalDescription.clothing) parts.push(`wearing ${physicalDescription.clothing}`)
  if (physicalDescription.accessories) parts.push(`with ${physicalDescription.accessories}`)

  return `${name}: ${parts.join(', ')}`
}

export interface CharacterExtractionInput {
  scenes: Array<{
    text: string
    imagePrompt: string
  }>
  sourceContent?: string
}

export async function extractCharacters(
  input: CharacterExtractionInput
): Promise<CharacterConfig> {
  const scenesText = input.scenes
    .map((scene, i) => `Scene ${i}: ${scene.text}`)
    .join('\n\n')

  const prompt = `Analyze this story and extract all characters with detailed physical descriptions for visual consistency.

${input.sourceContent ? `ORIGINAL SOURCE CONTENT:\n${input.sourceContent}\n\n` : ''}SCRIPT SCENES:
${scenesText}

Extract all recurring characters and provide detailed physical descriptions. For each character, infer physical details that would make sense for the story context, even if not explicitly stated. The descriptions will be used to maintain visual consistency across AI-generated images for each scene.`

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: CharacterExtractionSchema,
    system: SYSTEM_PROMPT,
    prompt,
  })

  const characters: CharacterDefinition[] = object.characters.map((char) => ({
    id: randomUUID(),
    name: char.name,
    role: char.role as CharacterRole,
    type: char.type as CharacterType,
    physicalDescription: char.physicalDescription,
    consistencyPrompt: buildConsistencyPrompt(char.name, char.physicalDescription),
    appearances: char.appearances,
  }))

  return {
    characters,
    globalStyle: object.globalStyle,
    extractedAt: new Date().toISOString(),
  }
}

export function regenerateConsistencyPrompt(character: CharacterDefinition): string {
  return buildConsistencyPrompt(character.name, character.physicalDescription)
}
