import { useState, useEffect } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import type { ImageGenerationResult, AspectRatio } from './types'
import { AspectRatioSelector } from './AspectRatioSelector'
import { CostEstimate } from './CostEstimate'

interface ImageGenerationStepProps {
  sceneCount: number
  imageResult: ImageGenerationResult | undefined
  isPending: boolean
  error: Error | null
  aspectRatio: AspectRatio
  onAspectRatioChange: (ratio: AspectRatio) => void
  onGenerate: () => void
  onRetry?: () => void
}

const LOADING_MESSAGES = [
  'Connecting to DALL-E 3...',
  'Analyzing scene descriptions...',
  'Generating visual concepts...',
  'Rendering high-quality images...',
  'Applying artistic styles...',
  'Enhancing image details...',
  'Processing final touches...',
]

interface LoadingSpinnerProps {
  sceneCount: number
}

function LoadingSpinner({ sceneCount }: LoadingSpinnerProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [dots, setDots] = useState('')
  const [currentScene, setCurrentScene] = useState(1)

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 4000)

    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)

    // Simulate scene progress (images take longer ~8s per image)
    const sceneInterval = setInterval(() => {
      setCurrentScene((prev) => (prev < sceneCount ? prev + 1 : prev))
    }, 8000)

    return () => {
      clearInterval(messageInterval)
      clearInterval(dotsInterval)
      clearInterval(sceneInterval)
    }
  }, [sceneCount])

  const progress = Math.round((currentScene / sceneCount) * 100)

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative w-28 h-28 mb-6">
        {/* Background ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e2e2e2"
            className="dark:stroke-[#333]"
            strokeWidth="4"
          />
        </svg>
        {/* Progress ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#ff6e41"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${progress * 2.83} 283`}
            className="transition-all duration-700"
          />
        </svg>
        {/* Outer spinning ring */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
          style={{ animationDuration: '4s' }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="#85d7ff"
            strokeWidth="2"
            strokeDasharray="20 200"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
        {/* Inner spinning ring (reverse) */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
          style={{ animationDuration: '3s', animationDirection: 'reverse' }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="30"
            fill="none"
            stroke="#ff6e41"
            strokeWidth="2"
            strokeDasharray="15 150"
            strokeLinecap="round"
            opacity="0.4"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl">🎨</span>
          <span className="text-sm font-bold text-[#ff6e41]">{progress}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm mb-4">
        <div className="w-full bg-[#e2e2e2] dark:bg-[#333] rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-[#ff6e41] to-[#85d7ff] rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-xs text-[#999] dark:text-[#666]">
            Image {currentScene} of {sceneCount}
          </p>
          <p className="text-xs text-[#999] dark:text-[#666]">
            ~{Math.max(0, (sceneCount - currentScene) * 8)}s remaining
          </p>
        </div>
      </div>

      <p className="text-lg font-medium text-center">
        {LOADING_MESSAGES[messageIndex]}
        <span className="inline-block w-8 text-left">{dots}</span>
      </p>
      <p className="text-sm text-[#666] dark:text-[#999] mt-2">
        DALL-E 3 is creating stunning visuals for your video
      </p>

      {/* Scene indicators */}
      <div className="flex gap-2 mt-6 flex-wrap justify-center">
        {Array.from({ length: sceneCount }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              i < currentScene
                ? 'bg-[#ff6e41] scale-100'
                : i === currentScene - 1
                  ? 'bg-[#ff6e41] animate-pulse scale-125'
                  : 'bg-[#e2e2e2] dark:bg-[#333] scale-100'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export function ImageGenerationStep({
  sceneCount,
  imageResult,
  isPending,
  error,
  aspectRatio,
  onAspectRatioChange,
  onGenerate,
  onRetry,
}: ImageGenerationStepProps) {
  return (
    <div className="atlas-card p-8 mb-6">
      <div className="corner-bl" />
      <div className="corner-br" />
      <p className="atlas-label mb-4">Step 04 / Generate Images</p>

      {!isPending && !imageResult && (
        <>
          <p className="text-sm text-[#666] dark:text-[#aaa] mb-4">
            Generate DALL-E 3 images for all {sceneCount} scenes
          </p>

          <div className="mb-6">
            <p className="atlas-label mb-3">Video Format</p>
            <AspectRatioSelector
              selected={aspectRatio}
              onSelect={onAspectRatioChange}
              disabled={isPending}
            />
          </div>

          <div className="mb-6">
            <CostEstimate
              sceneCount={sceneCount}
              aspectRatio={aspectRatio}
              showDetails
            />
          </div>
        </>
      )}

      {isPending ? (
        <LoadingSpinner sceneCount={sceneCount} />
      ) : (
        <button
          onClick={onGenerate}
          disabled={isPending || !!imageResult}
          className="atlas-btn atlas-btn-accent"
        >
          {imageResult ? 'Images Generated' : 'Generate Images'}
        </button>
      )}

      {error && (
        <div className="mt-4 p-4 bg-[#fef2f2] dark:bg-[#2a1a1a] rounded-lg border border-[#fecaca] dark:border-[#dc2626]">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#dc2626] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-[#991b1b] dark:text-[#fca5a5] font-medium mb-1">
                Image generation failed
              </p>
              <p className="text-xs text-[#b91c1c] dark:text-[#f87171]">
                {error.message}
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-3 flex items-center gap-2 text-sm text-[#dc2626] hover:text-[#b91c1c] dark:text-[#f87171] dark:hover:text-[#fca5a5] transition-colors"
                >
                  <RotateCcw size={14} />
                  Try again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {imageResult && (
        <div className="mt-4 p-4 bg-[#f0fdf4] dark:bg-[#1a2e1a] rounded-lg border border-[#86efac] dark:border-[#22c55e]">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <p className="text-sm text-[#166534] dark:text-[#86efac]">
              {imageResult.images.length} high-quality images generated successfully
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
