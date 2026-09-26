import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Client-only wrapper — Mux Player is a web component, never render on server.
export function LaunchVideo() {
  const [Player, setPlayer] = useState<any>(null)

  useEffect(() => {
    import('@mux/mux-player-react/lazy').then((m) => setPlayer(() => m.default))
  }, [])

  return (
    <div className="w-full">
      <div className=" ">
        <p className="mt-3 text-2xl mb-2 font-medium text-center">
          Watch Payo order snacks through Cursor.
        </p>
        {Player ? (
          <Player
            src="/launch-video.mp4"
            title="Payo"
            // primaryColor="#2563eb"
            accentColor="#2563eb"
            preload="metadata"
            loading="viewport"
            disableTracking
            disableCookies
            metadata={{ video_title: 'Payo launch' }}
            className="bg-transparent p-0 w-full border-8 border-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.25)] overflow-clip rounded-2xl"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-neutral-950">

            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        )}
      </div>
    </div>
  )
}
