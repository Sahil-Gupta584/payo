import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { client } from '#/orpc/client'
import { Button } from '#/components/ui/button'
import { Check, Loader2, ShieldCheck, ChevronDown, ArrowUp, Paperclip } from 'lucide-react'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function ClaudeCard() {
  return (
    <div
      className="w-full max-w-[700px] overflow-hidden rounded-[24px] border border-white/80 bg-[#FCFBF8]/95 text-[#1F1E1D] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.8)_inset] backdrop-blur-2xl transition-all"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* ── Window Titlebar ── */}
      <div className="flex h-11 items-center justify-between border-b border-black/[0.06] bg-[#F7F4EE]/90 px-4 backdrop-blur-md">
        {/* macOS window controls */}
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border border-[#E0443E] bg-[#FF5F56] shadow-xs" />
          <span className="h-3 w-3 rounded-full border border-[#DEA123] bg-[#FFBD2E] shadow-xs" />
          <span className="h-3 w-3 rounded-full border border-[#1AAB29] bg-[#27C93F] shadow-xs" />
        </div>

        {/* Model selector pill */}
        <div className="flex items-center gap-1.5 rounded-full border border-black/8 bg-white/70 px-3 py-1 text-[12px] font-semibold text-neutral-700 shadow-2xs">
          <img src="/claude-icon.ico" alt="Claude" className="h-3.5 w-3.5" />
          <span>Claude 3.7 Sonnet</span>
          <ChevronDown className="h-3 w-3 text-neutral-400" />
        </div>

        {/* Clean right spacer */}
        <div className="w-12" />
      </div>

      {/* ── Chat Content ── */}
      <div className="space-y-4 p-5 sm:p-6">
        {/* User Prompt */}
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-tr-xs bg-[#2F2E2B] px-4 py-2.5 text-[13.5px] font-normal text-white shadow-xs">
            Order me Pintola crunchy peanut butter from Instamart 🥜
          </div>
        </div>

        {/* Claude Reply */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#D97706]/15">
              <img src="/claude-icon.ico" alt="Claude" className="h-4 w-4" />
            </div>
            <span className="text-[13px] font-semibold text-neutral-800">Claude</span>
            <span className="text-[10.5px] font-mono text-neutral-400">18:04</span>
          </div>

          <p className="text-[13px] leading-relaxed text-neutral-700">
            Found on Swiggy Instamart and proceeding with checkout via Payo.
          </p>

          {/* MCP Tools (Vertical Alignment) */}
          <div className="flex flex-col gap-3 text-left">
            {/* Tool 1: search_products */}
            <div className="rounded-xl border border-black/[0.08] bg-white/85 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2 text-[11px] font-mono text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-600 font-bold">⚡</span>
                  <span className="font-semibold text-neutral-700">payo.search_products</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-sans font-medium text-neutral-600">
                  <Check className="h-2.5 w-2.5 text-neutral-500" /> 1 match
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-200/60 bg-amber-50/80 text-xl">
                    🥜
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-neutral-900">Pintola All-Natural PB</p>
                    <p className="text-[11px] text-neutral-500">Crunchy · 1kg · Instamart</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-bold text-neutral-900">₹349 ($4.18)</p>
                  <p className="text-[10.5px] font-medium text-blue-600">⚡ 12 mins</p>
                </div>
              </div>
            </div>

            {/* Tool 2: initiate_order & OTP authorization */}
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2 text-[11px] font-mono text-neutral-600">
                <div className="flex items-center gap-1.5">
                  <span className="text-blue-600 font-bold">🛒</span>
                  <span className="font-semibold text-neutral-800">payo.initiate_order</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100/70 px-2 py-0.5 text-[10px] font-sans font-medium text-blue-800">
                  <Loader2 className="h-2.5 w-2.5 animate-spin text-blue-600" /> Awaiting OTP
                </span>
              </div>

              {/* OTP card */}
              <div className="mt-2.5 rounded-lg border border-blue-200/60 bg-white p-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-neutral-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    Payo 2FA Approval
                  </span>
                  <span className="rounded border border-amber-200/60 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-700">
                    0:48 left
                  </span>
                </div>
                <div className="my-2.5 flex items-center justify-center gap-2">
                  {['4', '8', '2', '', '', ''].map((digit, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md border font-mono text-xs font-bold transition-all",
                        digit
                          ? "border-neutral-300 bg-neutral-50 text-neutral-900 shadow-2xs"
                          : idx === 3
                            ? "border-blue-500 bg-blue-50/50 text-blue-600 ring-2 ring-blue-500/25"
                            : "border-neutral-200 bg-neutral-50/40 text-neutral-400"
                      )}
                    >
                      {digit || (idx === 3 ? <span className="h-3.5 w-0.5 animate-pulse bg-blue-600" /> : '•')}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-[11px] text-neutral-500">
                  <span>Debit: <strong className="text-neutral-800">$4.18</strong></span>
                  <span>Wallet Balance: <strong className="text-neutral-800">$24.50</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Claude prompt bar */}
        <div className="flex items-center gap-3 rounded-xl border border-black/[0.08] bg-white/95 px-3.5 py-2 shadow-2xs">
          <Paperclip className="h-4 w-4 shrink-0 text-neutral-400" />
          <span className="flex-1 select-none text-[12px] text-neutral-400 truncate">
            Reply to Claude or provide OTP...
          </span>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#2F2E2B] text-white">
            <ArrowUp className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  )
}

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
      className="flex min-h-screen flex-col bg-cover bg-top bg-no-repeat"
      style={{ backgroundImage: 'url(/hero-image.png)', fontFamily: '"Nunito", sans-serif' }}
    >
      {/* ── Nav ── */}
      <header className="bg-transparent z-50 flex w-full justify-center px-6 sm:px-12 py-3.5 transition-all dark:border-white/10 dark:bg-black/60 dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.4)]">
        <div className="flex w-full max-w-[820px]  py-2 px-4 border roeunde rounded-full border-black/[0.08] shadow-[0_10px_8px_-8px_rgba(0,0,0,0.08)] dark:border-white/10 dark:shadow-[0_10px_8px_-8px_rgba(0,0,0,0.4)] items-center justify-between">
          <Link to="/" className="flex items-center mb-2 no-underline">
            <img src="/favicon.png" alt="Payo" className="h-8 w-8" />
            <span className="text-[16px] font-extrabold tracking-tight text-foreground">Payo</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors no-underline">
              Sign in
            </Link>
            <a
              href="https://x.com/sahil_builds"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-white! no-underline shadow-xs hover:opacity-90 transition-opacity"
            >
              Get access
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero (Centered Vertical Alignment) ── */}
      <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col items-center px-6 pt-12 pb-20 text-center">

        {/* Top: Headline & Description */}
        <div className="flex flex-col items-center max-w-[680px]">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/40">
            Payments for AI agents
          </p>

          <h1
            className="mb-4 text-[clamp(44px,5vw,66px)] font-black leading-[1.05] tracking-[-2px] text-foreground"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Your agents can<br />
            finally{' '}
            <span
              className="relative inline-block font-black text-blue-600"
              style={{
                textShadow:
                  '0 -1.5px 0 rgba(255, 255, 255, 0.9), 0 -2.5px 0 rgba(147, 197, 253, 0.75), 0 2px 10px rgba(37, 99, 235, 0.25)',
              }}
            >
              buy.
            </span>
          </h1>

          <p className="mb-8 max-w-[500px] text-[17px] leading-relaxed text-foreground/60">
            Payo gives AI agents a secure way to search, order, and pay online, always within the limits you set.
          </p>

          {/* Email form */}
          {status === 'success' ? (
            <div className="w-full max-w-[440px] rounded-2xl bg-white/90 px-5 py-4 shadow-sm border border-black/10">
              <p className="font-bold text-foreground">You're on the list.</p>
              <p className="mt-1 text-sm text-foreground/50">We'll reach out when your spot is ready.</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex w-full max-w-[440px] items-center rounded-[13px] border border-black/15 bg-white py-1.5 pl-4 pr-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-all focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20"
            >
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-foreground/35 text-left"
              />
              <Button
                type="submit"
                disabled={status === 'loading'}
                className="shrink-0 rounded-[9px]"
              >
                {status === 'loading' ? 'Sending…' : 'Get early access'}
              </Button>
            </form>
          )}

          {status === 'error' && (
            <p className="mt-2 text-xs text-red-500">Something went wrong. Try again.</p>
          )}

          <p className="mt-3 mb-10 text-[13px] text-foreground/45">
            Built for Claude, OpenCode, and any MCP-compatible agent.
          </p>
        </div>

        {/* Full Desktop Claude Mockup */}
        <div className="w-full flex justify-center mb-16">
          <ClaudeCard />
        </div>

        {/* 3 steps below mockup */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-[820px] text-left border-t border-black/8 pt-12">
          {[
            { n: '1', title: 'Search', desc: 'Agent calls search_products and picks what you need from Instamart.' },
            { n: '2', title: 'Order', desc: 'Browser automation handles the cart, card entry, and checkout.' },
            { n: '3', title: 'Confirm', desc: 'You share the OTP. Wallet is debited. Order is placed.' },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex flex-col">
              <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full border border-foreground/20 text-[13px] font-bold text-foreground">
                {n}
              </div>
              <div className="mb-1 text-[16px] font-bold text-foreground">{title}</div>
              <div className="text-[13.5px] leading-[1.55] text-foreground/55">{desc}</div>
            </div>
          ))}
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto flex items-center justify-between gap-6 border-t border-black/8 px-12 py-5 text-foreground/55">
        <p className="shrink-0 font-bold uppercase leading-relaxed tracking-[0.12em] text-foreground/30">
          Works with<br />your favorite agents
        </p>

        <div className="flex items-center gap-7">
          <div className="flex items-center gap-2">
            <img src="/claude-icon.ico" alt="Claude" className="h-[18px] w-[18px]" />
            <span className="text-sm font-semibold text-foreground">Claude</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="https://opencode.ai/favicon.ico" alt="OpenCode" className="h-5 w-5 rounded-[4px]" />
            <span className="text-sm font-semibold text-foreground">OpenCode</span>
          </div>
          <span className="text-lg tracking-[3px]">···</span>
          <span className="">Any MCP-compatible agent</span>
        </div>

        <p className="shrink-0 text-right font-semibold leading-[1.55] ">
          Give your agents<br />a wallet.
        </p>
      </footer>
    </div>
  )
}
