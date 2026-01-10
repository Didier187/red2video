import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'

interface ScriptContent {
  post: {
    author: string
    title: string
    body: string
  }
  comments: Array<{
    author: string
    text: string
  }>
  plainText: string
}

interface Scene {
  text: string
  imagePrompt: string
  durationHint: number
}

interface YouTubeScript {
  id: string
  title: string
  description: string
  scenes: Scene[]
  totalDuration: number
}

interface GeneratedAudio {
  sceneIndex: number
  text: string
  audioBase64: string
  format: 'mp3'
}

interface AudioGenerationResult {
  audios: GeneratedAudio[]
  totalScenes: number
}

interface GeneratedImage {
  sceneIndex: number
  prompt: string
  filePath: string
  fileName: string
}

interface ImageGenerationResult {
  images: GeneratedImage[]
  totalScenes: number
}

interface VideoRenderResult {
  videoPath: string
  fileName: string
  durationSeconds: number
}

interface ApiError {
  error: string
}

type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

const VOICE_OPTIONS: { id: Voice; name: string; description: string }[] = [
  {
    id: 'nova',
    name: 'Nova',
    description: 'Friendly, conversational female voice',
  },
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice' },
  { id: 'echo', name: 'Echo', description: 'Warm, articulate male voice' },
  { id: 'fable', name: 'Fable', description: 'Expressive, British accent' },
  { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative male voice' },
  {
    id: 'shimmer',
    name: 'Shimmer',
    description: 'Clear, energetic female voice',
  },
]

const SAMPLE_TEXT =
  'Welcome to this Reddit story. Let me tell you about something interesting.'

async function getRedditPost({ url }: { url: string }): Promise<ScriptContent> {
  const res = await fetch(`/api/reddit?url=${encodeURIComponent(url)}`)
  const data: ScriptContent | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

async function generateScript(content: ScriptContent): Promise<YouTubeScript> {
  const res = await fetch('/api/generate-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  })
  const data: YouTubeScript | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

async function generateAudio({
  scriptId,
  voice,
}: {
  scriptId: string
  voice: Voice
}): Promise<AudioGenerationResult> {
  const res = await fetch('/api/generate-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptId, voice, model: 'tts-1' }),
  })
  const data: AudioGenerationResult | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

async function generateVoiceSample(voice: Voice): Promise<string> {
  const res = await fetch('/api/generate-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenes: [{ text: SAMPLE_TEXT }],
      voice,
      model: 'tts-1',
    }),
  })
  const data: AudioGenerationResult | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data.audios[0].audioBase64
}

async function generateImages(
  scriptId: string,
): Promise<ImageGenerationResult> {
  const res = await fetch('/api/generate-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scriptId,
      size: '1792x1024',
      quality: 'standard',
      style: 'vivid',
    }),
  })
  const data: ImageGenerationResult | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

async function renderVideo(scriptId: string): Promise<VideoRenderResult> {
  const res = await fetch('/api/render-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptId, quality: 'medium', outputFormat: 'mp4' }),
  })
  const data: VideoRenderResult | ApiError = await res.json()

  if (!res.ok || 'error' in data) {
    throw new Error((data as ApiError).error || `Request failed: ${res.status}`)
  }

  return data
}

export const Route = createFileRoute('/')({ component: App })

