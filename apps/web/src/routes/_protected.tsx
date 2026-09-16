import { createFileRoute, Link, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'
import { getSession } from '#/lib/session'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { LayoutDashboard, CreditCard, Settings, LogOut, User, Key } from 'lucide-react'

export const Route = createFileRoute('/_protected')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session?.user) throw redirect({ to: '/login' })
    return { user: session.user }
  },
  component: ProtectedLayout,
})

function ProtectedLayout() {
  const { user } = Route.useRouteContext()
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.navigate({ to: '/login' })
  }

  const realName = user.name && !user.name.includes('@') ? user.name : null

  const initials = realName
    ? realName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : (user.email?.[0] ?? 'U').toUpperCase()

  const displayName = realName ?? user.email ?? 'User'
  const displayEmail = user.email ?? ''

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b bg-card px-4 sm:px-6">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 no-underline">
            <img src="/favicon.png" alt="Payo" className="h-7 w-7 mix-blend-multiply" />
            <span className="text-sm font-bold tracking-tight text-foreground">Payo</span>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-[background-color] duration-[var(--duration-quick)] hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8">
                  {user.image && <AvatarImage src={user.image} alt={displayName} />}
                  <AvatarFallback className="text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:block max-w-[160px] truncate">
                  {displayName}
                </span>
                <svg
                  className="ml-0.5 h-3.5 w-3.5 text-muted-foreground"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 px-2 py-3">
                  <Avatar className="h-10 w-10">
                    {user.image && <AvatarImage src={user.image} alt={displayName} />}
                    <AvatarFallback>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => router.navigate({ to: '/dashboard' })}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => router.navigate({ to: '/dashboard' })}>
                <CreditCard className="h-4 w-4" />
                Wallet
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => router.navigate({ to: '/dashboard' })}>
                <User className="h-4 w-4" />
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => router.navigate({ to: '/dashboard' })}>
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => router.navigate({ to: '/settings' })}>
                <Key className="h-4 w-4" />
                API Keys
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                variant="destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
