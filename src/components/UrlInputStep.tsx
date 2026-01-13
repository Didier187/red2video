import { Skeleton, SkeletonText } from './Skeleton'

interface UrlInputStepProps {
  inputUrl: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  error: Error | null
}

function LoadingSkeleton() {
  return (
    <div className="mt-6 pt-6 border-t border-[#e2e2e2] dark:border-[#444]">
      <div className="flex items-center gap-3 mb-4">
        <div className="animate-spin w-5 h-5 border-2 border-[#85d7ff] border-t-transparent rounded-full" />
        <span className="text-sm text-[#666] dark:text-[#aaa]">Fetching Reddit post...</span>
      </div>
      <Skeleton className="h-5 w-48 mb-3" />
      <Skeleton className="h-7 w-3/4 mb-4" />
      <SkeletonText lines={2} />
      <Skeleton className="h-4 w-32 mt-4" />
    </div>
  )
}

export function UrlInputStep({
  inputUrl,
  onInputChange,
  onSubmit,
  isLoading,
  error,
}: UrlInputStepProps) {
  return (
    <div className="atlas-card p-8 mb-6">
      <div className="corner-bl" />
      <div className="corner-br" />
      <p className="atlas-label mb-4">Step 01 / Fetch Reddit Post</p>
      <h2 className="font-display text-2xl mb-6">Enter Reddit URL</h2>
      <form onSubmit={onSubmit} className="flex gap-4">
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="https://reddit.com/r/..."
          className="atlas-input flex-1"
        />
        <button
          type="submit"
          disabled={isLoading || !inputUrl.trim()}
          className="atlas-btn atlas-btn-primary"
        >
          {isLoading ? 'Fetching...' : 'Fetch Post'}
        </button>
      </form>
      {error && (
        <p className="text-[#ff6e41] text-sm mt-4">{error.message}</p>
      )}
      {isLoading && <LoadingSkeleton />}
    </div>
  )
}
