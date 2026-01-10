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
        <div className="mt-4">
          <p className="atlas-label mb-4 text-[#85d7ff]">Video Ready</p>
          <video
            controls
            className="w-full rounded border border-[#e2e2e2] dark:border-[#444] mb-4"
            src={`/api/media/${scriptId}/video/${videoResult.fileName}`}
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-[#666] dark:text-[#aaa]">
              Duration: {videoResult.durationSeconds}s
            </p>
            <button onClick={onDownload} className="atlas-btn atlas-btn-accent">
              Download Video
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
