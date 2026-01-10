import type { Scene, AudioGenerationResult, ImageGenerationResult } from './types'

interface ScenePreviewProps {
  scenes: Scene[]
  scriptId: string
  audioResult: AudioGenerationResult | undefined
  imageResult: ImageGenerationResult | undefined
}

export function ScenePreview({
  scenes,
  scriptId,
  audioResult,
  imageResult,
}: ScenePreviewProps) {
  return (
    <div className="atlas-card p-8 mb-6">
      <div className="corner-bl" />
      <div className="corner-br" />
      <p className="atlas-label mb-6">Scene Preview</p>

      <div className="space-y-6">
        {scenes.map((scene, i) => {
          const audio = audioResult?.audios.find((a) => a.sceneIndex === i)
          const image = imageResult?.images.find((img) => img.sceneIndex === i)

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
                <div>
                  {image ? (
                    <img
                      src={`/api/media/${scriptId}/images/${image.fileName}`}
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
  )
}
