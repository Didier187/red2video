import { useState, useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  type Voice,
  type StepStatus,
  type ImageStatusResponse,
  type YouTubeScript,
  type AspectRatio,
  type ImageProvider,
  type CharacterConfig,
  type GeneratedImage,
  ASPECT_RATIO_CONFIGS,
  getRedditPost,
  generateScript,
  generateAudio,
  generateVoiceSample,
  generateImages,
  regenerateImage,
  renderVideo,
  getImageStatus,
  generateMetadata,
  extractCharacters,
  updateCharacters,
  AnimatedBackground,
  AudioGenerationStep,
  AutomationPanel,
  CharacterEditor,
  DarkModeToggle,
  Footer,
  Header,
  ImageGenerationStep,
  ProgressSteps,
  ScenePreview,
  ScriptGenerationStep,
  UrlInputStep,
  VideoRenderStep,
  YouTubeMetadataStep,
} from '../components'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [inputUrl, setInputUrl] = useState('')
  const [submittedUrl, setSubmittedUrl] = useState('')
  const [selectedVoice, setSelectedVoice] = useState<Voice>('nova')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9')
  const [imageProvider, setImageProvider] = useState<ImageProvider>('dall-e')
  const [voiceSamples, setVoiceSamples] = useState<Record<string, string>>({})
  const [loadingSample, setLoadingSample] = useState<Voice | null>(null)
  const [playingVoice, setPlayingVoice] = useState<Voice | null>(null)
  const [imageStatus, setImageStatus] = useState<ImageStatusResponse | undefined>()
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig | undefined>()
  const [useCharacterConsistency, setUseCharacterConsistency] = useState(true)
  const [imageOverrides, setImageOverrides] = useState<Record<number, GeneratedImage>>({})
  const [scriptOverride, setScriptOverride] = useState<YouTubeScript | undefined>()
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

  const metadataMutation = useMutation({
    mutationFn: generateMetadata,
  })

  const characterMutation = useMutation({
    mutationFn: extractCharacters,
    onSuccess: (data) => {
      setCharacterConfig(data)
    },
  })

  // Poll for image generation progress while images are being generated
  useEffect(() => {
    if (!scriptMutation.data?.id || !imageMutation.isPending) {
      return
    }

    const pollInterval = setInterval(async () => {
      try {
        const status = await getImageStatus(currentScript!.id)
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
      metadataMutation.reset()
      characterMutation.reset()
      setCharacterConfig(undefined)
      setImageOverrides({})
      setScriptOverride(undefined)
    }
  }

  const handleGenerateScript = () => {
    if (data) {
      scriptMutation.mutate(data, {
        onSuccess: (script) => {
          // Auto-extract characters after script generation
          characterMutation.mutate({
            scriptId: script.id,
            sourceContent: data.plainText,
          })
        },
      })
    }
  }

  const handleExtractCharacters = () => {
    if (scriptMutation.data && data) {
      characterMutation.mutate({
        scriptId: currentScript!.id,
        sourceContent: data.plainText,
      })
    }
  }

  const handleUpdateCharacters = async (
    characters: CharacterConfig['characters'],
    globalStyle?: string
  ) => {
    if (!scriptMutation.data) return
    const updated = await updateCharacters({
      scriptId: currentScript!.id,
      characters,
      globalStyle,
    })
    setCharacterConfig(updated)
  }

  const handleGenerateAudio = () => {
    if (scriptMutation.data) {
      audioMutation.mutate({
        scriptId: currentScript!.id,
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
      const config = ASPECT_RATIO_CONFIGS[aspectRatio]
      imageMutation.mutate({
        scriptId: currentScript!.id,
        imageSize: config.imageSize,
        provider: imageProvider,
        useCharacterConsistency: useCharacterConsistency && !!characterConfig,
      })
    }
  }

  const handleRenderVideo = () => {
    if (scriptMutation.data) {
      const config = ASPECT_RATIO_CONFIGS[aspectRatio]
      videoMutation.mutate({
        scriptId: currentScript!.id,
        videoWidth: config.videoWidth,
        videoHeight: config.videoHeight,
      })
    }
  }

  const handleRegenerateImage = async (sceneIndex: number, newPrompt: string) => {
    if (!scriptMutation.data) return

    const result = await regenerateImage({
      scriptId: currentScript!.id,
      sceneIndex,
      prompt: newPrompt,
      provider: imageProvider,
    })

    // Track the regenerated image as an override instead of mutating React Query data
    setImageOverrides(prev => ({ ...prev, [sceneIndex]: result }))
  }

  const handleScriptUpdate = (updatedScript: YouTubeScript) => {
    // Track the edited script as an override instead of mutating React Query data
    // This allows users to edit the script before generating audio/images
    setScriptOverride(updatedScript)
  }

  const handleDownloadVideo = async () => {
    if (!scriptMutation.data || !videoMutation.data) return

    const url = `/api/media/${currentScript!.id}/video/${videoMutation.data.fileName}`
    const response = await fetch(url)
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `${currentScript!.title.replace(/[^a-z0-9]/gi, '_')}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(downloadUrl)
  }

  const handleGenerateMetadata = () => {
    if (scriptMutation.data && data) {
      metadataMutation.mutate({
        scriptId: currentScript!.id,
        sourceContent: data.plainText,
      })
    }
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
    if (step === 6) {
      if (metadataMutation.data) return 'completed'
      if (metadataMutation.isPending) return 'active'
      return videoMutation.data ? 'active' : 'pending'
    }
    return 'pending'
  }

  // Derived values that merge overrides with React Query data
  const currentScript = scriptOverride ?? scriptMutation.data
  const mergedImageResult = imageMutation.data ? {
    ...imageMutation.data,
    images: imageMutation.data.images.map(img => imageOverrides[img.sceneIndex] ?? img),
  } : undefined

  return (
    <div className="min-h-screen relative overflow-hidden">
      <DarkModeToggle darkMode={darkMode} onToggle={() => setDarkMode(!darkMode)} />
      <AnimatedBackground />

      <div className="relative max-w-4xl mx-auto px-8 py-16">
        <Header />

        <AutomationPanel />

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
            script={currentScript}
            isPending={scriptMutation.isPending}
            error={scriptMutation.error}
            onGenerate={handleGenerateScript}
            onScriptUpdate={handleScriptUpdate}
          />
        )}

        {scriptMutation.data && (
          <AudioGenerationStep
            sceneCount={currentScript!.scenes.length}
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
          <CharacterEditor
            characterConfig={characterConfig}
            isExtracting={characterMutation.isPending}
            onExtract={handleExtractCharacters}
            onUpdate={handleUpdateCharacters}
          />
        )}

        {scriptMutation.data && (
          <ImageGenerationStep
            sceneCount={currentScript!.scenes.length}
            imageResult={mergedImageResult}
            isPending={imageMutation.isPending}
            error={imageMutation.error}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            imageProvider={imageProvider}
            onImageProviderChange={setImageProvider}
            onGenerate={handleGenerateImages}
            onRetry={() => {
              imageMutation.reset()
              handleGenerateImages()
            }}
            characterConfig={characterConfig}
            useCharacterConsistency={useCharacterConsistency}
            onCharacterConsistencyChange={setUseCharacterConsistency}
          />
        )}

        {imageMutation.data && scriptMutation.data && (
          <VideoRenderStep
            scriptId={currentScript!.id}
            scriptTitle={currentScript!.title}
            sceneCount={currentScript!.scenes.length}
            videoResult={videoMutation.data}
            isPending={videoMutation.isPending}
            error={videoMutation.error}
            onRender={handleRenderVideo}
            onDownload={handleDownloadVideo}
          />
        )}

        {videoMutation.data && (
          <YouTubeMetadataStep
            metadata={metadataMutation.data}
            isPending={metadataMutation.isPending}
            error={metadataMutation.error}
            onGenerate={handleGenerateMetadata}
            onRetry={() => {
              metadataMutation.reset()
              handleGenerateMetadata()
            }}
          />
        )}

        {scriptMutation.data && (
          <ScenePreview
            scenes={currentScript!.scenes}
            scriptId={currentScript!.id}
            audioResult={audioMutation.data}
            imageResult={mergedImageResult}
            imageStatus={imageStatus}
            onRegenerateImage={handleRegenerateImage}
          />
        )}

        <Footer />
      </div>
    </div>
  )
}
