import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type { CharacterConfig } from '../components/types'

const STORE_DIR = path.join(process.cwd(), '.script-store')

// ---------------------------------------------------------------------------
// Per-ID mutex to prevent race conditions on concurrent writes
// ---------------------------------------------------------------------------
const locks = new Map<string, Promise<void>>()

async function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const existing = locks.get(id) ?? Promise.resolve()
  let resolve: () => void
  const next = new Promise<void>((r) => {
    resolve = r
  })
  locks.set(id, next)
  await existing
  try {
    return await fn()
  } finally {
    resolve!()
    if (locks.get(id) === next) locks.delete(id)
  }
}

// ---------------------------------------------------------------------------
// Atomic write helper: write to a .tmp file then rename into place
// ---------------------------------------------------------------------------
async function atomicWriteFile(
  filePath: string,
  data: string,
): Promise<void> {
  const tmpPath = `${filePath}.tmp`
  await fs.writeFile(tmpPath, data)
  await fs.rename(tmpPath, filePath)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SceneMedia {
  audioPath?: string
  imagePath?: string
  duration?: number
}

export interface StoredScript {
  id: string
  createdAt: string
  redditUrl?: string
  script: {
    title: string
    description: string
    scenes: Array<{
      text: string
      imagePrompt: string
      durationHint: number
    }>
    totalDuration: number
  }
  characterConfig?: CharacterConfig
  audioGenerated?: boolean
  imagesGenerated?: boolean
  videoGenerated?: boolean
  videoPath?: string
  media?: {
    scenes: SceneMedia[]
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function ensureStoreDir(): Promise<void> {
  try {
    await fs.mkdir(STORE_DIR, { recursive: true })
  } catch {
    // Directory already exists
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function saveScript(
  script: StoredScript['script'],
  redditUrl?: string,
): Promise<string> {
  await ensureStoreDir()

  const id = randomUUID()
  const stored: StoredScript = {
    id,
    createdAt: new Date().toISOString(),
    redditUrl,
    script,
    audioGenerated: false,
  }

  const filePath = path.join(STORE_DIR, `${id}.json`)

  // Wrap in withLock even though a brand-new UUID is unlikely to collide,
  // so every write path consistently goes through the mutex.
  await withLock(id, async () => {
    await atomicWriteFile(filePath, JSON.stringify(stored, null, 2))
  })

  return id
}

export async function getScript(id: string): Promise<StoredScript | null> {
  try {
    const filePath = path.join(STORE_DIR, `${id}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as StoredScript
  } catch (err: unknown) {
    // "File not found" is the only expected error — return null.
    // Everything else (corrupted JSON, permission denied, etc.) is
    // a real problem that callers need to know about.
    if (isNodeError(err) && err.code === 'ENOENT') {
      return null
    }
    throw err
  }
}

export async function updateScript(
  id: string,
  updates: Partial<Omit<StoredScript, 'id' | 'createdAt'>>,
): Promise<boolean> {
  return withLock(id, async () => {
    const existing = await getScript(id)
    if (!existing) return false

    const updated: StoredScript = {
      ...existing,
      ...updates,
    }

    const filePath = path.join(STORE_DIR, `${id}.json`)
    await atomicWriteFile(filePath, JSON.stringify(updated, null, 2))

    return true
  })
}

export async function deleteScript(id: string): Promise<boolean> {
  return withLock(id, async () => {
    try {
      const filePath = path.join(STORE_DIR, `${id}.json`)
      await fs.unlink(filePath)
      return true
    } catch {
      return false
    }
  })
}

export async function listScripts(): Promise<StoredScript[]> {
  await ensureStoreDir()

  try {
    const files = await fs.readdir(STORE_DIR)
    const scripts: StoredScript[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(STORE_DIR, file), 'utf-8')
        scripts.push(JSON.parse(content) as StoredScript)
      }
    }

    return scripts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  } catch {
    return []
  }
}

// Clean up old scripts (older than 24 hours)
export async function cleanupOldScripts(): Promise<number> {
  const scripts = await listScripts()
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  let deleted = 0

  for (const script of scripts) {
    if (new Date(script.createdAt).getTime() < oneDayAgo) {
      await deleteScript(script.id)
      deleted++
    }
  }

  return deleted
}
