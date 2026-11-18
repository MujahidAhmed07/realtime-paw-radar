import { useEffect, useState } from 'react'

/**
 * Resolves photo URLs: handles both real http(s) URLs (Supabase Storage)
 * and local IndexedDB blob references (idb://blobs/...) used by the dev backend.
 */
export function Photo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string>('')
  useEffect(() => {
    let revoke: string | null = null
    let cancelled = false
    const resolve = async () => {
      if (!src) return
      if (src.startsWith('idb://')) {
        const { localProvider } = await import('../../services/providers/localProvider')
        const u = await (localProvider.constructor as unknown as { resolvePhotoUrl: (u: string) => Promise<string> }).resolvePhotoUrl(src)
        if (!cancelled) { revoke = u; setUrl(u) }
      } else {
        setUrl(src)
      }
    }
    resolve()
    return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke) }
  }, [src])
  if (!url) return <div className={className} aria-label={alt} />
  return <img src={url} alt={alt} className={className} loading="lazy" />
}

export function PhotoGrid({ photos, alt, className }: { photos: string[]; alt: string; className?: string }) {
  if (!photos.length) {
    return (
      <div className={'flex items-center justify-center bg-muted text-3xl dark:bg-dark-card ' + (className ?? '')} aria-label={alt}>🐾</div>
    )
  }
  if (photos.length === 1) return <Photo src={photos[0]} alt={alt} className={'h-full w-full object-cover ' + (className ?? '')} />
  return (
    <div className={'grid grid-cols-2 gap-0.5 overflow-hidden ' + (className ?? '')}>
      {photos.slice(0, 4).map((p, i) => <Photo key={i} src={p} alt={`${alt} photo ${i + 1}`} className="h-full w-full object-cover" />)}
    </div>
  )
}
