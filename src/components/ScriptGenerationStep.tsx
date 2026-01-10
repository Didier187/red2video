import { useState, useEffect } from 'react'
import type { ScriptContent, YouTubeScript } from './types'

interface ScriptGenerationStepProps {
  data: ScriptContent
  script: YouTubeScript | undefined
  isPending: boolean
  error: Error | null
  onGenerate: () => void
}

const LOADING_MESSAGES = [
  'Analyzing Reddit post content...',
  'Identifying key story elements...',
  'Crafting engaging narrative...',
  'Generating scene breakdowns...',
  'Optimizing for viewer engagement...',
  'Adding dramatic pauses...',
  'Polishing the script...',
]

function LoadingSpinner() {
  const [messageIndex, setMessageIndex] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 3000)

    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)

    return () => {
      clearInterval(messageInterval)
      clearInterval(dotsInterval)
    }
  }, [])

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative w-20 h-20 mb-6">
        {/* Outer ring */}
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
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#ff6e41"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="70 213"
            className="animate-spin origin-center"
            style={{ animationDuration: '1.5s' }}
          />
        </svg>
        {/* Inner spinning ring */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
          style={{ animationDuration: '2s', animationDirection: 'reverse' }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="30"
            fill="none"
            stroke="#85d7ff"
            strokeWidth="3"
            strokeDasharray="40 150"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">📝</span>
        </div>
      </div>

      <p className="text-lg font-medium text-center">
        {LOADING_MESSAGES[messageIndex]}
        <span className="inline-block w-8 text-left">{dots}</span>
      </p>
      <p className="text-sm text-[#666] dark:text-[#999] mt-2">
        AI is crafting your video script
      </p>
    </div>
  )
}

export function ScriptGenerationStep({
  data,
  script,
  isPending,
  error,
  onGenerate,
}: ScriptGenerationStepProps) {
  return (
    <div className="atlas-card p-8 mb-6">
      <div className="corner-bl" />
      <div className="corner-br" />
      <p className="atlas-label mb-4">Step 02 / Generate Script</p>

      {!isPending && (
        <div className="mb-6">
          <p className="atlas-label mb-2">Post by u/{data.post.author}</p>
          <h3 className="font-display text-xl mb-2">{data.post.title}</h3>
          {data.post.body && (
            <p className="text-sm text-[#666] dark:text-[#aaa] line-clamp-3">
              {data.post.body}
            </p>
          )}
          <p className="text-xs text-[#999] dark:text-[#777] mt-2">
            {data.comments.length} comments extracted
          </p>
        </div>
      )}

      {isPending ? (
        <LoadingSpinner />
      ) : (
        <button
          onClick={onGenerate}
          disabled={isPending || !!script}
          className="atlas-btn atlas-btn-accent"
        >
          {script ? 'Script Generated' : 'Generate Script'}
        </button>
      )}

      {error && (
        <p className="text-[#ff6e41] text-sm mt-4">{error.message}</p>
      )}

      {script && (
        <div className="mt-6 pt-6 border-t border-[#e2e2e2] dark:border-[#444]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="atlas-label mb-1">Generated Title</p>
              <h4 className="font-display text-lg">{script.title}</h4>
            </div>
            <div className="text-right">
              <p className="atlas-label mb-1">Duration</p>
              <p className="text-xl font-display text-[#85d7ff]">
                {script.totalDuration}s
              </p>
            </div>
          </div>
          <p className="text-sm text-[#666] dark:text-[#aaa]">
            {script.description}
          </p>
          <p className="text-xs text-[#999] dark:text-[#777] mt-2">
            {script.scenes.length} scenes created
          </p>
        </div>
      )}
    </div>
  )
}
