import { useState, useEffect } from 'react'
import { Pencil, Check, X, RotateCcw } from 'lucide-react'
import type { ScriptContent, YouTubeScript, Scene } from './types'

interface ScriptGenerationStepProps {
  data: ScriptContent
  script: YouTubeScript | undefined
  isPending: boolean
  error: Error | null
  onGenerate: () => void
  onScriptUpdate?: (updatedScript: YouTubeScript) => void
}

const LOADING_MESSAGES = [
  'Analyzing Reddit post content...',
  'Identifying key story elements...',
  'Crafting engaging narrative...',
  'Generating scene breakdowns...',
  'Optimizing for viewer engagement...',
  'Adding dramatic pauses...',
  'Polishing the script...',
]

function LoadingSpinner() {
  const [messageIndex, setMessageIndex] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 3000)

    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)

    return () => {
      clearInterval(messageInterval)
      clearInterval(dotsInterval)
    }
  }, [])

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative w-20 h-20 mb-6">
        {/* Outer ring */}
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
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#ff6e41"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="70 213"
            className="animate-spin origin-center"
            style={{ animationDuration: '1.5s' }}
          />
        </svg>
        {/* Inner spinning ring */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
          style={{ animationDuration: '2s', animationDirection: 'reverse' }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="30"
            fill="none"
            stroke="#85d7ff"
            strokeWidth="3"
            strokeDasharray="40 150"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">📝</span>
        </div>
      </div>

      <p className="text-lg font-medium text-center">
        {LOADING_MESSAGES[messageIndex]}
        <span className="inline-block w-8 text-left">{dots}</span>
      </p>
      <p className="text-sm text-[#666] dark:text-[#999] mt-2">
        AI is crafting your video script
      </p>
    </div>
  )
}

interface SceneEditorProps {
  scene: Scene
  index: number
  onSave: (index: number, updatedScene: Scene) => void
  onCancel: () => void
}

