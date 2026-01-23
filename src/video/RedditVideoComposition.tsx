import React from 'react'
import { Composition, AbsoluteFill } from 'remotion'
import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { Scene } from './Scene'
import { TitleCard } from './TitleCard'
import { OutroCard } from './OutroCard'
import { SceneData } from './types'
import { z } from 'zod'

const FPS = 30
const TITLE_DURATION_SECONDS = 4
const OUTRO_DURATION_SECONDS = 5
const TRANSITION_DURATION_FRAMES = 15

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

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      <TransitionSeries>
        {/* Title Card */}
        <TransitionSeries.Sequence durationInFrames={titleDurationInFrames}>
          <TitleCard title={title} subtitle="Reddit Story" />
        </TransitionSeries.Sequence>

        {/* Scenes with transitions */}
        {scenes.map((scene, index) => {
          const durationInFrames = sceneDurations[index]
          const isLastScene = index === scenes.length - 1

          return (
            <React.Fragment key={index}>
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({
                  durationInFrames: TRANSITION_DURATION_FRAMES,
                })}
              />
              <TransitionSeries.Sequence durationInFrames={durationInFrames}>
                <Scene
                  text={scene.text}
                  imageDataUrl={scene.imageDataUrl}
                  audioDataUrl={scene.audioDataUrl}
                  durationInFrames={durationInFrames}
                  isLastScene={isLastScene && !showOutro}
                />
              </TransitionSeries.Sequence>
            </React.Fragment>
          )
        })}

        {/* Outro Card */}
        {showOutro && (
          <>
            <TransitionSeries.Transition
              presentation={fade()}
              timing={linearTiming({
                durationInFrames: TRANSITION_DURATION_FRAMES,
              })}
            />
            <TransitionSeries.Sequence durationInFrames={outroDurationInFrames}>
              <OutroCard
                channelName={channelName}
                socialHandle={socialHandle}
              />
            </TransitionSeries.Sequence>
          </>
        )}
      </TransitionSeries>
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
