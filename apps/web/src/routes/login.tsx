import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'
import { getSession } from '#/lib/session'
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
    try {
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

          {!sent && (
            <>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={() =>
                  authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })
                }
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.4 7.5 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.5-2.7-.1.1C.5 8.9 0 10.4 0 12s.5 3.1 1.5 4.5l3.7-2.1z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.6c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.6 1.5 6.6l3.7 2.9c1-2.9 3.7-4.9 6.8-4.9z"
                  />
                </svg>
                Continue with Google
              </Button>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Powering AI to shop online
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
