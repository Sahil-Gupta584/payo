import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'
import { getSession } from '#/lib/session'
import { client } from '#/orpc/client'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Card, CardContent } from '#/components/ui/card'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getSession()
    if (session?.user) throw redirect({ to: '/dashboard' })
  },
  component: LoginPage,
})

function LoginPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [notInvited, setNotInvited] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your full name')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    setLoading(true)
    setError('')
    setNotInvited(false)
    try {
      const { allowed } = await client.invite.check({
        email: email.trim(),
        name: name.trim(),
      })
      if (!allowed) {
        setNotInvited(true)
        setLoading(false)
        return
      }
      await authClient.signIn.magicLink({
        email: email.trim(),
        name: name.trim(),
        callbackURL: '/dashboard',
      } as any)
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

      <Card className="relative w-full max-w-sm bg-card/80 backdrop-blur-xl shadow-2xl">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
              <img src="/favicon.png" alt="Payo" className="h-12 w-12 mix-blend-multiply" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Payo</h1>
            <p className="mt-1 text-sm text-muted-foreground">Let your AI agent shop for you</p>
          </div>

          {sent ? (
            <div className="state-enter rounded-xl border bg-muted p-6 text-center">
              <p className="text-sm font-medium">Check your email</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We sent a login link to <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
          ) : notInvited ? (
            <div className="state-enter rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center">
              <p className="text-sm font-medium">Not on the invite list</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{email}</span> is not invited yet.
              </p>
              <Button variant="link" size="sm" onClick={() => setNotInvited(false)} className="mt-4 h-auto p-0 text-xs">
                Try a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-name" className="text-xs font-medium text-muted-foreground">
                  Your Name
                </label>
                <Input
                  id="login-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Sahil Gupta"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-email" className="text-xs font-medium text-muted-foreground">
                  Email Address
                </label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending...' : 'Send magic link'}
              </Button>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Invite only — request access on{' '}
            <a href="https://x.com/sahil_builds" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-foreground">
              X
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
