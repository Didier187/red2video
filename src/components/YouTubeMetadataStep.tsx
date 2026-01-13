import { useState } from 'react'
import { AlertCircle, RotateCcw, Copy, Check, Sparkles } from 'lucide-react'
import type { YouTubeMetadata, TitleStyle } from './types'

interface YouTubeMetadataStepProps {
  metadata: YouTubeMetadata | undefined
  isPending: boolean
  error: Error | null
  onGenerate: () => void
  onRetry?: () => void
}

const STYLE_LABELS: Record<TitleStyle, { label: string; icon: string }> = {
  curiosity: { label: 'Curiosity', icon: '🤔' },
  dramatic: { label: 'Dramatic', icon: '🎭' },
  emotional: { label: 'Emotional', icon: '💖' },
  clickbait: { label: 'Clickbait', icon: '🔥' },
  straightforward: { label: 'Direct', icon: '📝' },
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-[#85d7ff] hover:text-[#6bc4f0] transition-colors"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative w-20 h-20 mb-4">
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
          style={{ animationDuration: '3s' }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#85d7ff"
            strokeWidth="4"
            strokeDasharray="70 200"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-[#ff6e41]" />
        </div>
      </div>
      <p className="text-lg font-medium">Crafting viral titles...</p>
      <p className="text-sm text-[#666] dark:text-[#999] mt-2">
        AI is optimizing for maximum clicks
      </p>
    </div>
  )
}

export function YouTubeMetadataStep({
  metadata,
  isPending,
  error,
  onGenerate,
  onRetry,
}: YouTubeMetadataStepProps) {
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0)

  return (
    <div className="atlas-card p-8 mb-6">
      <div className="corner-bl" />
      <div className="corner-br" />
      <p className="atlas-label mb-4">Step 06 / Optimize for YouTube</p>

      {!isPending && !metadata && (
        <>
          <p className="text-sm text-[#666] dark:text-[#aaa] mb-4">
            Generate SEO-optimized titles, descriptions, and tags to maximize views
          </p>
          <button
            onClick={onGenerate}
            className="atlas-btn atlas-btn-accent"
          >
            Generate Metadata
          </button>
        </>
      )}

      {isPending && <LoadingSpinner />}

      {error && (
        <div className="mt-4 p-4 bg-[#fef2f2] dark:bg-[#2a1a1a] rounded-lg border border-[#fecaca] dark:border-[#dc2626]">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#dc2626] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-[#991b1b] dark:text-[#fca5a5] font-medium mb-1">
                Metadata generation failed
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

      {metadata && (
        <div className="space-y-6">
          {/* Title Options */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="atlas-label">Select a Title</p>
              <CopyButton
                text={metadata.titles[selectedTitleIndex]?.title || ''}
                label="Copy title"
              />
            </div>
            <div className="space-y-2">
              {metadata.titles.map((option, index) => {
                const styleInfo = STYLE_LABELS[option.style]
                const isSelected = selectedTitleIndex === index
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedTitleIndex(index)}
                    className={`
                      w-full text-left p-3 rounded-lg border-2 transition-all
                      ${
                        isSelected
                          ? 'border-[#85d7ff] bg-[#85d7ff]/10'
                          : 'border-[#e2e2e2] dark:border-[#444] hover:border-[#85d7ff]/50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0">{styleInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {option.title}
                        </p>
                        <p className="text-xs text-[#999] dark:text-[#666] mt-1">
                          {styleInfo.label} style
                          {index === 0 && (
                            <span className="ml-2 text-[#ff6e41]">
                              Recommended
                            </span>
                          )}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-[#85d7ff] shrink-0 mt-2" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="atlas-label">Description</p>
              <CopyButton text={metadata.description} label="Copy description" />
            </div>
            <div className="p-4 bg-[#f8f8f8] dark:bg-[#1a1a1a] rounded-lg border border-[#e2e2e2] dark:border-[#333]">
              <pre className="text-sm whitespace-pre-wrap font-sans text-[#333] dark:text-[#ccc]">
                {metadata.description}
              </pre>
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="atlas-label">Tags ({metadata.tags.length})</p>
              <CopyButton text={metadata.tags.join(', ')} label="Copy tags" />
            </div>
            <div className="flex flex-wrap gap-2">
              {metadata.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-xs bg-[#e2e2e2] dark:bg-[#333] rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="atlas-label">Hashtags</p>
              <CopyButton
                text={metadata.hashtags.map(h => `#${h}`).join(' ')}
                label="Copy hashtags"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {metadata.hashtags.map((hashtag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-xs bg-[#85d7ff]/20 text-[#0a6e9e] dark:text-[#85d7ff] rounded-full"
                >
                  #{hashtag}
                </span>
              ))}
            </div>
          </div>

          {/* Success message */}
          <div className="p-4 bg-[#f0fdf4] dark:bg-[#1a2e1a] rounded-lg border border-[#86efac] dark:border-[#22c55e]">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <p className="text-sm text-[#166534] dark:text-[#86efac]">
                YouTube metadata generated! Copy what you need above.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
