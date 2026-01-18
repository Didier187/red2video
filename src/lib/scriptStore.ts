import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type { CharacterConfig } from '../components/types'

const STORE_DIR = path.join(process.cwd(), '.script-store')

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

async function ensureStoreDir(): Promise<void> {
  try {
    await fs.mkdir(STORE_DIR, { recursive: true })
  } catch {
    // Directory already exists
  }
}

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
  await fs.writeFile(filePath, JSON.stringify(stored, null, 2))

  return id
}

export async function getScript(id: string): Promise<StoredScript | null> {
  try {
    const filePath = path.join(STORE_DIR, `${id}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as StoredScript
  } catch {
    return null
  }
}

export async function updateScript(
  id: string,
  updates: Partial<Omit<StoredScript, 'id' | 'createdAt'>>,
): Promise<boolean> {
  const existing = await getScript(id)
  if (!existing) return false

  const updated: StoredScript = {
    ...existing,
    ...updates,
  }

  const filePath = path.join(STORE_DIR, `${id}.json`)
  await fs.writeFile(filePath, JSON.stringify(updated, null, 2))

  return true
}

export async function deleteScript(id: string): Promise<boolean> {
  try {
    const filePath = path.join(STORE_DIR, `${id}.json`)
    await fs.unlink(filePath)
    return true
  } catch {
    return false
  }
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
