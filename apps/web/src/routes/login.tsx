import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'
import { getSession } from '#/lib/session'
import { client } from '#/orpc/client'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getSession()
    if (session?.user) throw redirect({ to: '/dashboard' })
  },
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [notInvited, setNotInvited] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotInvited(false)
    try {
      const { allowed } = await client.invite.check({ email })
      if (!allowed) {
        setNotInvited(true)
        setLoading(false)
        return
      }
      await authClient.signIn.magicLink({ email, callbackURL: '/dashboard' } as any)
      setSent(true)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <img src="/hero-image.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-background/10 backdrop-blur-[1px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/20" />

      <div className="relative w-full max-w-sm space-y-6 rounded-2xl border bg-card/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow">
            $
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Payo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Let your AI agent shop for you</p>
        </div>

        {sent ? (
          <div className="rounded-xl border bg-muted p-6 text-center">
            <p className="text-sm font-medium">Check your email</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a login link to <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
        ) : notInvited ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center">
            <p className="text-sm font-medium">Not on the invite list</p>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{email}</span> is not invited yet.
            </p>
            <button
              onClick={() => setNotInvited(false)}
              className="mt-4 text-xs font-medium underline hover:text-foreground transition"
            >
              Try a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              style={{ minHeight: 44 }}
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Invite only — request access on{' '}
          <a href="https://x.com" className="font-medium underline">
            X
          </a>
        </p>
      </div>
    </div>
  )
}
