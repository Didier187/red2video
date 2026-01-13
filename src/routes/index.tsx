import { useState, useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  type Voice,
  type StepStatus,
  type ImageStatusResponse,
  getRedditPost,
  generateScript,
  generateAudio,
  generateVoiceSample,
  generateImages,
  regenerateImage,
  renderVideo,
  getImageStatus,
  AnimatedBackground,
  AudioGenerationStep,
  DarkModeToggle,
  Footer,
  Header,
  ImageGenerationStep,
  ProgressSteps,
  ScenePreview,
  ScriptGenerationStep,
  UrlInputStep,
  VideoRenderStep,
} from '../components'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [inputUrl, setInputUrl] = useState('')
  const [submittedUrl, setSubmittedUrl] = useState('')
  const [selectedVoice, setSelectedVoice] = useState<Voice>('nova')
  const [voiceSamples, setVoiceSamples] = useState<Record<string, string>>({})
  const [loadingSample, setLoadingSample] = useState<Voice | null>(null)
  const [playingVoice, setPlayingVoice] = useState<Voice | null>(null)
  const [imageStatus, setImageStatus] = useState<ImageStatusResponse | undefined>()
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
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

  // Poll for image generation progress while images are being generated
  useEffect(() => {
    if (!scriptMutation.data?.id || !imageMutation.isPending) {
      return
    }

    const pollInterval = setInterval(async () => {
      try {
        const status = await getImageStatus(scriptMutation.data!.id)
        setImageStatus(status)
      } catch (err) {
        console.error('Failed to fetch image status:', err)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [scriptMutation.data?.id, imageMutation.isPending])

  // Clear image status when generation completes
  useEffect(() => {
    if (imageMutation.data) {
      setImageStatus(undefined)
    }
  }, [imageMutation.data])

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
    // If this voice is already playing, stop it
    if (playingVoice === voice) {
      currentAudioRef.current?.pause()
      currentAudioRef.current = null
      setPlayingVoice(null)
      return
    }

    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
      setPlayingVoice(null)
    }

    const playAudio = (base64: string) => {
      const audio = new Audio(`data:audio/mp3;base64,${base64}`)
      currentAudioRef.current = audio
      setPlayingVoice(voice)
      audio.play()
      audio.onended = () => {
        currentAudioRef.current = null
        setPlayingVoice(null)
      }
    }

    if (voiceSamples[voice]) {
      playAudio(voiceSamples[voice])
      return
    }

    setLoadingSample(voice)
    try {
      const sample = await generateVoiceSample(voice)
      setVoiceSamples((prev) => ({ ...prev, [voice]: sample }))
      playAudio(sample)
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

  const handleRegenerateImage = async (sceneIndex: number, newPrompt: string) => {
    if (!scriptMutation.data) return

    const result = await regenerateImage({
      scriptId: scriptMutation.data.id,
      sceneIndex,
      prompt: newPrompt,
    })

    // Update the imageMutation data with the new image info
    if (imageMutation.data) {
      const updatedImages = imageMutation.data.images.map((img) =>
        img.sceneIndex === sceneIndex ? result : img
      )
      imageMutation.data.images = updatedImages
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

  const getStepStatus = (step: number): StepStatus => {
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
      <DarkModeToggle darkMode={darkMode} onToggle={() => setDarkMode(!darkMode)} />
      <AnimatedBackground />

      <div className="relative max-w-4xl mx-auto px-8 py-16">
        <Header />
        <ProgressSteps getStepStatus={getStepStatus} />

        <UrlInputStep
          inputUrl={inputUrl}
          onInputChange={setInputUrl}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
        />

        {data && (
          <ScriptGenerationStep
            data={data}
            script={scriptMutation.data}
            isPending={scriptMutation.isPending}
            error={scriptMutation.error}
            onGenerate={handleGenerateScript}
          />
        )}

        {scriptMutation.data && (
          <AudioGenerationStep
            sceneCount={scriptMutation.data.scenes.length}
            selectedVoice={selectedVoice}
            onSelectVoice={setSelectedVoice}
            voiceSamples={voiceSamples}
            loadingSample={loadingSample}
            playingVoice={playingVoice}
            onPlaySample={handlePlaySample}
            audioResult={audioMutation.data}
            isPending={audioMutation.isPending}
            error={audioMutation.error}
            onGenerate={handleGenerateAudio}
          />
        )}

        {scriptMutation.data && (
          <ImageGenerationStep
            sceneCount={scriptMutation.data.scenes.length}
            imageResult={imageMutation.data}
            isPending={imageMutation.isPending}
            error={imageMutation.error}
            onGenerate={handleGenerateImages}
          />
        )}

        {imageMutation.data && scriptMutation.data && (
          <VideoRenderStep
            scriptId={scriptMutation.data.id}
            scriptTitle={scriptMutation.data.title}
            sceneCount={scriptMutation.data.scenes.length}
            videoResult={videoMutation.data}
            isPending={videoMutation.isPending}
            error={videoMutation.error}
            onRender={handleRenderVideo}
            onDownload={handleDownloadVideo}
          />
        )}

        {scriptMutation.data && (
          <ScenePreview
            scenes={scriptMutation.data.scenes}
            scriptId={scriptMutation.data.id}
            audioResult={audioMutation.data}
            imageResult={imageMutation.data}
            imageStatus={imageStatus}
            onRegenerateImage={handleRegenerateImage}
          />
        )}

        <Footer />
      </div>
    </div>
  )
}
