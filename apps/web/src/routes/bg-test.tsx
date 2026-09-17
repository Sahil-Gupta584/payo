import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

export const Route = createFileRoute('/bg-test')({
  component: BgTest,
})

// Canvas: payment network — nodes pulse and send a "transaction" signal along edges
function PaymentNetwork() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const W = canvas.width, H = canvas.height

    // fixed meaningful nodes
    const nodes = [
      { x: W*0.15, y: H*0.3,  label: 'Agent',   icon: '🤖' },
      { x: W*0.38, y: H*0.2,  label: 'Search',  icon: '🔍' },
      { x: W*0.62, y: H*0.25, label: 'Cart',    icon: '🛒' },
      { x: W*0.82, y: H*0.35, label: 'Pay',     icon: '💳' },
      { x: W*0.72, y: H*0.65, label: 'Confirm', icon: '✅' },
      { x: W*0.45, y: H*0.7,  label: 'Wallet',  icon: '💰' },
      { x: W*0.2,  y: H*0.65, label: 'History', icon: '📋' },
    ]
    // edges
    const edges = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[1,5],[2,5]]

    // active pulses: { edge, t (0-1), speed }
    const pulses: {edge:number[], t:number, speed:number}[] = []
    setInterval(() => {
      const e = edges[Math.floor(Math.random()*edges.length)]
      pulses.push({ edge: e, t: 0, speed: 0.004 + Math.random()*0.003 })
    }, 600)

    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // edges
      edges.forEach(([a,b]) => {
        ctx.beginPath()
        ctx.moveTo(nodes[a].x, nodes[a].y)
        ctx.lineTo(nodes[b].x, nodes[b].y)
        ctx.strokeStyle = 'rgba(37,99,235,0.08)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      })

      // pulses
      for (let i = pulses.length-1; i >= 0; i--) {
        const p = pulses[i]
        p.t += p.speed
        if (p.t >= 1) { pulses.splice(i,1); continue }
        const a = nodes[p.edge[0]], b = nodes[p.edge[1]]
        const x = a.x + (b.x-a.x)*p.t
        const y = a.y + (b.y-a.y)*p.t
        const grd = ctx.createRadialGradient(x,y,0,x,y,12)
        grd.addColorStop(0, 'rgba(37,99,235,0.7)')
        grd.addColorStop(1, 'rgba(37,99,235,0)')
        ctx.beginPath()
        ctx.arc(x, y, 12, 0, Math.PI*2)
        ctx.fillStyle = grd
        ctx.fill()
      }

      // nodes
      nodes.forEach(n => {
        ctx.beginPath()
        ctx.arc(n.x, n.y, 20, 0, Math.PI*2)
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.shadowColor = 'rgba(37,99,235,0.15)'
        ctx.shadowBlur = 12
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.strokeStyle = 'rgba(37,99,235,0.15)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.font = '14px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.icon, n.x, n.y)
      })

      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
}

// Canvas: scrolling ledger — real-looking transaction feed
function LedgerCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const W = canvas.width
    const rows = [
      '✓  Sundrop Peanut Butter · Instamart         $2.75',
      '✓  Diet Coke 330ml × 2 · Instamart           $1.40',
      '✓  Maggi Noodles 4-pack · Instamart           $0.95',
      '✓  Wallet top-up                             +$20.00',
      '✓  Lays Classic Chips · Instamart             $0.80',
      '✓  Amul Butter 500g · Instamart               $3.20',
      '✓  Order confirmed  ·  OTP verified           $2.75',
      '✓  Tropicana Orange Juice 1L                  $2.10',
      '✓  Wallet top-up                             +$50.00',
      '✓  Britannia Good Day Cookies                 $1.05',
    ]
    let offset = 0
    const lineH = 28
    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, W, canvas.height)
      ctx.font = '13px "SF Mono", monospace'
      ctx.fillStyle = 'rgba(15,30,80,0.065)'
      ctx.textAlign = 'left'
      const total = rows.length * lineH
      offset = (offset + 0.4) % total
      for (let i = -1; i < Math.ceil(canvas.height / lineH) + 2; i++) {
        const idx = ((i + Math.floor(offset/lineH)) % rows.length + rows.length) % rows.length
        const y = i * lineH - (offset % lineH)
        ctx.fillText(rows[idx], 40, y)
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
}

