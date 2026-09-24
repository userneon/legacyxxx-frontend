/**
 * LEGACY-X image delivery: direct static/CDN image URLs with intrinsic dimensions,
 * decode scheduling, native lazy loading, priority loading, and a non-network fallback.
 */
import { useEffect, useState, type ImgHTMLAttributes } from "react"

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='8' fill='%23181818'/%3E%3Cpath d='M16 44 27 32l8 8 6-6 7 10H16Z' fill='%23525252'/%3E%3Ccircle cx='25' cy='24' r='4' fill='%236b6b6b'/%3E%3C/svg%3E"

type OptimizedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height" | "loading"> & {
  src: string
  width: number
  height: number
  priority?: boolean
  fallbackSrc?: string
}

export function OptimizedImage({
  src,
  width,
  height,
  priority = false,
  fallbackSrc = FALLBACK_IMAGE,
  alt,
  onError,
  ...props
}: OptimizedImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src)

  useEffect(() => setResolvedSrc(src), [src])

  return (
    <img
      {...props}
      src={resolvedSrc}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={(event) => {
        if (resolvedSrc !== fallbackSrc) setResolvedSrc(fallbackSrc)
        onError?.(event)
      }}
    />
  )
}

export { FALLBACK_IMAGE }
