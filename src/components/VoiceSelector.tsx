import type { Voice } from './types'
import { VOICE_OPTIONS } from './constants'

interface VoiceSelectorProps {
  selectedVoice: Voice
  onSelectVoice: (voice: Voice) => void
  voiceSamples: Record<string, string>
  loadingSample: Voice | null
  playingVoice: Voice | null
  onPlaySample: (voice: Voice) => void
  disabled: boolean
}

export function VoiceSelector({
  selectedVoice,
  onSelectVoice,
  voiceSamples,
  loadingSample,
  playingVoice,
  onPlaySample,
  disabled,
}: VoiceSelectorProps) {
  return (
    <div className="mb-6">
      <p className="atlas-label mb-3">Select Voice</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {VOICE_OPTIONS.map((voice) => (
          <div
            key={voice.id}
            className={`border p-4 cursor-pointer transition-all ${
              selectedVoice === voice.id
                ? 'border-[#85d7ff] bg-[#85d7ff]/5'
                : 'border-[#e2e2e2] dark:border-[#444] hover:border-[#999] dark:hover:border-[#666]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onSelectVoice(voice.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{voice.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPlaySample(voice.id)
                }}
                disabled={loadingSample === voice.id}
                className="text-xs text-[#85d7ff] hover:text-[#ff6e41] transition-colors disabled:opacity-50"
              >
                {loadingSample === voice.id
                  ? 'Loading...'
                  : playingVoice === voice.id
                    ? 'Stop'
                    : voiceSamples[voice.id]
                      ? 'Play'
                      : 'Preview'}
              </button>
            </div>
            <p className="text-xs text-[#666] dark:text-[#aaa]">
              {voice.description}
            </p>
            {selectedVoice === voice.id && (
              <div className="mt-2 text-xs text-[#85d7ff]">Selected</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
