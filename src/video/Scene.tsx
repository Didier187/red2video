import React from 'react'
import { AbsoluteFill, Img, Audio, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'

interface SceneProps {
  text: string
  imageDataUrl?: string
  audioDataUrl?: string
  durationInFrames: number
}

export const Scene: React.FC<SceneProps> = ({
  text,
  imageDataUrl,
  audioDataUrl,
  durationInFrames
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Fade in/out effect
  const opacity = interpolate(
    frame,
    [0, fps * 0.5, durationInFrames - fps * 0.5, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Subtle zoom effect on image
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Text animation
  const textY = interpolate(frame, [0, fps * 0.3], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* Background Image */}
      {imageDataUrl && (
        <AbsoluteFill style={{ opacity }}>
          <Img
            src={imageDataUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale})`,
            }}
          />
          {/* Gradient overlay for text readability */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '40%',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            }}
          />
        </AbsoluteFill>
      )}

      {/* Text overlay */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '0 80px 100px',
          opacity,
        }}
      >
        <div
          style={{
            transform: `translateY(${textY}px)`,
            maxWidth: '80%',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 36,
              color: 'white',
              textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {text}
          </p>
        </div>
      </AbsoluteFill>

      {/* Audio */}
      {audioDataUrl && <Audio src={audioDataUrl} />}
    </AbsoluteFill>
  )
}
