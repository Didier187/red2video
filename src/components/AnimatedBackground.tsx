export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
      <svg
        className="w-[800px] h-[800px] opacity-10 rotate-cw-slow"
        viewBox="0 0 400 400"
      >
        <circle
          cx="200"
          cy="200"
          r="180"
          fill="none"
          stroke="#85d7ff"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
      </svg>
      <svg
        className="absolute w-[600px] h-[600px] opacity-10 rotate-ccw-slow"
        viewBox="0 0 400 400"
      >
        <circle
          cx="200"
          cy="200"
          r="180"
          fill="none"
          stroke="#ff6e41"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
      </svg>
    </div>
  )
}
