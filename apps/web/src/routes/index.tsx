import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { getSession } from '#/lib/session'
import { client } from '#/orpc/client'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await getSession()
    if (session?.user) throw redirect({ to: '/dashboard' })
  },
  component: LandingPage,
})

function LandingPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      await client.waitlist.join({ email })
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{
        fontFamily: '"Nunito", sans-serif',
        fontOpticalSizing: 'auto',
        background: `
          radial-gradient(ellipse at 15% 15%, rgba(94,214,210,0.35) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 10%, rgba(90,175,250,0.3) 0%, transparent 50%),
          radial-gradient(ellipse at 70% 75%, rgba(100,220,205,0.25) 0%, transparent 50%),
          radial-gradient(ellipse at 30% 80%, rgba(130,190,255,0.2) 0%, transparent 50%),
          #f0fbfb
        `,
      } as React.CSSProperties}
    >

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
        <div className='size-7'></div>
        <nav
          className="flex w-full max-w-3xl items-center justify-between rounded-2xl px-5 py-3 backdrop-blur-2xl"
          style={{
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <Link to="/" className="flex items-center no-underline">
            <img src="/favicon.png" alt="Payo" className="h-8 w-8 mix-blend-multiply" />
            <span className="text-[15px] font-extrabold tracking-tight text-foreground">Payo</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="text-foreground hover:text-foreground">
              <Link to="/login" className="no-underline">Sign in</Link>
            </Button>
            <a
              href="https://x.com/sahil_builds"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold no-underline transition-opacity duration-[var(--duration-quick)] hover:opacity-80"
              style={{ color: 'white' }}
            >
              Get access
            </a>
          </div>
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <main className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-16 pt-32">

        {/* Flow visual */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <div className="rounded-2xl px-4 py-3 backdrop-blur-xl"
            style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <p className="text-[11px] text-muted-foreground mb-0.5 flex items-center gap-1.5">
              <img src="/claude-icon.ico" alt="Claude" className="h-4 w-4 rounded-sm" />
              Claude
            </p>
            <p className="text-sm font-semibold text-foreground">Order me peanut butter 🥜</p>
          </div>
          <div className="text-muted-foreground text-sm">→</div>
          <div className="rounded-2xl px-4 py-3 backdrop-blur-xl"
            style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,122,255,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <p className="text-[11px] text-primary mb-0.5">Confirm OTP</p>
            <p className="text-sm font-semibold text-foreground tracking-widest">••••••</p>
          </div>
          <div className="text-muted-foreground text-sm">→</div>
          <div className="rounded-2xl px-4 py-3 backdrop-blur-xl"
            style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <p className="text-[11px] text-muted-foreground mb-0.5 flex items-center gap-1.5">
              <img src="/claude-icon.ico" alt="Claude" className="h-4 w-4 rounded-sm" />
              Claude
            </p>
            <p className="text-sm font-semibold text-foreground">✅ Order placed · $2.75 debited</p>
          </div>
        </div>

        <Badge
          variant="outline"
          className="mb-5 rounded-full backdrop-blur-sm"
          style={{
            background: 'rgba(255,255,255,0.55)',
            color: 'var(--primary)',
          }}
        >
          Invite only
        </Badge>

        {/* Hero visual area */}
        <div className="mb-8 flex flex-col items-center gap-6">

          <h1
            className="max-w-xl px-4 text-center text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl"
            style={{ color: 'rgba(0,0,0,0.88)', fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Your agents can finally{' '}
            <svg
              viewBox="0 0 110 42"
              className="inline-block h-[1.15em] w-auto overflow-visible align-baseline"
              style={{ transform: 'translateY(0.14em)', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.12))', marginLeft: '-23px' }}
              aria-label="buy."
            >
              <text
                x="50%"
                y="68%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '36px',
                  fontWeight: 800,
                  fill: 'white',
                  stroke: '#0071E3',
                  strokeWidth: 10,
                  strokeLinejoin: 'round',
                  strokeLinecap: 'round',
                  paintOrder: 'stroke',
                }}
              >
                buy.
              </text>
            </svg>
          </h1>

          <p className="max-w-md text-center text-[17px] leading-relaxed text-muted-foreground">
            Payo gives AI agents a secure way to search, order, and pay online, always within the limits you set.
          </p>

        </div>

        {/* Email form */}
        <div className="w-full max-w-md">
          {status === 'success' ? (
            <div
              className="state-enter rounded-2xl px-6 py-4 text-center backdrop-blur-xl"
              style={{ background: 'rgba(255,255,255,0.6)' }}
            >
              <p className="text-[15px] font-semibold text-foreground">You're on the list.</p>
              <p className="mt-1 text-sm text-muted-foreground">We'll reach out when your spot is ready.</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-2 rounded-2xl p-2 backdrop-blur-xl sm:flex-row"
              style={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid rgba(255,255,255,0.7)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={status === 'loading'}
                className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-foreground/40"
              />
              <Button
                type="submit"
                disabled={status === 'loading'}
                className="rounded-xl sm:whitespace-nowrap"
              >
                {status === 'loading' ? 'Sending…' : 'Get early access'}
              </Button>
            </form>
          )}
          {status === 'error' && (
            <p className="mt-2 text-center text-xs text-destructive">Something went wrong. Try again.</p>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Built for Claude, OpenCode, and any MCP-compatible agent.
        </p>

        {/* How it works */}
        <div className="mt-20 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {[
            { step: '1', title: 'Search', desc: 'Agent calls search_products and picks what you need from Instamart.' },
            { step: '2', title: 'Order', desc: 'Browser automation handles the cart, card entry, and checkout.' },
            { step: '3', title: 'Confirm', desc: 'You share the OTP. Wallet is debited. Order is placed.' },
          ].map(({ step, title, desc }) => (
            <Card
              key={step}
              className="border-0 backdrop-blur-xl"
              style={{ background: 'rgba(255,255,255,0.92)' }}
            >
              <CardContent className="p-5">
                <div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
                  {step}
                </div>
                <h3 className="mb-1 text-[15px] font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative pb-8 text-center">
        <p className="text-xs text-muted-foreground">© 2026 Payo · Powering AI to shop online</p>
      </footer>
    </div>
  )
}
