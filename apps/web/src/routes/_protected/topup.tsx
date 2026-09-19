import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { orpc } from '#/orpc/client'
import { Card, CardContent } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Wallet, ArrowDownLeft, ArrowUpRight, CheckCircle2, Sparkles, Loader2, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/topup')({
  component: TopupPage,
})

const PRESETS = [10, 25, 50, 100]

function TopupPage() {
  const [dollarAmount, setDollarAmount] = useState<number>(25)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: balanceData, isLoading: balanceLoading } = useQuery(
    orpc.wallet.getBalance.queryOptions(),
  )
  const { data: history = [], isLoading: historyLoading } = useQuery(
    orpc.wallet.getHistory.queryOptions(),
  )

  const balanceDollars = ((balanceData?.balance ?? 0) / 100).toFixed(2)

  const checkoutMut = useMutation(
    orpc.wallet.createCheckout.mutationOptions({
      onSuccess: (res) => {
        if (res.url) {
          window.location.href = res.url
        } else {
          setErrorMsg('Failed to generate checkout session url')
        }
      },
      onError: (err: any) => {
        setErrorMsg(err.message || 'Failed to initiate checkout')
      },
    }),
  )

  const handleCheckout = () => {
    setErrorMsg(null)
    const cents = Math.round(dollarAmount * 100)
    if (cents <= 0 || isNaN(cents)) {
      setErrorMsg('Please enter a valid amount greater than $0')
      return
    }
    checkoutMut.mutate({
      amount: cents,
      returnUrl: window.location.origin + '/dashboard',
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Top Up Wallet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add funds to your Payo shopping wallet. Your AI agent uses this balance to place orders.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Left column: Top up form (3 cols) */}
        <div className="space-y-6 md:col-span-3">
          <Card className="shadow-xs">
            <CardContent className="p-6">
              <div className="flex items-center justify-between pb-4 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-extrabold tracking-tight">
                      {balanceLoading ? '...' : `$${balanceDollars}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Selection */}
              <div className="mt-6 flex flex-col gap-3">
                <label className="text-sm font-semibold">Select or enter amount (USD)</label>

                {/* Preset Chips */}
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.map((amt) => {
                    const selected = dollarAmount === amt
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDollarAmount(amt)}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all active:scale-[0.98] ${
                          selected
                            ? 'border-primary bg-primary/15 text-primary ring-1 ring-primary/30 shadow-xs'
                            : 'border-border/70 bg-card text-foreground ring-1 ring-foreground/[0.03] hover:bg-secondary/70 hover:border-border hover:ring-foreground/10 shadow-2xs'
                        }`}
                      >
                        ${amt}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Amount Input */}
                <div className="relative mt-2">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-muted-foreground">
                    $
                  </span>
                  <Input
                    name="amount"
                    autoComplete="off"
                    type="number"
                    min="1"
                    step="1"
                    value={dollarAmount || ''}
                    onChange={(e) => setDollarAmount(Number(e.target.value))}
                    className="pl-8 h-12 text-lg font-semibold bg-background/50 border-border/60 focus-visible:ring-primary"
                    placeholder="Custom amount"
                  />
                </div>

                {errorMsg && (
                  <p className="text-xs font-medium text-destructive">{errorMsg}</p>
                )}

                {/* Checkout CTA */}
                <Button
                  onClick={handleCheckout}
                  disabled={checkoutMut.isPending || !dollarAmount || dollarAmount <= 0}
                  className="w-full h-11 text-sm font-semibold mt-2 shadow-md shadow-primary/20"
                >
                  {checkoutMut.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting to secure checkout...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Top up ${dollarAmount || 0} via Card / UPI
                    </>
                  )}
                </Button>

                <p className="text-center text-[11px] text-muted-foreground">
                  Secured by Dodo Payments. Supports International Cards, Apple Pay, Google Pay & UPI.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Quick perks & info (2 cols) */}
        <div className="space-y-4 md:col-span-2">
          <Card className="shadow-xs">
            <CardContent className="p-5 space-y-3.5">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                How top-up works
              </h3>
              <ul className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">1.</span>
                  <span>Select top-up amount and complete checkout via Dodo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">2.</span>
                  <span>Funds are credited directly to your Payo account instantly.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">3.</span>
                  <span>Your AI agent can automatically purchase items without asking for payment details.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Transaction History</h2>
          <p className="text-xs text-muted-foreground">Past credits and order debits on your account.</p>
        </div>

        <Card className="overflow-hidden shadow-xs">
          <CardContent className="p-0">
            {historyLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading transactions...</div>
            ) : history.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Wallet className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No transactions yet</p>
                <p className="text-xs text-muted-foreground">Top up above to start shopping with your agent.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40 overflow-x-auto">
                {history.map((tx: any) => {
                  const isCredit = tx.type === 'credit'
                  const amtDollars = (tx.amount / 100).toFixed(2)
                  const balanceAfter = tx.balanceAfter != null ? (tx.balanceAfter / 100).toFixed(2) : null
                  const dateStr = new Date(tx.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-full p-2 ${
                            isCredit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {tx.description || (isCredit ? 'Wallet Top-up' : 'Order Payment')}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{dateStr}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={`text-sm font-bold tracking-tight ${
                            isCredit ? 'text-emerald-400' : 'text-foreground'
                          }`}
                        >
                          {isCredit ? `+` : `-`}${amtDollars}
                        </p>
                        {balanceAfter && (
                          <p className="text-[11px] text-muted-foreground">Bal: ${balanceAfter}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
