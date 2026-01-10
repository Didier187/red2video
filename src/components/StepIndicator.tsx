import type { StepStatus } from './types'

interface StepIndicatorProps {
  step: number
  title: string
  status: StepStatus
}

export function StepIndicator({ step, title, status }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono
          ${
            status === 'completed'
              ? 'bg-[#85d7ff] text-[#1a1a1a]'
              : status === 'active'
                ? 'bg-[#ff6e41] text-white'
                : 'bg-[#e2e2e2] dark:bg-[#333] text-[#666] dark:text-[#999]'
          }`}
      >
        {status === 'completed' ? '✓' : String(step).padStart(2, '0')}
      </div>
      <span
        className={`atlas-label ${status === 'active' ? 'text-[#ff6e41]' : ''}`}
      >
        {title}
      </span>
    </div>
  )
}
