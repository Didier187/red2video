import React from 'react'
import { Composition, AbsoluteFill, Sequence } from 'remotion'
import { Scene } from './Scene'
import { TitleCard } from './TitleCard'
import { OutroCard } from './OutroCard'
import { SceneData } from './types'

const FPS = 30
const TITLE_DURATION_SECONDS = 4
const OUTRO_DURATION_SECONDS = 5

interface VideoProps {
  title: string
  scenes: SceneData[]
  scriptId: string
  channelName?: string
  socialHandle?: string
  showOutro?: boolean
}

export const RedditVideo = ({
  title,
  scenes,
  channelName,
  socialHandle,
  showOutro = true,
}: VideoProps) => {
  const titleDurationInFrames = TITLE_DURATION_SECONDS * FPS
  const outroDurationInFrames = OUTRO_DURATION_SECONDS * FPS

  let currentFrame = titleDurationInFrames

  // Calculate the frame where scenes end (for outro positioning)
  const scenesEndFrame =
    titleDurationInFrames +
    scenes.reduce((acc, scene) => {
      const sceneDuration = scene.duration ?? scene.durationHint
      return acc + Math.round(sceneDuration * FPS)
    }, 0)

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* Title Card */}
      <Sequence from={0} durationInFrames={titleDurationInFrames}>
        <TitleCard title={title} subtitle="Reddit Story" />
      </Sequence>

      {/* Scenes */}
      {scenes.map((scene, index) => {
        // Use actual audio duration if available, otherwise fall back to durationHint
        const sceneDuration = scene.duration ?? scene.durationHint
        const durationInFrames = Math.round(sceneDuration * FPS)
        const startFrame = currentFrame

        currentFrame += durationInFrames

        return (
          <Sequence key={index} from={startFrame} durationInFrames={durationInFrames}>
            <Scene
              text={scene.text}
              imageDataUrl={scene.imageDataUrl}
              audioDataUrl={scene.audioDataUrl}
              durationInFrames={durationInFrames}
            />
          </Sequence>
        )
      })}

      {/* Outro Card */}
      {showOutro && (
        <Sequence from={scenesEndFrame} durationInFrames={outroDurationInFrames}>
          <OutroCard channelName={channelName} socialHandle={socialHandle} />
        </Sequence>
      )}
    </AbsoluteFill>
  )
}

// Calculate total duration from scenes - prefer actual audio duration
function calculateTotalDuration(scenes: SceneData[], showOutro: boolean = true): number {
  const scenesDuration = scenes.reduce((acc, scene) => {
    // Use actual audio duration if available, otherwise fall back to durationHint
    return acc + (scene.duration ?? scene.durationHint)
  }, 0)
  const outroDuration = showOutro ? OUTRO_DURATION_SECONDS : 0
  return Math.round((TITLE_DURATION_SECONDS + scenesDuration + outroDuration) * FPS)
}

// Root component for Remotion
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RedditVideo"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={RedditVideo as any}
        durationInFrames={300}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Reddit Story',
          scenes: [] as SceneData[],
          scriptId: '',
          channelName: undefined,
          socialHandle: undefined,
          showOutro: true,
        }}
        calculateMetadata={async ({ props }) => {
          const videoProps = props as unknown as VideoProps
          const duration = calculateTotalDuration(videoProps.scenes, videoProps.showOutro ?? true)
          return {
            durationInFrames: duration || 300,
          }
        }}
      />
    </>
  )
}
