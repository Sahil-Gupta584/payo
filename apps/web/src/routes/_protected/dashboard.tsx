import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc } from '#/orpc/client'
import { Card, CardContent } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Separator } from '#/components/ui/separator'
import { Input } from '#/components/ui/input'
import {
  Wallet,
  ShoppingBag,
  MapPin,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Package,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

export const Route = createFileRoute('/_protected/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { user } = Route.useRouteContext()
  const qc = useQueryClient()

  // Queries
  const { data: balanceData, isLoading: balanceLoading } = useQuery(
    orpc.wallet.getBalance.queryOptions(),
  )
  const { data: ordersData, isLoading: ordersLoading } = useQuery(
    orpc.orders.list.queryOptions(),
  )
  const { data: addresses = [], isLoading: addressesLoading } = useQuery(
    orpc.addresses.list.queryOptions(),
  )

  const latestAddress = addresses[0]

  const liveOrders = ordersData?.live ?? []
  const pastOrders = ordersData?.past ?? []
  const totalOrdersCount = liveOrders.length + pastOrders.length

  const formattedBalance = balanceData
    ? `$${((balanceData.balance ?? 0) / 100).toFixed(2)}`
    : '$0.00'

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user.name ?? user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" asChild variant="outline">
            <Link to="/settings" search={{ tab: 'addresses' }}>
              <MapPin className="mr-1.5 h-3.5 w-3.5" />
              Manage addresses
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/topup">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Top up wallet
            </Link>
          </Button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* 1. Wallet Balance Card */}
        <Card className="transition-all hover:border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Wallet Balance</span>
              <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight">
                {balanceLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  formattedBalance
                )}
              </span>
              <Button size="sm" variant="secondary" className="h-8 gap-1 px-2.5 text-xs font-medium" asChild>
                <Link to="/topup">
                  <Plus className="h-3.5 w-3.5" />
                  Top up
                </Link>
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Available for autonomous agent purchases
            </p>
          </CardContent>
        </Card>

        {/* 2. Total Orders Card */}
        <Card className="transition-all hover:border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Orders</span>
              <div className="rounded-full bg-blue-500/10 p-2 text-blue-600">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight">
                {ordersLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  totalOrdersCount
                )}
              </span>
              {liveOrders.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {liveOrders.length} active
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {pastOrders.length} completed orders across platforms
            </p>
          </CardContent>
        </Card>

        {/* 3. Delivery Address Card (replaces illogical API key card) */}
        <Card className="transition-all hover:border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Saved Addresses</span>
              <div className="rounded-full bg-violet-500/10 p-2 text-violet-500">
                <MapPin className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              {addressesLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : latestAddress ? (
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-semibold tracking-tight truncate max-w-[170px]">
                      {latestAddress.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {addresses.length} saved
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {latestAddress.recipientName} • {latestAddress.city}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    No address set
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add an address for agent orders
                  </p>
                </div>
              )}
            </div>
            <div className="mt-2 flex justify-end">
              <Link
                to="/settings"
                search={{ tab: 'addresses' }}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {latestAddress ? 'Manage addresses' : 'Add address'}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Live Orders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Live Orders</h2>
            {liveOrders.length > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </div>
          {liveOrders.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {liveOrders.length} in progress
            </Badge>
          )}
        </div>

        {ordersLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading orders...
            </CardContent>
          </Card>
        ) : liveOrders.length === 0 ? (
          /* Engaging empty state when no active orders */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="rounded-full bg-secondary p-3 text-muted-foreground mb-3">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No active orders right now</h3>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                When your AI agent shops on Blinkit, Flipkart, or Instamart, real-time order tracking and OTP verification will appear right here.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/settings" search={{ tab: 'api-keys' }}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                    Connect AI Agent (MCP)
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {liveOrders.map((orderItem: any) => (
              <LiveOrderCard key={orderItem.id} order={orderItem} onUpdate={() => qc.invalidateQueries({ queryKey: orpc.orders.list.key() })} />
            ))}
          </div>
        )}
      </div>

      {/* Section Divider */}
      <Separator className="my-6" />

      {/* Section 2: Past Orders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Past Orders</h2>
            <p className="text-xs text-muted-foreground">
              History of all fulfilled and completed agent orders
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {pastOrders.length} {pastOrders.length === 1 ? 'order' : 'orders'}
          </span>
        </div>

        {ordersLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading past orders...
            </CardContent>
          </Card>
        ) : pastOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm font-medium text-muted-foreground">No past orders yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your completed transactions and delivery receipts will be logged here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/70 text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Platform</th>
                    <th className="px-4 py-3">Item / Description</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {pastOrders.map((order: any) => {
                    const amountFormatted = order.amount
                      ? `$${(order.amount / 100).toFixed(2)}`
                      : '—'
                    const platformName = order.platform || 'Blinkit'

                    return (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <PlatformBadge platform={platformName} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground truncate max-w-[240px]">
                            {order.productName || 'Order item'}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">
                            ID: {order.id.slice(0, 8)}...
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                          {order.paymentMethod ? (
                            <Badge variant="outline" className="text-[11px] font-normal">
                              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'SBI Card'}
                            </Badge>
                          ) : (
                            'Wallet'
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {amountFormatted}
                        </td>
                        <td className="px-4 py-3">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* MCP Integration Helper */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">Connect Claude Desktop or OpenCode CLI</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Install the Payo MCP server to enable autonomous quick-commerce shopping.
              </p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link to="/settings" search={{ tab: 'api-keys' }}>
                View API Keys & MCP Config <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PlatformBadge({ platform }: { platform: string }) {
  const p = platform.toLowerCase()
  if (p.includes('blinkit')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500 border border-yellow-500/20">
        Blinkit
      </span>
    )
  }
  if (p.includes('flipkart')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500 border border-blue-500/20">
        Flipkart
      </span>
    )
  }
  if (p.includes('swiggy') || p.includes('instamart')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-500 border border-orange-500/20">
        Instamart
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-500/10 px-2 py-0.5 text-xs font-medium text-zinc-400 border border-zinc-500/20">
      {platform}
    </span>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  if (status === 'confirmed') {
    return (
      <Badge variant="secondary" className="text-xs">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmed
      </Badge>
    )
  }
  if (status === 'failed') {
    return (
      <Badge variant="destructive" className="text-xs">
        <XCircle className="mr-1 h-3 w-3" /> Failed
      </Badge>
    )
  }
  if (status === 'cancelled') {
    return (
      <Badge variant="outline" className="text-xs">
        Cancelled
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-xs">
      <Clock className="mr-1 h-3 w-3" /> {status}
    </Badge>
  )
}

function LiveOrderCard({ order, onUpdate }: { order: any; onUpdate: () => void }) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const isAwaitingOtp = order.status === 'awaiting_otp'

  const otpMut = useMutation(
    orpc.orders.submitOtp.mutationOptions({
      onSuccess: () => {
        onUpdate()
      },
      onError: (err: any) => {
        setError(err.message || 'OTP verification failed')
      },
    }),
  )

  const handleSubmitOtp = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }
    otpMut.mutate({ orderId: order.id, otp })
  }

  return (
    <Card variant="warning">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PlatformBadge platform={order.platform || 'Blinkit'} />
              <Badge variant="outline" className="border-amber-300 bg-amber-100/90 text-amber-900 text-xs font-semibold">
                <Clock className="mr-1 h-3 w-3 animate-pulse text-amber-700" />
                {isAwaitingOtp ? 'Action Required: Enter OTP' : 'Processing Order'}
              </Badge>
            </div>
            <h4 className="text-base font-semibold text-foreground">
              {order.productName || 'Order in progress'}
            </h4>
            <p className="text-xs text-muted-foreground">
              Amount: <span className="font-semibold text-foreground">${order.amount ? (order.amount / 100).toFixed(2) : '0.00'}</span>
              {' '}· Placed {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {isAwaitingOtp ? (
            <div className="rounded-lg border border-amber-300/80 bg-white p-3 sm:max-w-md shadow-xs">
              <p className="text-xs font-semibold text-amber-900 mb-1.5 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                Bank OTP sent to registered mobile
              </p>
              <form onSubmit={handleSubmitOtp} className="flex gap-2">
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="h-8 w-32 font-mono text-center tracking-widest bg-white border-amber-300 text-foreground"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={otpMut.isPending || otp.length !== 6}
                  className="h-8 bg-amber-600 text-white hover:bg-amber-700 font-medium"
                >
                  {otpMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm'}
                </Button>
              </form>
              {error && <p className="mt-1 text-[11px] text-destructive font-medium">{error}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-800 font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              <span>Browser automation placing order on platform...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