function SceneEditor({ scene, index, onSave, onCancel }: SceneEditorProps) {
  const [text, setText] = useState(scene.text)
  const [imagePrompt, setImagePrompt] = useState(scene.imagePrompt)

  const handleSave = () => {
    onSave(index, { ...scene, text, imagePrompt })
  }

  return (
    <div className="bg-[#f8f8f8] dark:bg-[#1a1a1a] rounded-lg p-4 border border-[#e2e2e2] dark:border-[#333]">
      <div className="flex justify-between items-center mb-3">
        <p className="atlas-label">Scene {index + 1}</p>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="p-1.5 rounded bg-[#22c55e] hover:bg-[#16a34a] text-white transition-colors"
            title="Save changes"
          >
            <Check size={16} />
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 rounded bg-[#666] hover:bg-[#555] text-white transition-colors"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[#999] dark:text-[#777] block mb-1">
            Narration Text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 rounded border border-[#e2e2e2] dark:border-[#444] bg-white dark:bg-[#222] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#85d7ff]"
            rows={3}
          />
        </div>
        <div>
          <label className="text-xs text-[#999] dark:text-[#777] block mb-1">
            Image Prompt
          </label>
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            className="w-full px-3 py-2 rounded border border-[#e2e2e2] dark:border-[#444] bg-white dark:bg-[#222] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#85d7ff]"
            rows={2}
          />
        </div>
      </div>
    </div>
  )
}

export function ScriptGenerationStep({
  data,
  script,
  isPending,
  error,
  onGenerate,
  onScriptUpdate,
}: ScriptGenerationStepProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedScenes, setEditedScenes] = useState<Scene[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize edit state when script is available
  useEffect(() => {
    if (script) {
      setEditedTitle(script.title)
      setEditedDescription(script.description)
      setEditedScenes([...script.scenes])
    }
  }, [script])

  const handleStartEditing = () => {
    if (script) {
      setEditedTitle(script.title)
      setEditedDescription(script.description)
      setEditedScenes([...script.scenes])
      setIsEditing(true)
      setHasChanges(false)
    }
  }

  const handleCancelEditing = () => {
    setIsEditing(false)
    setEditingSceneIndex(null)
    setHasChanges(false)
  }

  const handleResetToOriginal = () => {
    if (script) {
      setEditedTitle(script.title)
      setEditedDescription(script.description)
      setEditedScenes([...script.scenes])
      setHasChanges(false)
    }
  }

  const handleSaveAll = () => {
    if (script && onScriptUpdate) {
      const updatedScript: YouTubeScript = {
        ...script,
        title: editedTitle,
        description: editedDescription,
        scenes: editedScenes,
        totalDuration: editedScenes.reduce((acc, s) => acc + s.durationHint, 0),
      }
      onScriptUpdate(updatedScript)
      setIsEditing(false)
      setEditingSceneIndex(null)
      setHasChanges(false)
    }
  }

  const handleSceneSave = (index: number, updatedScene: Scene) => {
    const newScenes = [...editedScenes]
    newScenes[index] = updatedScene
    setEditedScenes(newScenes)
    setEditingSceneIndex(null)
    setHasChanges(true)
  }

  const handleTitleChange = (value: string) => {
    setEditedTitle(value)
    setHasChanges(true)
  }

  const handleDescriptionChange = (value: string) => {
    setEditedDescription(value)
    setHasChanges(true)
  }

  return (
    <div className="atlas-card p-8 mb-6">
      <div className="corner-bl" />
      <div className="corner-br" />
      <p className="atlas-label mb-4">Step 02 / Generate Script</p>

      {!isPending && (
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
      )}

      {isPending ? (
        <LoadingSpinner />
      ) : (
        <button
          onClick={onGenerate}
          disabled={isPending || !!script}
          className="atlas-btn atlas-btn-accent"
        >
          {script ? 'Script Generated' : 'Generate Script'}
        </button>
      )}

      {error && (
        <p className="text-[#ff6e41] text-sm mt-4">{error.message}</p>
      )}

      {script && (
        <div className="mt-6 pt-6 border-t border-[#e2e2e2] dark:border-[#444]">
          {/* Header with edit toggle */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="atlas-label">Generated Title</p>
                {!isEditing && onScriptUpdate && (
                  <button
                    onClick={handleStartEditing}
                    className="p-1 rounded hover:bg-[#e2e2e2] dark:hover:bg-[#333] transition-colors"
                    title="Edit script"
                  >
                    <Pencil size={14} className="text-[#666] dark:text-[#aaa]" />
                  </button>
                )}
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="font-display text-lg w-full px-2 py-1 rounded border border-[#e2e2e2] dark:border-[#444] bg-white dark:bg-[#222] focus:outline-none focus:ring-2 focus:ring-[#85d7ff]"
                />
              ) : (
                <h4 className="font-display text-lg">{script.title}</h4>
              )}
            </div>
            <div className="text-right ml-4">
              <p className="atlas-label mb-1">Duration</p>
              <p className="text-xl font-display text-[#85d7ff]">
                {isEditing
                  ? editedScenes.reduce((acc, s) => acc + s.durationHint, 0)
                  : script.totalDuration}s
              </p>
            </div>
          </div>

          {/* Description */}
          {isEditing ? (
            <textarea
              value={editedDescription}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="w-full text-sm px-2 py-1 rounded border border-[#e2e2e2] dark:border-[#444] bg-white dark:bg-[#222] resize-none focus:outline-none focus:ring-2 focus:ring-[#85d7ff]"
              rows={2}
            />
          ) : (
            <p className="text-sm text-[#666] dark:text-[#aaa]">
              {script.description}
            </p>
          )}

          <p className="text-xs text-[#999] dark:text-[#777] mt-2 mb-4">
            {script.scenes.length} scenes created
          </p>

          {/* Editing mode: show all scenes */}
          {isEditing && (
            <div className="mt-4 space-y-3">
              <p className="atlas-label">Edit Scenes</p>
              {editedScenes.map((scene, index) => (
                <div key={index}>
                  {editingSceneIndex === index ? (
                    <SceneEditor
                      scene={scene}
                      index={index}
                      onSave={handleSceneSave}
                      onCancel={() => setEditingSceneIndex(null)}
                    />
                  ) : (
                    <div
                      className="bg-[#f8f8f8] dark:bg-[#1a1a1a] rounded-lg p-3 border border-[#e2e2e2] dark:border-[#333] cursor-pointer hover:border-[#85d7ff] transition-colors"
                      onClick={() => setEditingSceneIndex(index)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-xs text-[#999] dark:text-[#777] mb-1">
                            Scene {index + 1} ({scene.durationHint}s)
                          </p>
                          <p className="text-sm line-clamp-2">{scene.text}</p>
                        </div>
                        <Pencil size={14} className="text-[#999] ml-2 shrink-0" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#e2e2e2] dark:border-[#444]">
                <button
                  onClick={handleSaveAll}
                  disabled={!hasChanges}
                  className="atlas-btn atlas-btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={16} className="mr-2" />
                  Save Changes
                </button>
                <button
                  onClick={handleResetToOriginal}
                  disabled={!hasChanges}
                  className="atlas-btn atlas-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={16} className="mr-2" />
                  Reset
                </button>
                <button
                  onClick={handleCancelEditing}
                  className="atlas-btn atlas-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
