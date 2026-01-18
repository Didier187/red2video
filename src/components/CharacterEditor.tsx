import { useState } from 'react'
import { Users, RefreshCw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import type {
  CharacterConfig,
  CharacterDefinition,
  PhysicalDescription,
} from './types'

interface CharacterEditorProps {
  characterConfig: CharacterConfig | undefined
  isExtracting: boolean
  onExtract: () => void
  onUpdate: (characters: CharacterDefinition[], globalStyle?: string) => void
}

interface CharacterCardProps {
  character: CharacterDefinition
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (updated: CharacterDefinition) => void
}

const ROLE_COLORS: Record<string, string> = {
  protagonist: 'bg-[#22c55e] text-white',
  antagonist: 'bg-[#ef4444] text-white',
  supporting: 'bg-[#3b82f6] text-white',
  background: 'bg-[#6b7280] text-white',
}

const ROLE_LABELS: Record<string, string> = {
  protagonist: 'Main',
  antagonist: 'Antagonist',
  supporting: 'Supporting',
  background: 'Background',
}

function CharacterCard({
  character,
  isExpanded,
  onToggle,
  onUpdate,
}: CharacterCardProps) {
  const updateField = (
    field: keyof PhysicalDescription,
    value: string
  ) => {
    onUpdate({
      ...character,
      physicalDescription: {
        ...character.physicalDescription,
        [field]: value || undefined,
      },
    })
  }

  return (
    <div className="border border-[#e2e2e2] dark:border-[#333] rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded ${ROLE_COLORS[character.role]}`}
          >
            {ROLE_LABELS[character.role]}
          </span>
          <span className="font-medium">{character.name}</span>
          <span className="text-xs text-[#666] dark:text-[#999]">
            ({character.appearances.length} scene
            {character.appearances.length !== 1 ? 's' : ''})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-[#666]" />
        ) : (
          <ChevronDown size={18} className="text-[#666]" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-[#e2e2e2] dark:border-[#333]">
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#666] dark:text-[#999] mb-1">
                Age
              </label>
              <input
                type="text"
                value={character.physicalDescription.age || ''}
                onChange={(e) => updateField('age', e.target.value)}
                placeholder="e.g., mid-30s"
                className="w-full px-3 py-2 text-sm border border-[#e2e2e2] dark:border-[#333] rounded bg-white dark:bg-[#1a1a1a]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] dark:text-[#999] mb-1">
                Gender
              </label>
              <input
                type="text"
                value={character.physicalDescription.gender || ''}
                onChange={(e) => updateField('gender', e.target.value)}
                placeholder="e.g., male, female"
                className="w-full px-3 py-2 text-sm border border-[#e2e2e2] dark:border-[#333] rounded bg-white dark:bg-[#1a1a1a]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] dark:text-[#999] mb-1">
                Build
              </label>
              <input
                type="text"
                value={character.physicalDescription.build || ''}
                onChange={(e) => updateField('build', e.target.value)}
                placeholder="e.g., athletic, slim"
                className="w-full px-3 py-2 text-sm border border-[#e2e2e2] dark:border-[#333] rounded bg-white dark:bg-[#1a1a1a]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] dark:text-[#999] mb-1">
                Skin Tone
              </label>
              <input
                type="text"
                value={character.physicalDescription.skinTone || ''}
                onChange={(e) => updateField('skinTone', e.target.value)}
                placeholder="e.g., fair, olive, dark"
                className="w-full px-3 py-2 text-sm border border-[#e2e2e2] dark:border-[#333] rounded bg-white dark:bg-[#1a1a1a]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] dark:text-[#999] mb-1">
                Hair Color
              </label>
              <input
                type="text"
                value={character.physicalDescription.hairColor || ''}
                onChange={(e) => updateField('hairColor', e.target.value)}
                placeholder="e.g., brown, blonde"
                className="w-full px-3 py-2 text-sm border border-[#e2e2e2] dark:border-[#333] rounded bg-white dark:bg-[#1a1a1a]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] dark:text-[#999] mb-1">
                Hair Style
              </label>
              <input
                type="text"
                value={character.physicalDescription.hairStyle || ''}
                onChange={(e) => updateField('hairStyle', e.target.value)}
                placeholder="e.g., short, ponytail"
                className="w-full px-3 py-2 text-sm border border-[#e2e2e2] dark:border-[#333] rounded bg-white dark:bg-[#1a1a1a]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] dark:text-[#999] mb-1">
                Eye Color
              </label>
              <input
                type="text"
                value={character.physicalDescription.eyeColor || ''}
                onChange={(e) => updateField('eyeColor', e.target.value)}
                placeholder="e.g., blue, brown"
                className="w-full px-3 py-2 text-sm border border-[#e2e2e2] dark:border-[#333] rounded bg-white dark:bg-[#1a1a1a]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#666] dark:text-[#999] mb-1">
                Facial Features
              </label>
              <input
                type="text"
                value={character.physicalDescription.facialFeatures || ''}
                onChange={(e) => updateField('facialFeatures', e.target.value)}
                placeholder="e.g., beard, glasses"
                className="w-full px-3 py-2 text-sm border border-[#e2e2e2] dark:border-[#333] rounded bg-white dark:bg-[#1a1a1a]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-[#666] dark:text-[#999] mb-1">
                Clothing
              </label>
              <input
                type="text"
                value={character.physicalDescription.clothing || ''}
                onChange={(e) => updateField('clothing', e.target.value)}
                placeholder="e.g., business suit, casual jeans"
                className="w-full px-3 py-2 text-sm border border-[#e2e2e2] dark:border-[#333] rounded bg-white dark:bg-[#1a1a1a]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-[#666] dark:text-[#999] mb-1">
                Accessories
              </label>
              <input
                type="text"
                value={character.physicalDescription.accessories || ''}
                onChange={(e) => updateField('accessories', e.target.value)}
                placeholder="e.g., watch, necklace"
                className="w-full px-3 py-2 text-sm border border-[#e2e2e2] dark:border-[#333] rounded bg-white dark:bg-[#1a1a1a]"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-lg">
            <p className="text-xs text-[#666] dark:text-[#999] mb-1">
              Consistency Prompt Preview:
            </p>
            <p className="text-sm text-[#333] dark:text-[#ccc]">
              {character.consistencyPrompt || 'No description yet'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function CharacterEditor({
  characterConfig,
  isExtracting,
  onExtract,
  onUpdate,
}: CharacterEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [globalStyle, setGlobalStyle] = useState(
    characterConfig?.globalStyle || ''
  )

  const handleCharacterUpdate = (updated: CharacterDefinition) => {
    if (!characterConfig) return
    const updatedCharacters = characterConfig.characters.map((c) =>
      c.id === updated.id ? updated : c
    )
    onUpdate(updatedCharacters, globalStyle)
  }

  const handleGlobalStyleChange = (style: string) => {
    setGlobalStyle(style)
    if (characterConfig) {
      onUpdate(characterConfig.characters, style)
    }
  }

  if (!characterConfig) {
    return (
      <div className="atlas-card p-6 mb-6">
        <div className="corner-bl" />
        <div className="corner-br" />
        <div className="flex items-center gap-3 mb-4">
          <Users size={20} className="text-[#ff6e41]" />
          <p className="atlas-label">Character Consistency</p>
        </div>

        <p className="text-sm text-[#666] dark:text-[#aaa] mb-4">
          Extract characters from your script to maintain visual consistency
          across all generated images.
        </p>

        <button
          onClick={onExtract}
          disabled={isExtracting}
          className="atlas-btn atlas-btn-secondary flex items-center gap-2"
        >
          {isExtracting ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Analyzing script...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Extract Characters
            </>
          )}
        </button>
      </div>
    )
  }

  const protagonists = characterConfig.characters.filter(
    (c) => c.role === 'protagonist'
  )
  const others = characterConfig.characters.filter(
    (c) => c.role !== 'protagonist'
  )

  return (
    <div className="atlas-card p-6 mb-6">
      <div className="corner-bl" />
      <div className="corner-br" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Users size={20} className="text-[#ff6e41]" />
          <p className="atlas-label">Character Consistency</p>
          <span className="px-2 py-0.5 text-xs bg-[#22c55e] text-white rounded">
            {characterConfig.characters.length} character
            {characterConfig.characters.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={onExtract}
          disabled={isExtracting}
          className="text-sm text-[#ff6e41] hover:text-[#e55a2d] flex items-center gap-1"
        >
          <RefreshCw size={14} className={isExtracting ? 'animate-spin' : ''} />
          Re-extract
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-xs text-[#666] dark:text-[#999] mb-2">
          Global Visual Style
        </label>
        <input
          type="text"
          value={globalStyle}
          onChange={(e) => handleGlobalStyleChange(e.target.value)}
          placeholder="e.g., photorealistic, cinematic lighting"
          className="w-full px-3 py-2 text-sm border border-[#e2e2e2] dark:border-[#333] rounded bg-white dark:bg-[#1a1a1a]"
        />
      </div>

      <div className="space-y-3">
        {protagonists.map((char) => (
          <CharacterCard
            key={char.id}
            character={char}
            isExpanded={expandedId === char.id}
            onToggle={() =>
              setExpandedId(expandedId === char.id ? null : char.id)
            }
            onUpdate={handleCharacterUpdate}
          />
        ))}
        {others.map((char) => (
          <CharacterCard
            key={char.id}
            character={char}
            isExpanded={expandedId === char.id}
            onToggle={() =>
              setExpandedId(expandedId === char.id ? null : char.id)
            }
            onUpdate={handleCharacterUpdate}
          />
        ))}
      </div>

      <p className="text-xs text-[#999] dark:text-[#666] mt-4">
        Edit character details to improve visual consistency across generated
        images.
      </p>
    </div>
  )
}
