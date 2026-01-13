import { Monitor, Smartphone, Square } from 'lucide-react'
import type { AspectRatio } from './types'
import { ASPECT_RATIO_CONFIGS } from './types'

interface AspectRatioSelectorProps {
  selected: AspectRatio
  onSelect: (ratio: AspectRatio) => void
  disabled?: boolean
}

const ICONS: Record<AspectRatio, React.ReactNode> = {
  '16:9': <Monitor size={24} />,
  '9:16': <Smartphone size={24} />,
  '1:1': <Square size={24} />,
}

export function AspectRatioSelector({
  selected,
  onSelect,
  disabled = false,
}: AspectRatioSelectorProps) {
  const ratios: AspectRatio[] = ['16:9', '9:16', '1:1']

  return (
    <div className="grid grid-cols-3 gap-3">
      {ratios.map((ratio) => {
        const config = ASPECT_RATIO_CONFIGS[ratio]
        const isSelected = selected === ratio

        return (
          <button
            key={ratio}
            onClick={() => onSelect(ratio)}
            disabled={disabled}
            className={`
              relative p-4 rounded-lg border-2 transition-all
              ${
                isSelected
                  ? 'border-[#85d7ff] bg-[#85d7ff]/10'
                  : 'border-[#e2e2e2] dark:border-[#444] hover:border-[#85d7ff]/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#85d7ff]" />
            )}
            <div className="flex flex-col items-center gap-2">
              <div
                className={`
                  ${isSelected ? 'text-[#85d7ff]' : 'text-[#666] dark:text-[#aaa]'}
                `}
              >
                {ICONS[ratio]}
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">{config.label}</p>
                <p className="text-xs text-[#999] dark:text-[#777]">{ratio}</p>
                <p className="text-xs text-[#666] dark:text-[#888] mt-1">
                  {config.description}
                </p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
