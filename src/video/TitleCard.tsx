import React from 'react'
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion'
import { fonts } from './fonts'
import { CornerBracket } from './CornerBracket'

interface TitleCardProps {
  title: string
  subtitle?: string
}

export const TitleCard: React.FC<TitleCardProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // Smooth fade in with spring
  const fadeInSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: Math.round(fps * 0.5),
  })

  // Fade out with easing
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fps * 0.5, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.in(Easing.quad),
    },
  )

  // Combined opacity
  const opacity = frame < durationInFrames - fps * 0.5 ? fadeInSpring : fadeOut

  // Title animation with spring (bouncy entrance)
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  })
  const titleY = interpolate(titleSpring, [0, 1], [50, 0])
  const titleScale = interpolate(titleSpring, [0, 1], [0.9, 1])

  // Subtitle animation (delayed, smooth)
  const subtitleSpring = spring({
    frame: frame - Math.round(fps * 0.3),
    fps,
    config: { damping: 200 },
  })
  const subtitleOpacity = interpolate(subtitleSpring, [0, 1], [0, 1])

  // Corner brackets scale in
  const bracketSpring = spring({
    frame: frame - Math.round(fps * 0.2),
    fps,
    config: { damping: 15, stiffness: 120 },
  })
  const bracketScale = interpolate(bracketSpring, [0, 1], [0, 1])

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
          transform: `translateY(${titleY}px) scale(${titleScale})`,
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        <h1
          style={{
            fontFamily: fonts.playfair,
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
              fontFamily: fonts.ibmPlex,
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

      {/* Corner decorations with animated scale */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          transform: `scale(${bracketScale})`,
        }}
      >
        <CornerBracket rotation={0} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: 40,
          transform: `scale(${bracketScale})`,
        }}
      >
        <CornerBracket rotation={90} />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 40,
          transform: `scale(${bracketScale})`,
        }}
      >
        <CornerBracket rotation={-90} />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          transform: `scale(${bracketScale})`,
        }}
      >
        <CornerBracket rotation={180} />
      </div>
    </AbsoluteFill>
  )
}
