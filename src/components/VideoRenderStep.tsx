import { useState, useEffect } from 'react'
import { Download, Link, Check } from 'lucide-react'
import type { VideoRenderResult } from './types'
import { VideoRenderProgress } from './VideoRenderProgress'

interface VideoRenderStepProps {
  scriptId: string
  scriptTitle: string
  sceneCount: number
  videoResult: VideoRenderResult | undefined
  isPending: boolean
  error: Error | null
  onRender: () => void
  onDownload: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

interface VideoReadySectionProps {
  scriptId: string
  videoResult: VideoRenderResult
  onDownload: () => void
}

function VideoReadySection({ scriptId, videoResult, onDownload }: VideoReadySectionProps) {
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const videoUrl = `/api/media/${scriptId}/video/${videoResult.fileName}`

  // Fetch file size on mount
  useEffect(() => {
    const fetchFileSize = async () => {
      try {
        const response = await fetch(videoUrl, { method: 'HEAD' })
        const contentLength = response.headers.get('content-length')
        if (contentLength) {
          setFileSize(parseInt(contentLength, 10))
        }
      } catch (err) {
        console.error('Failed to fetch file size:', err)
      }
    }
    fetchFileSize()
  }, [videoUrl])

  const handleCopyLink = async () => {
    try {
      const fullUrl = window.location.origin + videoUrl
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return (
    <div className="mt-4">
      <p className="atlas-label mb-4 text-[#85d7ff]">Video Ready</p>
      <video
        controls
        className="w-full rounded border border-[#e2e2e2] dark:border-[#444] mb-4"
        src={videoUrl}
      />

      {/* Video info */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm text-[#666] dark:text-[#aaa]">
        <span>Duration: {Math.round(videoResult.durationSeconds)}s</span>
        {fileSize && <span>Size: {formatFileSize(fileSize)}</span>}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onDownload}
          className="atlas-btn atlas-btn-accent flex items-center gap-2"
        >
          <Download size={16} />
          Download Video
          {fileSize && (
            <span className="text-xs opacity-75">({formatFileSize(fileSize)})</span>
          )}
        </button>
        <button
          onClick={handleCopyLink}
          className="atlas-btn atlas-btn-secondary flex items-center gap-2"
        >
          {copied ? (
            <>
              <Check size={16} className="text-[#22c55e]" />
              Copied!
            </>
          ) : (
            <>
              <Link size={16} />
              Copy Link
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export function VideoRenderStep({
  scriptId,
  scriptTitle,
  sceneCount,
  videoResult,
  isPending,
  error,
  onRender,
  onDownload,
}: VideoRenderStepProps) {
  return (
    <div className="atlas-card p-8 mb-6">
      <div className="corner-bl" />
      <div className="corner-br" />
      <p className="atlas-label mb-4">Step 05 / Render Video</p>

      {!isPending && !videoResult && (
        <>
          <p className="text-sm text-[#666] dark:text-[#aaa] mb-6">
            Combine all assets into a final video using Remotion
          </p>
          <button onClick={onRender} className="atlas-btn atlas-btn-primary">
            Render Video
          </button>
        </>
      )}

      {isPending && (
        <VideoRenderProgress totalScenes={sceneCount} scriptId={scriptId} />
      )}

      {error && (
        <p className="text-[#ff6e41] text-sm mt-4">{error.message}</p>
      )}

      {videoResult && (
        <VideoReadySection
          scriptId={scriptId}
          videoResult={videoResult}
          onDownload={onDownload}
        />
      )}
    </div>
  )
}
