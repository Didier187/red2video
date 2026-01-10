import type { StepStatus } from './types'
import { StepIndicator } from './StepIndicator'

interface ProgressStepsProps {
  getStepStatus: (step: number) => StepStatus
}

export function ProgressSteps({ getStepStatus }: ProgressStepsProps) {
  return (
    <div className="atlas-card p-6 mb-8">
      <div className="corner-bl" />
      <div className="corner-br" />
      <div className="flex justify-between items-center">
        <StepIndicator
          step={1}
          title="Fetch Post"
          status={getStepStatus(1)}
        />
        <div className="flex-1 h-px bg-[#e2e2e2] dark:bg-[#444] mx-4" />
        <StepIndicator
          step={2}
          title="Generate Script"
          status={getStepStatus(2)}
        />
        <div className="flex-1 h-px bg-[#e2e2e2] dark:bg-[#444] mx-4" />
        <StepIndicator step={3} title="Audio" status={getStepStatus(3)} />
        <div className="flex-1 h-px bg-[#e2e2e2] dark:bg-[#444] mx-4" />
        <StepIndicator step={4} title="Images" status={getStepStatus(4)} />
        <div className="flex-1 h-px bg-[#e2e2e2] dark:bg-[#444] mx-4" />
        <StepIndicator step={5} title="Render" status={getStepStatus(5)} />
      </div>
    </div>
  )
}
