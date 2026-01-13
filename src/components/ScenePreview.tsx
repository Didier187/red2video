import { useState } from 'react'
import type { Scene, AudioGenerationResult, ImageGenerationResult } from './types'
import type { ImageStatusResponse } from './api'

interface ScenePreviewProps {
  scenes: Scene[]
  scriptId: string
  audioResult: AudioGenerationResult | undefined
  imageResult: ImageGenerationResult | undefined
  imageStatus?: ImageStatusResponse
  onRegenerateImage?: (sceneIndex: number, newPrompt: string) => Promise<void>
}

export function ScenePreview({
  scenes,
  scriptId,
  audioResult,
  imageResult,
  imageStatus,
  onRegenerateImage,
}: ScenePreviewProps) {
  const [editingScene, setEditingScene] = useState<number | null>(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [regeneratingScene, setRegeneratingScene] = useState<number | null>(null)
  const [imageVersions, setImageVersions] = useState<Record<number, number>>({})

  const handleEditClick = (sceneIndex: number, currentPrompt: string) => {
    setEditingScene(sceneIndex)
    setEditPrompt(currentPrompt)
  }

  const handleCancelEdit = () => {
    setEditingScene(null)
    setEditPrompt('')
  }

  const handleRegenerate = async (sceneIndex: number) => {
    if (!onRegenerateImage || !editPrompt.trim()) return

    setRegeneratingScene(sceneIndex)
    try {
      await onRegenerateImage(sceneIndex, editPrompt.trim())
      setImageVersions((prev) => ({
        ...prev,
        [sceneIndex]: (prev[sceneIndex] || 0) + 1,
      }))
      setEditingScene(null)
      setEditPrompt('')
    } catch (error) {
      console.error('Failed to regenerate image:', error)
    } finally {
      setRegeneratingScene(null)
    }
  }

  return (
    <div className="atlas-card p-8 mb-6">
      <div className="corner-bl" />
      <div className="corner-br" />
      <p className="atlas-label mb-6">Scene Preview</p>

      <div className="space-y-6">
        {scenes.map((scene, i) => {
          const audio = audioResult?.audios.find((a) => a.sceneIndex === i)
          // Check imageResult first, then fall back to imageStatus for in-progress images
          const image = imageResult?.images.find((img) => img.sceneIndex === i)
          const statusImage = imageStatus?.images.find((img) => img.sceneIndex === i)
          const hasImage = image || statusImage
          const imageFileName = image?.fileName || statusImage?.fileName
          const imagePrompt = image?.prompt || statusImage?.prompt || scene.imagePrompt
          const isEditing = editingScene === i
          const isRegenerating = regeneratingScene === i
          const imageVersion = imageVersions[i] || 0

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
                <div className="relative">
                  {hasImage && imageFileName ? (
                    <>
                      <img
                        src={`/api/media/${scriptId}/images/${imageFileName}?v=${imageVersion}`}
                        alt={`Scene ${i + 1}`}
                        className={`w-full rounded border border-[#e2e2e2] dark:border-[#444] ${
                          isRegenerating ? 'opacity-50' : ''
                        }`}
                      />
                      {isRegenerating && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-white font-medium">
                              Regenerating...
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full aspect-video bg-[#f5f5f5] dark:bg-[#222] rounded border border-[#e2e2e2] dark:border-[#444] flex items-center justify-center">
                      <p className="text-xs text-[#999] dark:text-[#666]">
                        Image not generated
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="atlas-label mb-2">Voiceover</p>
                  <p className="text-sm leading-relaxed mb-4">{scene.text}</p>

                  {audio && (
                    <div className="mb-4">
                      <p className="atlas-label mb-2 text-[#ff6e41]">Audio</p>
                      <audio
                        controls
                        className="w-full h-10"
                        src={`data:audio/mp3;base64,${audio.audioBase64}`}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-1">
                    <p className="atlas-label">Image Prompt</p>
                    {hasImage && onRegenerateImage && !isEditing && !isRegenerating && (
                      <button
                        onClick={() => handleEditClick(i, imagePrompt)}
                        className="text-xs text-[#85d7ff] hover:text-[#ff6e41] transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        className="w-full p-3 text-xs bg-[#f5f5f5] dark:bg-[#222] border border-[#e2e2e2] dark:border-[#444] rounded resize-none focus:outline-none focus:border-[#85d7ff]"
                        rows={4}
                        placeholder="Enter image prompt..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRegenerate(i)}
                          disabled={!editPrompt.trim() || isRegenerating}
                          className="atlas-btn atlas-btn-accent text-xs py-1.5 px-3 disabled:opacity-50"
                        >
                          Regenerate
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isRegenerating}
                          className="atlas-btn text-xs py-1.5 px-3"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#666] dark:text-[#aaa] italic">
                      {imagePrompt}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
