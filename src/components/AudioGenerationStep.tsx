import { useState, useEffect } from 'react'
import type { Voice, AudioGenerationResult } from './types'
import { VOICE_OPTIONS } from './constants'
import { VoiceSelector } from './VoiceSelector'

interface AudioGenerationStepProps {
  sceneCount: number
  selectedVoice: Voice
  onSelectVoice: (voice: Voice) => void
  voiceSamples: Record<string, string>
  loadingSample: Voice | null
  playingVoice: Voice | null
  onPlaySample: (voice: Voice) => void
  audioResult: AudioGenerationResult | undefined
  isPending: boolean
  error: Error | null
  onGenerate: () => void
}

const LOADING_MESSAGES = [
  'Connecting to OpenAI TTS...',
  'Converting text to speech...',
  'Generating natural voice patterns...',
  'Adding vocal inflections...',
  'Processing audio files...',
  'Optimizing audio quality...',
  'Finalizing voiceover...',
]

interface LoadingSpinnerProps {
  sceneCount: number
  voiceName: string
}

function LoadingSpinner({ sceneCount, voiceName }: LoadingSpinnerProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [dots, setDots] = useState('')
  const [currentScene, setCurrentScene] = useState(1)

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 2500)

    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)

    // Simulate scene progress
    const sceneInterval = setInterval(() => {
      setCurrentScene((prev) => (prev < sceneCount ? prev + 1 : prev))
    }, 3000)

    return () => {
      clearInterval(messageInterval)
      clearInterval(dotsInterval)
      clearInterval(sceneInterval)
    }
  }, [sceneCount])

  const progress = Math.round((currentScene / sceneCount) * 100)

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative w-24 h-24 mb-6">
        {/* Background ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
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
        {/* Progress ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#85d7ff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${progress * 2.83} 283`}
            className="transition-all duration-500"
          />
        </svg>
        {/* Spinning accent ring */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
          style={{ animationDuration: '3s' }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="35"
            fill="none"
            stroke="#ff6e41"
            strokeWidth="2"
            strokeDasharray="25 180"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl">🎙️</span>
          <span className="text-xs font-bold text-[#85d7ff]">{progress}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-4">
        <div className="w-full bg-[#e2e2e2] dark:bg-[#333] rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#85d7ff] to-[#ff6e41] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-[#999] dark:text-[#666] mt-1 text-center">
          Scene {currentScene} of {sceneCount}
        </p>
      </div>

      <p className="text-lg font-medium text-center">
        {LOADING_MESSAGES[messageIndex]}
        <span className="inline-block w-8 text-left">{dots}</span>
      </p>
      <p className="text-sm text-[#666] dark:text-[#999] mt-2">
        Generating voiceover with <span className="text-[#85d7ff]">{voiceName}</span> voice
      </p>
    </div>
  )
}

export function AudioGenerationStep({
  sceneCount,
  selectedVoice,
  onSelectVoice,
  voiceSamples,
  loadingSample,
  playingVoice,
  onPlaySample,
  audioResult,
  isPending,
  error,
  onGenerate,
}: AudioGenerationStepProps) {
  const selectedVoiceName = VOICE_OPTIONS.find((v) => v.id === selectedVoice)?.name || selectedVoice

  return (
    <div className="atlas-card p-8 mb-6">
      <div className="corner-bl" />
      <div className="corner-br" />
      <p className="atlas-label mb-4">Step 03 / Generate Voiceover</p>

      {!isPending && (
        <>
          <p className="text-sm text-[#666] dark:text-[#aaa] mb-6">
            Generate AI voiceover for all {sceneCount} scenes using OpenAI TTS
          </p>

          <VoiceSelector
            selectedVoice={selectedVoice}
            onSelectVoice={onSelectVoice}
            voiceSamples={voiceSamples}
            loadingSample={loadingSample}
            playingVoice={playingVoice}
            onPlaySample={onPlaySample}
            disabled={!!audioResult}
          />
        </>
      )}

      {isPending ? (
        <LoadingSpinner sceneCount={sceneCount} voiceName={selectedVoiceName} />
      ) : (
        <button
          onClick={onGenerate}
          disabled={isPending || !!audioResult}
          className="atlas-btn atlas-btn-primary"
        >
          {audioResult
            ? 'Audio Generated'
            : `Generate Voiceover (${selectedVoiceName})`}
        </button>
      )}

      {error && (
        <p className="text-[#ff6e41] text-sm mt-4">{error.message}</p>
      )}

      {audioResult && (
        <div className="mt-4 p-4 bg-[#f0fdf4] dark:bg-[#1a2e1a] rounded-lg border border-[#86efac] dark:border-[#22c55e]">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <p className="text-sm text-[#166534] dark:text-[#86efac]">
              {audioResult.audios.length} audio files generated with{' '}
              <span className="font-medium">{selectedVoiceName}</span> voice
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
