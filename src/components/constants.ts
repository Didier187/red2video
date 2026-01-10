import type { Voice } from './types'

export const VOICE_OPTIONS: { id: Voice; name: string; description: string }[] =
  [
    {
      id: 'nova',
      name: 'Nova',
      description: 'Friendly, conversational female voice',
    },
    { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice' },
    { id: 'echo', name: 'Echo', description: 'Warm, articulate male voice' },
    { id: 'fable', name: 'Fable', description: 'Expressive, British accent' },
    {
      id: 'onyx',
      name: 'Onyx',
      description: 'Deep, authoritative male voice',
    },
    {
      id: 'shimmer',
      name: 'Shimmer',
      description: 'Clear, energetic female voice',
    },
  ]

export const SAMPLE_TEXT =
  'Welcome to this Reddit story. Let me tell you about something interesting.'
