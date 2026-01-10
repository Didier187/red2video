import { useState, useEffect } from 'react'

interface VideoRenderProgressProps {
  totalScenes: number
  scriptId: string
}

export function VideoRenderProgress({
  totalScenes,
  scriptId,
}: VideoRenderProgressProps) {
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('initializing')
  const [dots, setDots] = useState('')

  const stageConfig: Record<string, { label: string; icon: string }> = {
    initializing: { label: 'Initializing', icon: '⚙️' },
    preparing: { label: 'Preparing media files', icon: '📁' },
    bundling: { label: 'Bundling Remotion project', icon: '📦' },
    composing: { label: 'Composing video frames', icon: '🎬' },
    rendering: { label: 'Encoding video', icon: '🎥' },
    finalizing: { label: 'Finalizing', icon: '✨' },
    complete: { label: 'Complete', icon: '✅' },
  }

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/render-progress/${scriptId}`)
        if (res.ok) {
          const data = await res.json()
          setProgress(data.progress)
          setStage(data.stage)
        }
      } catch (e) {
        console.error('Failed to fetch progress:', e)
      }
    }, 500)

    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)

    return () => {
      clearInterval(pollInterval)
      clearInterval(dotsInterval)
    }
  }, [scriptId])

  const currentStage = stageConfig[stage] || stageConfig.initializing

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="relative w-32 h-32">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
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
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#85d7ff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${progress * 2.83} 283`}
              className="transition-all duration-300"
            />
          </svg>
          <svg
            className="absolute inset-0 w-full h-full animate-spin"
            style={{ animationDuration: '2s' }}
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="none"
              stroke="#ff6e41"
              strokeWidth="2"
              strokeDasharray="30 180"
              strokeLinecap="round"
              opacity="0.6"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl">{currentStage.icon}</span>
            <span className="text-lg font-bold text-[#85d7ff]">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      <div className="w-full bg-[#e2e2e2] dark:bg-[#333] rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#85d7ff] to-[#ff6e41] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="text-center">
        <p className="text-lg font-medium">
          {currentStage.label}
          <span className="inline-block w-8 text-left">{dots}</span>
        </p>
        <p className="text-sm text-[#666] dark:text-[#999] mt-2">
          Rendering {totalScenes} scenes
        </p>
      </div>

      <div className="text-center">
        <p className="text-xs text-[#999] dark:text-[#666] italic">
          {progress < 20
            ? 'Tip: Preparing media files for video composition...'
            : progress < 50
              ? 'Tip: Remotion is composing your video frame by frame...'
              : progress < 90
                ? 'Tip: Encoding video with high quality settings...'
                : 'Tip: Almost done! Finalizing your video...'}
        </p>
      </div>
    </div>
  )
}
