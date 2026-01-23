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

interface OutroCardProps {
  channelName?: string
  socialHandle?: string
}

export const OutroCard: React.FC<OutroCardProps> = ({
  channelName,
  socialHandle,
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // Overall fade in with spring
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

  // "Thanks for watching" text animation with spring
  const thanksSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  })
  const thanksY = interpolate(thanksSpring, [0, 1], [40, 0])
  const thanksOpacity = interpolate(thanksSpring, [0, 1], [0, 1])

  // Subscribe button animation with bouncy spring (appears after text)
  const buttonSpring = spring({
    frame: frame - Math.round(fps * 0.5),
    fps,
    config: { damping: 10, stiffness: 100 },
  })
  const buttonScale = interpolate(buttonSpring, [0, 1], [0, 1])

  // Pulse effect for button (after it appears) - smoother sine wave
  const pulsePhase =
    frame > fps * 0.8 ? Math.sin((frame - fps * 0.8) * 0.08) : 0
  const buttonPulse = 1 + pulsePhase * 0.03

  // Bell shake animation with spring-like dampening
  const bellShakeIntensity =
    frame > fps * 1.2
      ? Math.sin((frame - fps * 1.2) * 0.4) *
        Math.exp(-((frame - fps * 1.2) * 0.02))
      : 0
  const bellShake = bellShakeIntensity * 15

  // Social/channel info animation with spring (appears last)
  const socialSpring = spring({
    frame: frame - Math.round(fps * 1.2),
    fps,
    config: { damping: 200 },
  })
  const socialOpacity = interpolate(socialSpring, [0, 1], [0, 1])
  const socialY = interpolate(socialSpring, [0, 1], [20, 0])

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
          width: 500,
          height: 500,
          border: '1px solid rgba(133, 215, 255, 0.2)',
          borderRadius: '50%',
          transform: `rotate(${frame * 0.3}deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          border: '1px dashed rgba(255, 110, 65, 0.15)',
          borderRadius: '50%',
          transform: `rotate(${-frame * 0.2}deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 700,
          height: 700,
          border: '1px solid rgba(133, 215, 255, 0.1)',
          borderRadius: '50%',
          transform: `rotate(${frame * 0.15}deg)`,
        }}
      />

      {/* Main content */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        {/* Thanks message */}
        <div
          style={{
            transform: `translateY(${thanksY}px)`,
            opacity: thanksOpacity,
            marginBottom: 40,
          }}
        >
          <h1
            style={{
              fontFamily: fonts.playfair,
              fontSize: 56,
              color: 'white',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Thanks for watching!
          </h1>
        </div>

        {/* Subscribe button */}
        <div
          style={{
            transform: `scale(${buttonScale * buttonPulse})`,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              backgroundColor: '#ff4444',
              padding: '16px 40px',
              borderRadius: 8,
              boxShadow: '0 4px 20px rgba(255, 68, 68, 0.4)',
            }}
          >
            {/* Bell icon SVG */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="white"
              style={{
                transform: `rotate(${bellShake}deg)`,
                transformOrigin: 'top center',
              }}
            >
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
            </svg>
            <span
              style={{
                fontFamily: fonts.ibmPlex,
                fontSize: 24,
                color: 'white',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Subscribe
            </span>
          </div>
        </div>

        {/* Channel name */}
        {channelName && (
          <p
            style={{
              fontFamily: fonts.ibmPlex,
              fontSize: 20,
              color: '#85d7ff',
              margin: 0,
              opacity: socialOpacity,
              transform: `translateY(${socialY}px)`,
              letterSpacing: '0.05em',
            }}
          >
            {channelName}
          </p>
        )}

        {/* Social handle */}
        {socialHandle && (
          <p
            style={{
              fontFamily: fonts.ibmPlex,
              fontSize: 16,
              color: '#ff6e41',
              marginTop: 12,
              opacity: socialOpacity,
              transform: `translateY(${socialY}px)`,
            }}
          >
            {socialHandle}
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
