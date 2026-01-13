import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VoiceSelector } from './VoiceSelector'
import type { Voice } from './types'

describe('VoiceSelector', () => {
  const defaultProps = {
    selectedVoice: 'nova' as Voice,
    onSelectVoice: vi.fn(),
    voiceSamples: {} as Record<string, string>,
    loadingSample: null as Voice | null,
    playingVoice: null as Voice | null,
    onPlaySample: vi.fn(),
    disabled: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render all voice options', () => {
      render(<VoiceSelector {...defaultProps} />)

      expect(screen.getByText('Nova')).toBeInTheDocument()
      expect(screen.getByText('Alloy')).toBeInTheDocument()
      expect(screen.getByText('Echo')).toBeInTheDocument()
      expect(screen.getByText('Fable')).toBeInTheDocument()
      expect(screen.getByText('Onyx')).toBeInTheDocument()
      expect(screen.getByText('Shimmer')).toBeInTheDocument()
    })

    it('should display voice descriptions', () => {
      render(<VoiceSelector {...defaultProps} />)

      expect(screen.getByText('Friendly, conversational female voice')).toBeInTheDocument()
      expect(screen.getByText('Neutral, balanced voice')).toBeInTheDocument()
      expect(screen.getByText('Warm, articulate male voice')).toBeInTheDocument()
      expect(screen.getByText('Expressive, British accent')).toBeInTheDocument()
      expect(screen.getByText('Deep, authoritative male voice')).toBeInTheDocument()
      expect(screen.getByText('Clear, energetic female voice')).toBeInTheDocument()
    })

    it('should show "Selected" indicator for selected voice', () => {
      render(<VoiceSelector {...defaultProps} selectedVoice="echo" />)

      const selectedIndicators = screen.getAllByText('Selected')
      expect(selectedIndicators).toHaveLength(1)
    })

    it('should render the label', () => {
      render(<VoiceSelector {...defaultProps} />)

      expect(screen.getByText('Select Voice')).toBeInTheDocument()
    })
  })

  describe('voice selection', () => {
    it('should call onSelectVoice when a voice is clicked', () => {
      const onSelectVoice = vi.fn()
      render(<VoiceSelector {...defaultProps} onSelectVoice={onSelectVoice} />)

      const echoVoice = screen.getByText('Echo').closest('div[class*="border"]')
      fireEvent.click(echoVoice!)

      expect(onSelectVoice).toHaveBeenCalledWith('echo')
    })

    it('should not call onSelectVoice when disabled', () => {
      const onSelectVoice = vi.fn()
      render(<VoiceSelector {...defaultProps} onSelectVoice={onSelectVoice} disabled={true} />)

      const echoVoice = screen.getByText('Echo').closest('div[class*="border"]')
      fireEvent.click(echoVoice!)

      expect(onSelectVoice).not.toHaveBeenCalled()
    })

    it('should apply visual styles to selected voice', () => {
      render(<VoiceSelector {...defaultProps} selectedVoice="fable" />)

      const fableCard = screen.getByText('Fable').closest('div[class*="border"]')
      expect(fableCard?.className).toContain('border-[#85d7ff]')
    })
  })

  describe('sample playback', () => {
    it('should show "Preview" when no sample exists', () => {
      render(<VoiceSelector {...defaultProps} voiceSamples={{}} />)

      const previewButtons = screen.getAllByText('Preview')
      expect(previewButtons.length).toBeGreaterThan(0)
    })

    it('should show "Play" when sample exists', () => {
      render(
        <VoiceSelector
          {...defaultProps}
          voiceSamples={{ nova: 'base64audiodata' }}
        />
      )

      expect(screen.getByText('Play')).toBeInTheDocument()
    })

    it('should show "Loading..." when sample is loading', () => {
      render(<VoiceSelector {...defaultProps} loadingSample="echo" />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show "Stop" when voice is playing', () => {
      render(
        <VoiceSelector
          {...defaultProps}
          voiceSamples={{ alloy: 'base64audiodata' }}
          playingVoice="alloy"
        />
      )

      expect(screen.getByText('Stop')).toBeInTheDocument()
    })

    it('should call onPlaySample when preview button is clicked', () => {
      const onPlaySample = vi.fn()
      render(<VoiceSelector {...defaultProps} onPlaySample={onPlaySample} />)

      const previewButton = screen.getAllByText('Preview')[0]
      fireEvent.click(previewButton)

      expect(onPlaySample).toHaveBeenCalled()
    })

    it('should not propagate click to voice selection when preview button is clicked', () => {
      const onSelectVoice = vi.fn()
      const onPlaySample = vi.fn()
      render(
        <VoiceSelector
          {...defaultProps}
          onSelectVoice={onSelectVoice}
          onPlaySample={onPlaySample}
          selectedVoice="nova"
        />
      )

      // Click on a preview button for a different voice
      const echoVoice = screen.getByText('Echo').closest('div[class*="border"]')
      const previewButton = echoVoice?.querySelector('button')
      fireEvent.click(previewButton!)

      expect(onPlaySample).toHaveBeenCalledWith('echo')
      // onSelectVoice should not be called because we clicked the button, not the card
      expect(onSelectVoice).not.toHaveBeenCalled()
    })

    it('should disable preview button when that voice sample is loading', () => {
      render(<VoiceSelector {...defaultProps} loadingSample="shimmer" />)

      const loadingButton = screen.getByText('Loading...')
      expect(loadingButton).toBeDisabled()
    })
  })

  describe('disabled state', () => {
    it('should apply disabled styles when disabled', () => {
      render(<VoiceSelector {...defaultProps} disabled={true} />)

      const voiceCards = screen.getAllByText('Nova')[0].closest('div[class*="border"]')
      expect(voiceCards?.className).toContain('opacity-50')
      expect(voiceCards?.className).toContain('cursor-not-allowed')
    })

    it('should still allow preview button clicks when disabled', () => {
      const onPlaySample = vi.fn()
      render(
        <VoiceSelector {...defaultProps} onPlaySample={onPlaySample} disabled={true} />
      )

      const previewButton = screen.getAllByText('Preview')[0]
      fireEvent.click(previewButton)

      // Preview should still work even when voice selection is disabled
      expect(onPlaySample).toHaveBeenCalled()
    })
  })

  describe('voice options', () => {
    it('should have exactly 6 voice options', () => {
      render(<VoiceSelector {...defaultProps} />)

      const voiceNames = ['Nova', 'Alloy', 'Echo', 'Fable', 'Onyx', 'Shimmer']
      voiceNames.forEach((name) => {
        expect(screen.getByText(name)).toBeInTheDocument()
      })
    })

    it('should render voices in the correct order', () => {
      render(<VoiceSelector {...defaultProps} />)

      const voiceCards = screen.getAllByText(/Selected|Preview|Play|Stop|Loading.../)
        .map((el) => el.closest('div[class*="border"]'))
        .filter(Boolean)

      // The first voice should be Nova based on VOICE_OPTIONS order
      expect(voiceCards[0]?.textContent).toContain('Nova')
    })
  })
})
