import React from 'react'
import { Composition, AbsoluteFill } from 'remotion'
import { TransitionSeries, springTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { Scene } from './Scene'
import { TitleCard } from './TitleCard'
import { OutroCard } from './OutroCard'
import { SceneData } from './types'
import { z } from 'zod'

const FPS = 30
const TITLE_DURATION_SECONDS = 4
const OUTRO_DURATION_SECONDS = 5
const TRANSITION_DURATION_FRAMES = 24 // ~0.8s at 30fps — smooth, unhurried

// Varied transition presentations to keep the video visually interesting.
// Each presentation type has different generic props (FadeProps, SlideProps, etc.),
// so we cast to the base type that TransitionSeries.Transition accepts.
type AnyPresentation = ReturnType<typeof fade>

function getTransitionPresentation(index: number): AnyPresentation {
  switch (index % 5) {
    case 0: return fade()
    case 1: return slide({ direction: 'from-right' }) as AnyPresentation
    case 2: return slide({ direction: 'from-left' }) as AnyPresentation
    case 3: return wipe({ direction: 'from-left' }) as AnyPresentation
    case 4: return fade()
    default: return fade()
  }
}

// Zod schema for props validation
const sceneDataSchema = z.object({
  text: z.string(),
  imagePrompt: z.string(),
  durationHint: z.number(),
  duration: z.number().optional(),
  imagePath: z.string().optional(),
  audioPath: z.string().optional(),
  imageDataUrl: z.string().optional(),
  audioDataUrl: z.string().optional(),
})

const videoPropsSchema = z.object({
  title: z.string(),
  scenes: z.array(sceneDataSchema),
  scriptId: z.string(),
  channelName: z.string().optional(),
  socialHandle: z.string().optional(),
  showOutro: z.boolean().optional(),
})

type VideoProps = z.infer<typeof videoPropsSchema>

export const RedditVideo: React.FC<VideoProps> = ({
  title,
  scenes,
  channelName,
  socialHandle,
  showOutro = true,
}) => {
  const titleDurationInFrames = TITLE_DURATION_SECONDS * FPS
  const outroDurationInFrames = OUTRO_DURATION_SECONDS * FPS

  // Calculate scene durations
  const sceneDurations = scenes.map((scene) => {
    const sceneDuration = scene.duration ?? scene.durationHint
    return Math.round(sceneDuration * FPS)
  })

  // Build a flat array of Sequence/Transition nodes — TransitionSeries requires
  // direct children to be Sequence or Transition; wrapping in Fragment breaks it.
  const seriesChildren: React.ReactNode[] = []

  seriesChildren.push(
    <TransitionSeries.Sequence key="title" durationInFrames={titleDurationInFrames}>
      <TitleCard title={title} subtitle="Reddit Story" />
    </TransitionSeries.Sequence>,
  )

  scenes.forEach((scene, index) => {
    const durationInFrames = sceneDurations[index]
    const isLastScene = index === scenes.length - 1

    seriesChildren.push(
      <TransitionSeries.Transition
        key={`t-${index}`}
        presentation={getTransitionPresentation(index)}
        timing={springTiming({
          config: { damping: 200 },
          durationInFrames: TRANSITION_DURATION_FRAMES,
        })}
      />,
    )
    seriesChildren.push(
      <TransitionSeries.Sequence key={`s-${index}`} durationInFrames={durationInFrames}>
        <Scene
          text={scene.text}
          imageDataUrl={scene.imageDataUrl}
          audioDataUrl={scene.audioDataUrl}
          durationInFrames={durationInFrames}
          isLastScene={isLastScene && !showOutro}
        />
      </TransitionSeries.Sequence>,
    )
  })

  if (showOutro) {
    seriesChildren.push(
      <TransitionSeries.Transition
        key="t-outro"
        presentation={fade()}
        timing={springTiming({
          config: { damping: 200 },
          durationInFrames: TRANSITION_DURATION_FRAMES,
        })}
      />,
    )
    seriesChildren.push(
      <TransitionSeries.Sequence key="outro" durationInFrames={outroDurationInFrames}>
        <OutroCard channelName={channelName} socialHandle={socialHandle} />
      </TransitionSeries.Sequence>,
    )
  }

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      <TransitionSeries>{seriesChildren}</TransitionSeries>
    </AbsoluteFill>
  )
}

// Calculate total duration from scenes - accounting for transition overlaps
function calculateTotalDuration(
  scenes: SceneData[],
  showOutro: boolean = true,
): number {
  const scenesDuration = scenes.reduce((acc, scene) => {
    return acc + (scene.duration ?? scene.durationHint)
  }, 0)
  const outroDuration = showOutro ? OUTRO_DURATION_SECONDS : 0

  // Total frames before transitions
  const totalFrames = Math.round(
    (TITLE_DURATION_SECONDS + scenesDuration + outroDuration) * FPS,
  )

  // Subtract transition overlaps
  const numTransitions = scenes.length + (showOutro ? 1 : 0)
  const transitionOverlap = numTransitions * TRANSITION_DURATION_FRAMES

  return totalFrames - transitionOverlap
}

// Root component for Remotion
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RedditVideo"
        component={RedditVideo}
        durationInFrames={300}
        fps={FPS}
        width={1920}
        height={1080}
        schema={videoPropsSchema}
        defaultProps={{
          title: 'Reddit Story',
          scenes: [] as SceneData[],
          scriptId: '',
          channelName: undefined,
          socialHandle: undefined,
          showOutro: true,
        }}
        calculateMetadata={async ({ props }) => {
          const duration = calculateTotalDuration(
            props.scenes,
            props.showOutro ?? true,
          )
          return {
            durationInFrames: Math.max(duration, 300),
          }
        }}
      />
    </>
  )
}
