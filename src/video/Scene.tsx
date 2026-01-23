import React from 'react'
import {
  AbsoluteFill,
  Img,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion'
import { fonts } from './fonts'

interface SceneProps {
  text: string
  imageDataUrl?: string
  audioDataUrl?: string
  durationInFrames: number
  isLastScene?: boolean
}

export const Scene: React.FC<SceneProps> = ({
  text,
  imageDataUrl,
  audioDataUrl,
  durationInFrames,
  isLastScene = false,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Smooth fade in using spring (no bounce)
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

  // Combined opacity (fade in then fade out)
  const opacity = frame < durationInFrames - fps * 0.5 ? fadeInSpring : fadeOut

  // Subtle zoom effect on image with easing
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  })

  // Text animation with spring
  const textSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: Math.round(fps * 0.4),
  })
  const textY = interpolate(textSpring, [0, 1], [30, 0])

  // CTA animation for last scene (appears in last 2.5 seconds)
  const ctaStartFrame = durationInFrames - fps * 2.5
  const ctaSpring = spring({
    frame: frame - ctaStartFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  })
  const ctaOpacity = isLastScene
    ? interpolate(frame, [ctaStartFrame, ctaStartFrame + fps * 0.4], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0
  const ctaScale = isLastScene ? interpolate(ctaSpring, [0, 1], [0.8, 1]) : 1

  // Audio volume fade in/out for smooth transitions
  const audioVolume = (f: number) =>
    interpolate(
      f,
      [0, fps * 0.2, durationInFrames - fps * 0.3, durationInFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    )

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
              height: '50%',
              background:
                'linear-gradient(transparent, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.9))',
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
              fontFamily: fonts.ibmPlex,
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

      {/* CTA overlay for last scene */}
      {isLastScene && ctaOpacity > 0 && (
        <AbsoluteFill
          style={{
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingTop: 80,
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              padding: '20px 50px',
              borderRadius: 12,
              border: '2px solid rgba(133, 215, 255, 0.5)',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
            }}
          >
            <p
              style={{
                fontFamily: fonts.ibmPlex,
                fontSize: 28,
                color: 'white',
                margin: 0,
                textAlign: 'center',
                letterSpacing: '0.05em',
              }}
            >
              <span style={{ color: '#ff6e41' }}>Like</span>
              {' \u2022 '}
              <span style={{ color: '#85d7ff' }}>Comment</span>
              {' \u2022 '}
              <span style={{ color: '#ff4444' }}>Subscribe</span>
            </p>
          </div>
        </AbsoluteFill>
      )}

      {/* Audio with volume fade in/out */}
      {audioDataUrl && <Audio src={audioDataUrl} volume={audioVolume} />}
    </AbsoluteFill>
  )
}
