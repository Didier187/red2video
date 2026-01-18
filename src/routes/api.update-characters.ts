import { createFileRoute } from '@tanstack/react-router'
import { getScript, updateScript } from '../lib/scriptStore'
import { regenerateConsistencyPrompt } from '../agents/characterExtractor'
import type { CharacterDefinition } from '../components/types'

interface UpdateCharactersRequest {
  scriptId: string
  characters: CharacterDefinition[]
  globalStyle?: string
}

export const Route = createFileRoute('/api/update-characters')({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        try {
          const body: UpdateCharactersRequest = await request.json()

          if (!body.scriptId) {
            return Response.json({ error: 'Missing scriptId' }, { status: 400 })
          }

          if (!body.characters) {
            return Response.json(
              { error: 'Missing characters array' },
              { status: 400 }
            )
          }

          const storedScript = await getScript(body.scriptId)
          if (!storedScript) {
            return Response.json(
              { error: `Script not found: ${body.scriptId}` },
              { status: 404 }
            )
          }

          // Regenerate consistency prompts for each character based on updated descriptions
          const updatedCharacters = body.characters.map((char) => ({
            ...char,
            consistencyPrompt: regenerateConsistencyPrompt(char),
          }))

          const characterConfig = {
            characters: updatedCharacters,
            globalStyle: body.globalStyle ?? storedScript.characterConfig?.globalStyle,
            extractedAt: storedScript.characterConfig?.extractedAt || new Date().toISOString(),
          }

          await updateScript(body.scriptId, {
            characterConfig,
          })

          return Response.json(characterConfig)
        } catch (error) {
          console.error('Character update error:', error)
          return Response.json(
            { error: `Failed to update characters: ${error}` },
            { status: 500 }
          )
        }
      },
    },
  },
})
