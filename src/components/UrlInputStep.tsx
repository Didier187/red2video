interface UrlInputStepProps {
  inputUrl: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  error: Error | null
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
    </div>
  )
}
