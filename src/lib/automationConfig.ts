import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'

const CONFIG_PATH = path.join(process.cwd(), '.automation.json')

const AutomationConfigSchema = z.object({
  defaults: z.object({
    voice: z
      .enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
      .default('nova'),
    imageProvider: z.enum(['dall-e', 'seedream']).default('dall-e'),
    aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
    videoQuality: z.enum(['low', 'medium', 'high']).default('medium'),
    titleStyle: z
      .enum([
        'curiosity',
        'dramatic',
        'emotional',
        'clickbait',
        'straightforward',
      ])
      .default('curiosity'),
  }),
  youtube: z.object({
    privacyStatus: z
      .enum(['private', 'unlisted', 'public'])
      .default('unlisted'),
    categoryId: z.string().default('24'),
    notifySubscribers: z.boolean().default(false),
  }),
})

export type AutomationConfig = z.infer<typeof AutomationConfigSchema>

const DEFAULT_CONFIG: AutomationConfig = {
  defaults: {
    voice: 'nova',
    imageProvider: 'dall-e',
    aspectRatio: '16:9',
    videoQuality: 'medium',
    titleStyle: 'curiosity',
  },
  youtube: {
    privacyStatus: 'unlisted',
    categoryId: '24',
    notifySubscribers: false,
  },
}

export async function loadAutomationConfig(): Promise<AutomationConfig> {
  try {
    const content = await fs.readFile(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(content)
    return AutomationConfigSchema.parse(parsed)
  } catch {
    return DEFAULT_CONFIG
  }
}
