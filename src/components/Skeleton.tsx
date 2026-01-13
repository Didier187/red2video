interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[#e2e2e2] dark:bg-[#333] rounded ${className}`}
    />
  )
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="atlas-card p-8 mb-6">
      <div className="corner-bl" />
      <div className="corner-br" />
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-6 w-3/4 mb-3" />
      <SkeletonText lines={2} />
      <Skeleton className="h-10 w-40 mt-6" />
    </div>
  )
}

export function SkeletonSceneCard() {
  return (
    <div className="bg-[#f8f8f8] dark:bg-[#1a1a1a] rounded-lg p-4 border border-[#e2e2e2] dark:border-[#333]">
      <div className="flex gap-4">
        {/* Image skeleton */}
        <Skeleton className="w-32 h-20 rounded shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonSceneList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonSceneCard key={i} />
      ))}
    </div>
  )
}
