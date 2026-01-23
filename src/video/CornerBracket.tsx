import React from 'react'

interface CornerBracketProps {
  rotation: number
  color?: string
  size?: number
}

export const CornerBracket: React.FC<CornerBracketProps> = ({
  rotation,
  color = '#85d7ff',
  size = 30,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderTop: `2px solid ${color}`,
      borderLeft: `2px solid ${color}`,
      transform: `rotate(${rotation}deg)`,
    }}
  />
)
