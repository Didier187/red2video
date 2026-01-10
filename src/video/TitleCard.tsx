import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'

interface TitleCardProps {
  title: string
  subtitle?: string
}

export const TitleCard: React.FC<TitleCardProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // Fade in/out
  const opacity = interpolate(
    frame,
    [0, fps * 0.5, durationInFrames - fps * 0.5, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Title animation
  const titleY = interpolate(frame, [0, fps * 0.5], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Subtitle animation (delayed)
  const subtitleOpacity = interpolate(frame, [fps * 0.3, fps * 0.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      {/* Decorative rings */}
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          border: '1px solid rgba(133, 215, 255, 0.2)',
          borderRadius: '50%',
          transform: `rotate(${frame * 0.5}deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          border: '1px dashed rgba(255, 110, 65, 0.2)',
          borderRadius: '50%',
          transform: `rotate(${-frame * 0.3}deg)`,
        }}
      />

      {/* Title */}
      <div
        style={{
          transform: `translateY(${titleY}px)`,
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        <h1
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 72,
            color: 'white',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 18,
              color: '#85d7ff',
              marginTop: 20,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              opacity: subtitleOpacity,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Corner decorations */}
      <div style={{ position: 'absolute', top: 40, left: 40 }}>
        <CornerBracket rotation={0} />
      </div>
      <div style={{ position: 'absolute', top: 40, right: 40 }}>
        <CornerBracket rotation={90} />
      </div>
      <div style={{ position: 'absolute', bottom: 40, left: 40 }}>
        <CornerBracket rotation={-90} />
      </div>
      <div style={{ position: 'absolute', bottom: 40, right: 40 }}>
        <CornerBracket rotation={180} />
      </div>
    </AbsoluteFill>
  )
}

const CornerBracket: React.FC<{ rotation: number }> = ({ rotation }) => (
  <div
    style={{
      width: 30,
      height: 30,
      borderTop: '2px solid #85d7ff',
      borderLeft: '2px solid #85d7ff',
      transform: `rotate(${rotation}deg)`,
    }}
  />
)
