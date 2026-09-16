import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Wallet, ShoppingBag, Key, ChevronRight } from 'lucide-react'

export const Route = createFileRoute('/_protected/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { user } = Route.useRouteContext()

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back, {user.name ?? user.email}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Wallet balance" value="$0.00" />
        <StatCard icon={<ShoppingBag className="h-4 w-4" />} label="Orders placed" value="0" />
        <StatCard icon={<Key className="h-4 w-4" />} label="API key" value="Not generated" />
      </div>

      {/* MCP Setup */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-1 text-sm font-semibold">MCP Setup</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Add this to your Claude Desktop config to start shopping with your agent.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-secondary p-4 text-xs text-foreground/80">{`{
  "mcpServers": {
    "payo": {
      "type": "http",
      "url": "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}</pre>
          <div className="mt-4 flex items-center gap-2">
            <Button size="sm" asChild>
              <Link to="/settings">Generate API key <ChevronRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Top up wallet */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-1 text-sm font-semibold">Top up wallet</h2>
          <p className="text-xs text-muted-foreground">
            Add funds to your wallet to let your agent place orders on your behalf.
          </p>
          <Button size="sm" className="mt-4" disabled>
            Add funds — coming soon
          </Button>
        </CardContent>
      </Card>

    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <p className="text-xs font-medium">{label}</p>
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  )
}