function BgTest() {
  return (
    <div style={{fontFamily:'"Nunito",sans-serif'}}>
      <style>{`
        @keyframes ringExpand{0%{transform:scale(0.3);opacity:0.5}100%{transform:scale(4);opacity:0}}
        @keyframes floatUp{0%{opacity:0;transform:translateY(0)}10%{opacity:1}85%{opacity:0.7}100%{opacity:0;transform:translateY(-100vh)}}
        @keyframes pillPop{0%{transform:scale(0.8);opacity:0}20%{transform:scale(1.05);opacity:1}80%{opacity:1}100%{opacity:0;transform:scale(0.95)}}
      `}</style>

      {/* 1 — Payment node network */}
      <section style={{position:'relative',height:'100vh',background:'#f0f7ff',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <PaymentNetwork/>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center, rgba(240,247,255,0) 40%, rgba(240,247,255,0.5) 80%)'}}/>
        <Label>1 — Payment node network</Label>
      </section>

      {/* 2 — Scrolling transaction ledger */}
      <section style={{position:'relative',height:'100vh',background:'#fafcff',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <LedgerCanvas/>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center, rgba(250,252,255,0) 30%, rgba(250,252,255,0.75) 70%)'}}/>
        {[0,1.4,2.8].map((d,i)=>(
          <div key={i} style={{position:'absolute',width:240,height:240,borderRadius:'50%',border:'1px solid rgba(37,99,235,0.18)',animation:`ringExpand 4.5s cubic-bezier(0.22,1,0.36,1) infinite`,animationDelay:`${d}s`}}/>
        ))}
        <Label>2 — Scrolling ledger + rings</Label>
      </section>

      {/* 3 — Live order pills floating up */}
      <section style={{position:'relative',height:'100vh',background:'#fff',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle,rgba(37,99,235,0.1) 1px,transparent 1px)',backgroundSize:'28px 28px'}}/>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,rgba(255,255,255,0) 25%,rgba(255,255,255,0.8) 70%)'}}/>
        {[
          {text:'✅ Order placed · $2.75', left:'8%', dur:'7s', del:'0s'},
          {text:'🤖 Agent searched Instamart', left:'22%', dur:'9s', del:'1.2s'},
          {text:'💳 Card debited', left:'38%', dur:'6s', del:'0.5s'},
          {text:'📦 Delivering in 20 mins', left:'52%', dur:'8s', del:'2s'},
          {text:'✅ OTP confirmed', left:'65%', dur:'7.5s', del:'3s'},
          {text:'💰 $20 wallet top-up', left:'78%', dur:'6.5s', del:'1s'},
          {text:'🛒 Peanut Butter added', left:'14%', dur:'8.5s', del:'4s'},
        ].map((p,i)=>(
          <div key={i} style={{position:'absolute',left:p.left,bottom:'-5%',background:'rgba(255,255,255,0.9)',border:'1px solid rgba(37,99,235,0.15)',borderRadius:24,padding:'7px 16px',fontSize:12,fontWeight:700,color:'rgba(15,30,80,0.7)',whiteSpace:'nowrap',boxShadow:'0 2px 12px rgba(37,99,235,0.08)',animation:`floatUp ${p.dur} linear infinite`,animationDelay:p.del}}>
            {p.text}
          </div>
        ))}
        <Label>3 — Live order feed floating up</Label>
      </section>

      {/* 4 — Dark + node network (premium) */}
      <section style={{position:'relative',height:'100vh',background:'#060d1f',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{position:'absolute',inset:0,opacity:0.5}}>
          <PaymentNetwork/>
        </div>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 30% 35%, rgba(37,99,235,0.08) 0%, transparent 55%)'}}/>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 70% 65%, rgba(139,92,246,0.07) 0%, transparent 50%)'}}/>
        <Label>4 — Dark premium node network</Label>
      </section>

      {/* 5 — Ledger on gradient (layered) */}
      <section style={{position:'relative',height:'100vh',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'#cff3fb'}}>
        <div style={{position:'absolute',top:'-10%',left:'-8%',width:'55vw',height:'55vw',borderRadius:'50%',background:'#2563EB',filter:'blur(90px)',opacity:0.7}}/>
        <div style={{position:'absolute',top:'-8%',right:'-10%',width:'50vw',height:'50vw',borderRadius:'50%',background:'#C4B5FD',filter:'blur(90px)',opacity:0.65}}/>
        <div style={{position:'absolute',top:'20%',left:'18%',width:'40vw',height:'40vw',borderRadius:'50%',background:'rgba(103,232,249,0.9)',filter:'blur(80px)'}}/>
        <LedgerCanvas/>
        <Label>5 — Gradient + ledger overlay</Label>
      </section>

    </div>
  )
}

function Label({children}:{children:string}){
  return(
    <div style={{position:'relative',zIndex:10,background:'rgba(255,255,255,0.92)',borderRadius:12,padding:'10px 20px',fontSize:14,fontWeight:700,color:'#060d1f',boxShadow:'0 2px 12px rgba(0,0,0,0.12)'}}>
      {children}
    </div>
  )
}
