import { DollarSign } from 'lucide-react'
import type { AspectRatio } from './types'

interface CostEstimateProps {
  sceneCount: number
  aspectRatio: AspectRatio
  showDetails?: boolean
}

// Approximate API costs (as of 2024)
const COSTS = {
  claude: {
    inputPer1M: 3.0, // $3 per 1M input tokens
    outputPer1M: 15.0, // $15 per 1M output tokens
    estimatedInputTokens: 2000, // Average for Reddit post
    estimatedOutputTokens: 500, // Average for script
  },
  tts: {
    perChar: 0.000015, // $15 per 1M characters
    avgCharsPerScene: 200,
  },
  dalle: {
    standard: {
      '1024x1024': 0.04,
      '1024x1792': 0.08,
      '1792x1024': 0.08,
    },
    hd: {
      '1024x1024': 0.08,
      '1024x1792': 0.12,
      '1792x1024': 0.12,
    },
  },
}

const ASPECT_RATIO_TO_SIZE: Record<AspectRatio, '1792x1024' | '1024x1792' | '1024x1024'> = {
  '16:9': '1792x1024',
  '9:16': '1024x1792',
  '1:1': '1024x1024',
}

export function calculateCosts(sceneCount: number, aspectRatio: AspectRatio) {
  const size = ASPECT_RATIO_TO_SIZE[aspectRatio]

  // Claude cost (script generation)
  const claudeInputCost = (COSTS.claude.estimatedInputTokens / 1_000_000) * COSTS.claude.inputPer1M
  const claudeOutputCost = (COSTS.claude.estimatedOutputTokens / 1_000_000) * COSTS.claude.outputPer1M
  const claudeCost = claudeInputCost + claudeOutputCost

  // TTS cost (audio generation)
  const totalChars = sceneCount * COSTS.tts.avgCharsPerScene
  const ttsCost = totalChars * COSTS.tts.perChar

  // DALL-E cost (image generation)
  const dallePerImage = COSTS.dalle.standard[size]
  const dalleCost = sceneCount * dallePerImage

  const totalCost = claudeCost + ttsCost + dalleCost

  return {
    claude: claudeCost,
    tts: ttsCost,
    dalle: dalleCost,
    total: totalCost,
  }
}

export function CostEstimate({ sceneCount, aspectRatio, showDetails = false }: CostEstimateProps) {
  const costs = calculateCosts(sceneCount, aspectRatio)

  return (
    <div className="bg-[#f8f8f8] dark:bg-[#1a1a1a] rounded-lg p-4 border border-[#e2e2e2] dark:border-[#333]">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign size={16} className="text-[#85d7ff]" />
        <p className="atlas-label">Estimated Cost</p>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-display text-[#ff6e41]">
          ${costs.total.toFixed(2)}
        </span>
        <span className="text-sm text-[#999] dark:text-[#777]">USD</span>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-[#e2e2e2] dark:border-[#333] space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[#666] dark:text-[#aaa]">Script (Claude)</span>
            <span className="text-[#999]">${costs.claude.toFixed(3)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#666] dark:text-[#aaa]">Audio (TTS x{sceneCount})</span>
            <span className="text-[#999]">${costs.tts.toFixed(3)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#666] dark:text-[#aaa]">Images (DALL-E x{sceneCount})</span>
            <span className="text-[#999]">${costs.dalle.toFixed(2)}</span>
          </div>
        </div>
      )}

      <p className="text-xs text-[#999] dark:text-[#666] mt-2">
        Based on {sceneCount} scenes. Actual costs may vary.
      </p>
    </div>
  )
}
