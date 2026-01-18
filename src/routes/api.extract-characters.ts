import { createFileRoute } from '@tanstack/react-router'
import { extractCharacters } from '../agents/characterExtractor'
import { getScript, updateScript } from '../lib/scriptStore'

interface ExtractCharactersRequest {
  scriptId: string
  sourceContent?: string
}

export const Route = createFileRoute('/api/extract-characters')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: ExtractCharactersRequest = await request.json()

          if (!body.scriptId) {
            return Response.json({ error: 'Missing scriptId' }, { status: 400 })
          }

          const storedScript = await getScript(body.scriptId)
          if (!storedScript) {
            return Response.json(
              { error: `Script not found: ${body.scriptId}` },
              { status: 404 }
            )
          }

          const characterConfig = await extractCharacters({
            scenes: storedScript.script.scenes,
            sourceContent: body.sourceContent,
          })

          // Save character config to script store
          await updateScript(body.scriptId, {
            characterConfig,
          })

          return Response.json(characterConfig)
        } catch (error) {
          console.error('Character extraction error:', error)
          return Response.json(
            { error: `Failed to extract characters: ${error}` },
            { status: 500 }
          )
        }
      },
    },
  },
})
