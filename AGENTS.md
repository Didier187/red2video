# AGENTS.md - Guidelines for AI Coding Agents

## Overview

red2video is a React/TypeScript application that converts Reddit posts to videos using TTS audio and AI-generated images. Built with TanStack Start, Remotion, and OpenAI.

## Commands

### Development

```bash
npm run dev          # Start dev server on port 3000
npm run preview      # Preview production build
```

### Build & Type Checking

```bash
npm run build        # Build for production
npx tsc --noEmit     # Type-check without emitting files
```

### Linting & Formatting

```bash
npm run lint         # Run ESLint
npm run format       # Check Prettier formatting
npm run check        # Prettier write + ESLint fix
```

### Testing

```bash
npm test             # Run all tests with vitest
npx vitest run --reporter=verbose  # Verbose output
npx vitest run src/agents/audioGenerator.test.ts  # Run single file
npx vitest run -t "test name"  # Run single test by name
```

## Code Style Guidelines

### Imports

- Use named imports: `import { foo } from 'bar'`
- Group imports: external -> internal -> relative paths
- Separate groups with blank lines

```typescript
import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { promises as fs } from 'fs'
import { generateAudio } from '../agents/audioGenerator'
import { getScript } from '../lib/scriptStore'
```

### TypeScript

- Enable `strict: true` in tsconfig
- Use explicit types for function parameters and return types
- Avoid `any`; use `unknown` when type is truly uncertain
- Mark optional fields with `?`
- Use `Record<K, V>` for map types, not `{ [key: string]: V }`

```typescript
interface AudioOptions {
  voice?: Voice
  model?: AudioModel
  speed?: number
}
export async function generateAudio(
  text: string,
  options: AudioOptions = {},
): Promise<Buffer>
```

### Naming Conventions

- **Interfaces/Types**: PascalCase (e.g., `AudioGenerationOptions`)
- **Functions/variables**: camelCase (e.g., `generateAudioForText`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MEDIA_DIR`)
- **Files**: kebab-case for utilities, PascalCase for components
- **Enums**: Avoid; use union types instead

### Formatting

- Use Prettier for all formatting
- Trailing commas in multi-line objects, arrays, and function calls
- Single-line destructuring with defaults:

```typescript
const { voice = 'nova', speed = 1.0 } = options
```

- Multi-line function parameters with trailing comma:

```typescript
await generateAudio(text, { voice, model, speed })
```

### Error Handling

- Use try/catch in async route handlers
- Return appropriate HTTP status codes (404, 400, 500)
- Log errors with `console.error`
- Never expose internal errors to clients

```typescript
try {
  const result = await process()
  return Response.json(result)
} catch (error) {
  console.error('Processing failed:', error)
  return Response.json({ error: 'Failed to process' }, { status: 500 })
}
```

### Async/Await

- Always handle promise rejections
- Use `await` for sequential async operations
- Parallelize independent async calls with `Promise.all`
- Destructure async results:

```typescript
const { buffer, duration } = await generateAudio(text)
```

### React Components

- Use function components with hooks
- Prefer composition over abstraction
- Define prop interfaces at component level

```typescript
interface Props {
  title: string
  onComplete?: () => void
}

export function VideoRenderStep({ title, onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  // ...
}
```

### Project Structure

```
src/
  agents/        # Business logic (audio, image, script generation)
  components/    # React UI components
  lib/           # Utilities (stores, database wrappers)
  routes/        # API endpoints and pages
  utils/         # Helper functions
  video/         # Remotion video composition
```

### Miscellaneous

- No comments unless explaining complex logic
- Console.log for debugging; remove before committing
- Use `path.join` for file paths (handles OS differences)
- Use `process.cwd()` for absolute paths
- Delete temp files after use
