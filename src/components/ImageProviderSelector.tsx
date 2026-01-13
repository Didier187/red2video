import type { ImageProvider } from './types'
import { IMAGE_PROVIDER_CONFIGS } from './types'

interface ImageProviderSelectorProps {
  selected: ImageProvider
  onSelect: (provider: ImageProvider) => void
  disabled?: boolean
}

export function ImageProviderSelector({
  selected,
  onSelect,
  disabled = false,
}: ImageProviderSelectorProps) {
  const providers: ImageProvider[] = ['dall-e', 'seedream']

  return (
    <div className="grid grid-cols-2 gap-3">
      {providers.map((provider) => {
        const config = IMAGE_PROVIDER_CONFIGS[provider]
        const isSelected = selected === provider

        return (
          <button
            key={provider}
            onClick={() => onSelect(provider)}
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
              <div className="text-2xl">{config.icon}</div>
              <div className="text-center">
                <p className="font-medium text-sm">{config.label}</p>
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