// Video rendering progress component
function VideoRenderProgress({
  totalScenes,
  scriptId,
}: {
  totalScenes: number
  scriptId: string
}) {
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
    // Poll for progress
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

    // Animate dots
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
      {/* Animated ring with progress */}
      <div className="flex justify-center">
        <div className="relative w-32 h-32">
          {/* Background ring */}
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
          {/* Progress ring */}
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
          {/* Inner spinning ring */}
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
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl">{currentStage.icon}</span>
            <span className="text-lg font-bold text-[#85d7ff]">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-[#e2e2e2] dark:bg-[#333] rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#85d7ff] to-[#ff6e41] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage label */}
      <div className="text-center">
        <p className="text-lg font-medium">
          {currentStage.label}
          <span className="inline-block w-8 text-left">{dots}</span>
        </p>
        <p className="text-sm text-[#666] dark:text-[#999] mt-2">
          Rendering {totalScenes} scenes
        </p>
      </div>

      {/* Fun facts / tips */}
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

// Step indicator component
function StepIndicator({
  step,
  title,
  status,
}: {
  step: number
  title: string
  status: 'pending' | 'active' | 'completed'
}) {
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

function App() {
  const [inputUrl, setInputUrl] = useState('')
  const [submittedUrl, setSubmittedUrl] = useState('')
  const [selectedVoice, setSelectedVoice] = useState<Voice>('nova')
  const [voiceSamples, setVoiceSamples] = useState<Record<string, string>>({})
  const [loadingSample, setLoadingSample] = useState<Voice | null>(null)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode')
      if (saved !== null) return saved === 'true'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  const { data, isLoading, error } = useQuery({
    queryKey: ['post', submittedUrl],
    queryFn: () => getRedditPost({ url: submittedUrl }),
    enabled: !!submittedUrl,
  })

  const scriptMutation = useMutation({
    mutationFn: generateScript,
  })

  const audioMutation = useMutation({
    mutationFn: generateAudio,
  })

  const imageMutation = useMutation({
    mutationFn: generateImages,
  })

  const videoMutation = useMutation({
    mutationFn: renderVideo,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputUrl.trim()) {
      setSubmittedUrl(inputUrl.trim())
      scriptMutation.reset()
      audioMutation.reset()
      imageMutation.reset()
      videoMutation.reset()
    }
  }

  const handleGenerateScript = () => {
    if (data) {
      scriptMutation.mutate(data)
    }
  }

  const handleGenerateAudio = () => {
    if (scriptMutation.data) {
      audioMutation.mutate({
        scriptId: scriptMutation.data.id,
        voice: selectedVoice,
      })
    }
  }

  const handlePlaySample = async (voice: Voice) => {
    if (voiceSamples[voice]) {
      // Already have the sample, just play it
      const audio = new Audio(`data:audio/mp3;base64,${voiceSamples[voice]}`)
      audio.play()
      return
    }

    setLoadingSample(voice)
    try {
      const sample = await generateVoiceSample(voice)
      setVoiceSamples((prev) => ({ ...prev, [voice]: sample }))
      const audio = new Audio(`data:audio/mp3;base64,${sample}`)
      audio.play()
    } catch (err) {
      console.error('Failed to generate sample:', err)
    } finally {
      setLoadingSample(null)
    }
  }

  const handleGenerateImages = () => {
    if (scriptMutation.data) {
      imageMutation.mutate(scriptMutation.data.id)
    }
  }

  const handleRenderVideo = () => {
    if (scriptMutation.data) {
      videoMutation.mutate(scriptMutation.data.id)
    }
  }

  const handleDownloadVideo = async () => {
    if (!scriptMutation.data || !videoMutation.data) return

    const url = `/api/media/${scriptMutation.data.id}/video/${videoMutation.data.fileName}`
    const response = await fetch(url)
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `${scriptMutation.data.title.replace(/[^a-z0-9]/gi, '_')}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(downloadUrl)
  }

  // Calculate current step
  const getStepStatus = (step: number): 'pending' | 'active' | 'completed' => {
    if (step === 1) {
      if (data) return 'completed'
      if (isLoading) return 'active'
      return submittedUrl ? 'active' : 'pending'
    }
    if (step === 2) {
      if (scriptMutation.data) return 'completed'
      if (scriptMutation.isPending) return 'active'
      return data ? 'active' : 'pending'
    }
    if (step === 3) {
      if (audioMutation.data) return 'completed'
      if (audioMutation.isPending) return 'active'
      return scriptMutation.data ? 'active' : 'pending'
    }
    if (step === 4) {
      if (imageMutation.data) return 'completed'
      if (imageMutation.isPending) return 'active'
      return scriptMutation.data ? 'active' : 'pending'
    }
    if (step === 5) {
      if (videoMutation.data) return 'completed'
      if (videoMutation.isPending) return 'active'
      return imageMutation.data ? 'active' : 'pending'
    }
    return 'pending'
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dark Mode Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="dark-mode-toggle"
        aria-label="Toggle dark mode"
      >
        {darkMode ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      {/* Animated background rings */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        <svg
          className="w-[800px] h-[800px] opacity-10 rotate-cw-slow"
          viewBox="0 0 400 400"
        >
          <circle
            cx="200"
            cy="200"
            r="180"
            fill="none"
            stroke="#85d7ff"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        </svg>
        <svg
          className="absolute w-[600px] h-[600px] opacity-10 rotate-ccw-slow"
          viewBox="0 0 400 400"
        >
          <circle
            cx="200"
            cy="200"
            r="180"
            fill="none"
            stroke="#ff6e41"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        </svg>
      </div>

      <div className="relative max-w-4xl mx-auto px-8 py-16">
        {/* Header */}
        <header className="text-center mb-12">
          <p className="atlas-label mb-4">Reddit to Video Pipeline</p>
          <h1 className="font-display text-5xl font-medium tracking-tight">
            Red2Video
          </h1>
          <p className="mt-4 text-sm text-[#666] dark:text-[#999] max-w-md mx-auto">
            Transform Reddit threads into engaging YouTube videos with
            AI-powered generation
          </p>
        </header>

        {/* Progress Steps */}
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

        {/* Step 1: Input URL */}
        <div className="atlas-card p-8 mb-6">
          <div className="corner-bl" />
          <div className="corner-br" />
          <p className="atlas-label mb-4">Step 01 / Fetch Reddit Post</p>
          <h2 className="font-display text-2xl mb-6">Enter Reddit URL</h2>
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://reddit.com/r/..."
              className="atlas-input flex-1"
            />
            <button
              type="submit"
              disabled={isLoading || !inputUrl.trim()}
              className="atlas-btn atlas-btn-primary"
            >
              {isLoading ? 'Fetching...' : 'Fetch Post'}
            </button>
          </form>
          {error && (
            <p className="text-[#ff6e41] text-sm mt-4">{error.message}</p>
          )}
        </div>

        {/* Step 2: Extracted Content & Script Generation */}
        {data && (
          <div className="atlas-card p-8 mb-6">
            <div className="corner-bl" />
            <div className="corner-br" />
            <p className="atlas-label mb-4">Step 02 / Generate Script</p>

            <div className="mb-6">
              <p className="atlas-label mb-2">Post by u/{data.post.author}</p>
              <h3 className="font-display text-xl mb-2">{data.post.title}</h3>
              {data.post.body && (
                <p className="text-sm text-[#666] dark:text-[#aaa] line-clamp-3">
                  {data.post.body}
                </p>
              )}
              <p className="text-xs text-[#999] dark:text-[#777] mt-2">
                {data.comments.length} comments extracted
              </p>
            </div>

            <button
              onClick={handleGenerateScript}
              disabled={scriptMutation.isPending || !!scriptMutation.data}
              className="atlas-btn atlas-btn-accent"
            >
              {scriptMutation.isPending
                ? 'Generating Script...'
                : scriptMutation.data
                  ? 'Script Generated'
                  : 'Generate Script'}
            </button>

            {scriptMutation.error && (
              <p className="text-[#ff6e41] text-sm mt-4">
                {scriptMutation.error.message}
              </p>
            )}

            {scriptMutation.data && (
              <div className="mt-6 pt-6 border-t border-[#e2e2e2] dark:border-[#444]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="atlas-label mb-1">Generated Title</p>
                    <h4 className="font-display text-lg">
                      {scriptMutation.data.title}
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="atlas-label mb-1">Duration</p>
                    <p className="text-xl font-display text-[#85d7ff]">
                      {scriptMutation.data.totalDuration}s
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[#666] dark:text-[#aaa]">
                  {scriptMutation.data.description}
                </p>
                <p className="text-xs text-[#999] dark:text-[#777] mt-2">
                  {scriptMutation.data.scenes.length} scenes created
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Generate Audio */}
        {scriptMutation.data && (
          <div className="atlas-card p-8 mb-6">
            <div className="corner-bl" />
            <div className="corner-br" />
            <p className="atlas-label mb-4">Step 03 / Generate Voiceover</p>
            <p className="text-sm text-[#666] dark:text-[#aaa] mb-6">
              Generate AI voiceover for all {scriptMutation.data.scenes.length}{' '}
              scenes using OpenAI TTS
            </p>

            {/* Voice Selection */}
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
                    } ${audioMutation.data ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() =>
                      !audioMutation.data && setSelectedVoice(voice.id)
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{voice.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePlaySample(voice.id)
                        }}
                        disabled={loadingSample === voice.id}
                        className="text-xs text-[#85d7ff] hover:text-[#ff6e41] transition-colors disabled:opacity-50"
                      >
                        {loadingSample === voice.id
                          ? 'Loading...'
                          : voiceSamples[voice.id]
                            ? 'Play'
                            : 'Preview'}
                      </button>
                    </div>
                    <p className="text-xs text-[#666] dark:text-[#aaa]">
                      {voice.description}
                    </p>
                    {selectedVoice === voice.id && (
                      <div className="mt-2 text-xs text-[#85d7ff]">
                        Selected
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateAudio}
              disabled={audioMutation.isPending || !!audioMutation.data}
              className="atlas-btn atlas-btn-primary"
            >
              {audioMutation.isPending
                ? 'Generating Audio...'
                : audioMutation.data
                  ? 'Audio Generated'
                  : `Generate Voiceover (${VOICE_OPTIONS.find((v) => v.id === selectedVoice)?.name})`}
            </button>

            {audioMutation.error && (
              <p className="text-[#ff6e41] text-sm mt-4">
                {audioMutation.error.message}
              </p>
            )}

            {audioMutation.data && (
              <p className="text-sm text-[#85d7ff] mt-4">
                {audioMutation.data.audios.length} audio files generated with{' '}
                {VOICE_OPTIONS.find((v) => v.id === selectedVoice)?.name} voice
              </p>
            )}
          </div>
        )}

        {/* Step 4: Generate Images */}
        {scriptMutation.data && (
          <div className="atlas-card p-8 mb-6">
            <div className="corner-bl" />
            <div className="corner-br" />
            <p className="atlas-label mb-4">Step 04 / Generate Images</p>
            <p className="text-sm text-[#666] dark:text-[#aaa] mb-6">
              Generate DALL-E 3 images for all{' '}
              {scriptMutation.data.scenes.length} scenes
            </p>

            <button
              onClick={handleGenerateImages}
              disabled={imageMutation.isPending || !!imageMutation.data}
              className="atlas-btn atlas-btn-accent"
            >
              {imageMutation.isPending
                ? 'Generating Images...'
                : imageMutation.data
                  ? 'Images Generated'
                  : 'Generate Images'}
            </button>

            {imageMutation.error && (
              <p className="text-[#ff6e41] text-sm mt-4">
                {imageMutation.error.message}
              </p>
            )}

            {imageMutation.data && (
              <p className="text-sm text-[#85d7ff] mt-4">
                {imageMutation.data.images.length} images generated
              </p>
            )}
          </div>
        )}

        {/* Step 5: Render Video */}
        {imageMutation.data && scriptMutation.data && (
          <div className="atlas-card p-8 mb-6">
            <div className="corner-bl" />
            <div className="corner-br" />
            <p className="atlas-label mb-4">Step 05 / Render Video</p>

            {!videoMutation.isPending && !videoMutation.data && (
              <>
                <p className="text-sm text-[#666] dark:text-[#aaa] mb-6">
                  Combine all assets into a final video using Remotion
                </p>
                <button
                  onClick={handleRenderVideo}
                  className="atlas-btn atlas-btn-primary"
                >
                  Render Video
                </button>
              </>
            )}

            {videoMutation.isPending && (
              <VideoRenderProgress
                totalScenes={scriptMutation.data.scenes.length}
                scriptId={scriptMutation.data.id}
              />
            )}

            {videoMutation.error && (
              <p className="text-[#ff6e41] text-sm mt-4">
                {videoMutation.error.message}
              </p>
            )}

            {videoMutation.data && (
              <div className="mt-4">
                <p className="atlas-label mb-4 text-[#85d7ff]">Video Ready</p>
                <video
                  controls
                  className="w-full rounded border border-[#e2e2e2] dark:border-[#444] mb-4"
                  src={`/api/media/${scriptMutation.data.id}/video/${videoMutation.data.fileName}`}
                />
                <div className="flex justify-between items-center">
                  <p className="text-sm text-[#666] dark:text-[#aaa]">
                    Duration: {videoMutation.data.durationSeconds}s
                  </p>
                  <button
                    onClick={handleDownloadVideo}
                    className="atlas-btn atlas-btn-accent"
                  >
                    Download Video
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scene Preview Section */}
        {scriptMutation.data && (
          <div className="atlas-card p-8 mb-6">
            <div className="corner-bl" />
            <div className="corner-br" />
            <p className="atlas-label mb-6">Scene Preview</p>

            <div className="space-y-6">
              {scriptMutation.data.scenes.map((scene, i) => {
                const audio = audioMutation.data?.audios.find(
                  (a) => a.sceneIndex === i,
                )
                const image = imageMutation.data?.images.find(
                  (img) => img.sceneIndex === i,
                )

                return (
                  <div
                    key={i}
                    className="border border-[#e2e2e2] dark:border-[#444] p-6"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <p className="atlas-label text-[#85d7ff]">
                        Scene {String(i + 1).padStart(2, '0')}
                      </p>
                      <p className="text-xs text-[#999] dark:text-[#777]">
                        {scene.durationHint}s
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Image or placeholder */}
                      <div>
                        {image ? (
                          <img
                            src={`/api/media/${scriptMutation.data.id}/images/${image.fileName}`}
                            alt={`Scene ${i + 1}`}
                            className="w-full rounded border border-[#e2e2e2] dark:border-[#444]"
                          />
                        ) : (
                          <div className="w-full aspect-video bg-[#f5f5f5] dark:bg-[#222] rounded border border-[#e2e2e2] dark:border-[#444] flex items-center justify-center">
                            <p className="text-xs text-[#999] dark:text-[#666]">
                              Image not generated
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: Text and audio */}
                      <div>
                        <p className="atlas-label mb-2">Voiceover</p>
                        <p className="text-sm leading-relaxed mb-4">
                          {scene.text}
                        </p>

                        {audio && (
                          <div className="mb-4">
                            <p className="atlas-label mb-2 text-[#ff6e41]">
                              Audio
                            </p>
                            <audio
                              controls
                              className="w-full h-10"
                              src={`data:audio/mp3;base64,${audio.audioBase64}`}
                            />
                          </div>
                        )}

                        <p className="atlas-label mb-1">Image Prompt</p>
                        <p className="text-xs text-[#666] dark:text-[#aaa] italic">
                          {scene.imagePrompt}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-16">
          <p className="atlas-label">Red2Video / Tactical Content Laboratory</p>
        </footer>
      </div>
    </div>
  )
}
