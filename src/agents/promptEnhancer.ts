import type { CharacterConfig, CharacterDefinition } from '../components/types'

/**
 * Enhances an image prompt with character consistency information
 */
export function enhancePromptWithCharacters(
  basePrompt: string,
  characterConfig: CharacterConfig,
  sceneIndex: number
): string {
  // Find characters that appear in this scene
  const sceneCharacters = characterConfig.characters.filter((char) =>
    char.appearances.includes(sceneIndex)
  )

  if (sceneCharacters.length === 0) {
    // No characters in this scene, just add global style if present
    if (characterConfig.globalStyle) {
      return `[VISUAL STYLE: ${characterConfig.globalStyle}]\n\n${basePrompt}`
    }
    return basePrompt
  }

  // Build the enhanced prompt
  const parts: string[] = []

  // Add global visual style
  if (characterConfig.globalStyle) {
    parts.push(`[VISUAL STYLE: ${characterConfig.globalStyle}]`)
  }

  // Add character descriptions
  const characterDescriptions = sceneCharacters
    .map((char) => formatCharacterForPrompt(char))
    .join('\n')

  parts.push(`[CHARACTERS IN SCENE:\n${characterDescriptions}]`)

  // Add the original scene prompt
  parts.push(`SCENE: ${basePrompt}`)

  // Add consistency reminder
  parts.push(
    'IMPORTANT: Maintain exact character appearances as described above for visual consistency.'
  )

  return parts.join('\n\n')
}

/**
 * Formats a single character definition for inclusion in an image prompt
 */
function formatCharacterForPrompt(character: CharacterDefinition): string {
  const roleLabel = getRoleLabel(character.role)
  return `- ${roleLabel}: ${character.consistencyPrompt}`
}

/**
 * Gets a human-readable role label
 */
function getRoleLabel(role: CharacterDefinition['role']): string {
  switch (role) {
    case 'protagonist':
      return 'MAIN CHARACTER'
    case 'antagonist':
      return 'ANTAGONIST'
    case 'supporting':
      return 'SUPPORTING'
    case 'background':
      return 'BACKGROUND'
    default:
      return 'CHARACTER'
  }
}

/**
 * Creates a summary of character consistency for display
 */
export function getCharacterSummary(characterConfig: CharacterConfig): string {
  if (characterConfig.characters.length === 0) {
    return 'No characters detected'
  }

  const protagonists = characterConfig.characters.filter(
    (c) => c.role === 'protagonist'
  )
  const others = characterConfig.characters.filter((c) => c.role !== 'protagonist')

  const parts: string[] = []

  if (protagonists.length > 0) {
    parts.push(
      `Main: ${protagonists.map((c) => c.name).join(', ')}`
    )
  }

  if (others.length > 0) {
    parts.push(`+${others.length} other${others.length > 1 ? 's' : ''}`)
  }

  return parts.join(' | ')
}

/**
 * Gets characters appearing in a specific scene
 */
export function getCharactersInScene(
  characterConfig: CharacterConfig,
  sceneIndex: number
): CharacterDefinition[] {
  return characterConfig.characters.filter((char) =>
    char.appearances.includes(sceneIndex)
  )
}
