import { useState, useEffect, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  startAutomation,
  getAutomationProgress,
  getYouTubeAuthStatus,
  startYouTubeAuth,
  type PipelineProgressResponse,
  type AutomateParams,
} from './api'
import type { Voice, ImageProvider, AspectRatio } from './types'

const STAGE_LABELS: Record<string, string> = {
  starting: 'Starting...',
  fetch: 'Fetching Reddit post',
  script: 'Generating script',
  characters: 'Extracting characters',
  audio: 'Generating audio',
  images: 'Generating images',
  render: 'Rendering video',
  metadata: 'Generating metadata',
  upload: 'Uploading to YouTube',
  complete: 'Complete!',
}

export function AutomationPanel() {
  const [url, setUrl] = useState('')
  const [voice, setVoice] = useState<Voice>('nova')
  const [imageProvider, setImageProvider] = useState<ImageProvider>('dall-e')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9')
  const [uploadToYouTube, setUploadToYouTube] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const [pipelineId, setPipelineId] = useState<string | null>(null)
  const [progress, setProgress] = useState<PipelineProgressResponse | null>(
    null,
  )
  const [youtubeAuthorized, setYoutubeAuthorized] = useState<boolean | null>(
    null,
  )

  // Check YouTube auth status on mount
  useEffect(() => {
    getYouTubeAuthStatus()
      .then((s) => setYoutubeAuthorized(s.authorized))
      .catch(() => setYoutubeAuthorized(false))
  }, [])

  const startMutation = useMutation({
    mutationFn: startAutomation,
    onSuccess: (data) => {
      setPipelineId(data.pipelineId)
      setProgress(null)
    },
  })

  const authMutation = useMutation({
    mutationFn: startYouTubeAuth,
    onSuccess: (data) => {
      if (data.authUrl) {
        window.open(data.authUrl, '_blank')
      }
      if (data.authorized) {
        setYoutubeAuthorized(true)
      }
    },
  })

  // Poll for progress
  const pollProgress = useCallback(async () => {
    if (!pipelineId) return
    try {
      const p = await getAutomationProgress(pipelineId)
      setProgress(p)
      if (p.stage === 'complete' || p.error) {
        setPipelineId(null) // Stop polling
        if (p.stage === 'complete') {
          // Re-check YouTube auth after completion (tokens may have been created)
          getYouTubeAuthStatus()
            .then((s) => setYoutubeAuthorized(s.authorized))
            .catch(() => {})
        }
      }
    } catch {
      // Ignore polling errors
    }
  }, [pipelineId])

  useEffect(() => {
    if (!pipelineId) return
    // Poll immediately, then every 2 seconds
    pollProgress()
    const interval = setInterval(pollProgress, 2000)
    return () => clearInterval(interval)
  }, [pipelineId, pollProgress])

  const isRunning = !!pipelineId
  const isComplete = progress?.stage === 'complete'
  const hasError = !!progress?.error

  const handleStart = () => {
    if (!url.trim()) return
    const params: AutomateParams = {
      url: url.trim(),
      voice,
      imageProvider,
      aspectRatio,
      uploadToYouTube: uploadToYouTube && youtubeAuthorized === true,
    }
    startMutation.mutate(params)
  }

  const handleReset = () => {
    setPipelineId(null)
    setProgress(null)
    startMutation.reset()
    setUrl('')
  }

  return (
    <div className="atlas-card p-8 mb-6 border-2 border-dashed border-[#85d7ff]/30 dark:border-[#85d7ff]/20">
      <div className="corner-bl" />
      <div className="corner-br" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="atlas-label mb-1">Autopilot</p>
          <h2 className="font-display text-2xl">Full Pipeline</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isRunning && !isComplete && (
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="atlas-btn text-xs"
            >
              {showSettings ? 'Hide Settings' : 'Settings'}
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-[#666] dark:text-[#aaa] mb-5">
        Paste a Reddit URL and run the entire pipeline automatically — fetch,
        script, audio, images, render, and optionally upload to YouTube.
      </p>

      {/* Settings panel */}
      {showSettings && !isRunning && !isComplete && (
        <div className="grid grid-cols-2 gap-4 mb-5 p-4 rounded-lg bg-[#f8f8f8] dark:bg-[#1a1a1a]">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[#666] dark:text-[#aaa] uppercase tracking-wider">
              Voice
            </span>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value as Voice)}
              className="atlas-input text-sm"
            >
              <option value="nova">Nova</option>
              <option value="alloy">Alloy</option>
              <option value="echo">Echo</option>
              <option value="fable">Fable</option>
              <option value="onyx">Onyx</option>
              <option value="shimmer">Shimmer</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[#666] dark:text-[#aaa] uppercase tracking-wider">
              Image Provider
            </span>
            <select
              value={imageProvider}
              onChange={(e) =>
                setImageProvider(e.target.value as ImageProvider)
              }
              className="atlas-input text-sm"
            >
              <option value="dall-e">DALL-E 3</option>
              <option value="seedream">SeeDream</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[#666] dark:text-[#aaa] uppercase tracking-wider">
              Aspect Ratio
            </span>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              className="atlas-input text-sm"
            >
              <option value="16:9">16:9 Landscape</option>
              <option value="9:16">9:16 Portrait</option>
              <option value="1:1">1:1 Square</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[#666] dark:text-[#aaa] uppercase tracking-wider">
              YouTube Upload
            </span>
            <div className="flex items-center gap-3 h-9">
              <button
                type="button"
                onClick={() => setUploadToYouTube(!uploadToYouTube)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  uploadToYouTube
                    ? 'bg-[#85d7ff]'
                    : 'bg-[#ccc] dark:bg-[#444]'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    uploadToYouTube ? 'translate-x-5' : ''
                  }`}
                />
              </button>
              <span className="text-sm text-[#666] dark:text-[#aaa]">
                {uploadToYouTube ? 'On (unlisted)' : 'Off'}
              </span>
            </div>
          </label>

          {uploadToYouTube && youtubeAuthorized === false && (
            <div className="col-span-2">
              <button
                type="button"
                onClick={() => authMutation.mutate()}
                disabled={authMutation.isPending}
                className="atlas-btn atlas-btn-primary text-sm"
              >
                {authMutation.isPending
                  ? 'Opening auth...'
                  : 'Authorize YouTube'}
              </button>
              <p className="text-xs text-[#666] dark:text-[#aaa] mt-1">
                Opens Google OAuth in a new tab. One-time setup.
              </p>
            </div>
          )}
          {uploadToYouTube && youtubeAuthorized === true && (
            <p className="col-span-2 text-xs text-[#85d7ff]">
              YouTube authorized
            </p>
          )}
        </div>
      )}

      {/* URL input + start button */}
      {!isRunning && !isComplete && (
        <div className="flex gap-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://reddit.com/r/..."
            className="atlas-input flex-1"
            disabled={startMutation.isPending}
          />
          <button
            type="button"
            onClick={handleStart}
            disabled={!url.trim() || startMutation.isPending}
            className="atlas-btn atlas-btn-primary whitespace-nowrap"
          >
            {startMutation.isPending ? 'Starting...' : 'Run Full Pipeline'}
          </button>
        </div>
      )}

      {startMutation.error && (
        <p className="text-[#ff6e41] text-sm mt-3">
          {startMutation.error.message}
        </p>
      )}

      {/* Progress display */}
      {(isRunning || isComplete || hasError) && progress && (
        <div className="mt-5">
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-3">
            {!isComplete && !hasError && (
              <div className="animate-spin w-4 h-4 border-2 border-[#85d7ff] border-t-transparent rounded-full" />
            )}
            {isComplete && (
              <div className="w-4 h-4 rounded-full bg-[#85d7ff] flex items-center justify-center text-[10px] text-[#1a1a1a]">
                ✓
              </div>
            )}
            {hasError && (
              <div className="w-4 h-4 rounded-full bg-[#ff6e41] flex items-center justify-center text-[10px] text-white">
                ✕
              </div>
            )}
            <span className="text-sm font-mono">
              {STAGE_LABELS[progress.stage] || progress.message}
            </span>
            <span className="text-xs text-[#666] dark:text-[#aaa] ml-auto">
              Step {progress.step}/{progress.totalSteps}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-[#e2e2e2] dark:bg-[#333] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                hasError ? 'bg-[#ff6e41]' : 'bg-[#85d7ff]'
              }`}
              style={{ width: `${progress.progress}%` }}
            />
          </div>

          {/* Stage indicators */}
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              'fetch',
              'script',
              'characters',
              'audio',
              'images',
              'render',
              'metadata',
              ...(uploadToYouTube ? ['upload'] : []),
            ].map((stage, i) => {
              const stepNum = i + 1
              const isCurrent = progress.step === stepNum
              const isDone = progress.step > stepNum || isComplete
              return (
                <span
                  key={stage}
                  className={`text-xs px-2 py-1 rounded font-mono ${
                    isDone
                      ? 'bg-[#85d7ff]/20 text-[#85d7ff]'
                      : isCurrent
                        ? 'bg-[#ff6e41]/20 text-[#ff6e41]'
                        : 'bg-[#e2e2e2] dark:bg-[#333] text-[#999]'
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </span>
              )
            })}
          </div>

          {/* Error message */}
          {hasError && (
            <p className="text-[#ff6e41] text-sm mt-3">{progress.error}</p>
          )}

          {/* Result */}
          {isComplete && progress.result && (
            <div className="mt-4 p-4 rounded-lg bg-[#f8f8f8] dark:bg-[#1a1a1a]">
              <p className="text-sm font-mono mb-2">
                Video ready: {progress.result.scriptId}
              </p>
              {progress.result.youtubeUrl && (
                <a
                  href={progress.result.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#85d7ff] underline"
                >
                  View on YouTube
                </a>
              )}
              <div className="flex gap-3 mt-3">
                <a
                  href={`/api/media/${progress.result.scriptId}/video/video.mp4`}
                  download
                  className="atlas-btn atlas-btn-primary text-sm"
                >
                  Download Video
                </a>
                <button
                  type="button"
                  onClick={handleReset}
                  className="atlas-btn text-sm"
                >
                  Run Another
                </button>
              </div>
            </div>
          )}

          {/* Reset on error */}
          {hasError && (
            <button
              type="button"
              onClick={handleReset}
              className="atlas-btn text-sm mt-3"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  )
}
