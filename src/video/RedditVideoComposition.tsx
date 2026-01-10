import React from 'react'
import { Composition, AbsoluteFill, Sequence } from 'remotion'
import { Scene } from './Scene'
import { TitleCard } from './TitleCard'
import { SceneData } from './types'

const FPS = 30
const TITLE_DURATION_SECONDS = 4

interface VideoProps {
  title: string
  scenes: SceneData[]
  scriptId: string
}

export const RedditVideo = ({ title, scenes }: VideoProps) => {
  const titleDurationInFrames = TITLE_DURATION_SECONDS * FPS

  let currentFrame = titleDurationInFrames

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* Title Card */}
      <Sequence from={0} durationInFrames={titleDurationInFrames}>
        <TitleCard title={title} subtitle="Reddit Story" />
      </Sequence>

      {/* Scenes */}
      {scenes.map((scene, index) => {
        const durationInFrames = Math.round(scene.durationHint * FPS)
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
    </AbsoluteFill>
  )
}

// Calculate total duration from scenes
function calculateTotalDuration(scenes: SceneData[]): number {
  const scenesDuration = scenes.reduce((acc, scene) => acc + scene.durationHint, 0)
  return Math.round((TITLE_DURATION_SECONDS + scenesDuration) * FPS)
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
        }}
        calculateMetadata={async ({ props }) => {
          const videoProps = props as unknown as VideoProps
          const duration = calculateTotalDuration(videoProps.scenes)
          return {
            durationInFrames: duration || 300,
          }
        }}
      />
    </>
  )
}
