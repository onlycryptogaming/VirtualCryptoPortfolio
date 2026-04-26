'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const fmtUSD = n => { const x = parseFloat(n); return isNaN(x) ? '$0.00' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(x); };
const fmtPct = n => { const x = parseFloat(n); return isNaN(x) ? '0.00%' : (x>=0?'+':'')+x.toFixed(2)+'%'; };
const fmtNum = n => { const x = parseFloat(n); if(isNaN(x)) return '0'; if(x>=1000) return x.toLocaleString('en-US',{maximumFractionDigits:4}); return x.toFixed(6).replace(/\.?0+$/,''); };
const clean = s => parseFloat(String(s||'').replace(/[$,%]/g,''))||0;

const COIN_COLORS = {BTC:'#f7931a',ETH:'#627eea',SOL:'#9945ff',ADA:'#0033ad',DOGE:'#c2a633',AVAX:'#e84142',DOT:'#e6007a',LINK:'#2a5ada',MATIC:'#8247e5',XRP:'#00aae4',BNB:'#f3ba2f',SHIB:'#ff0000',LTC:'#bfbbbb',UNI:'#ff007a',ATOM:'#6f7390',DEFAULT:'#00e5a0'};
const getCoinColor = t => COIN_COLORS[t?.toUpperCase()]||COIN_COLORS.DEFAULT;

function LineChart({ data, height=160 }) {
  const ref = useRef(null);
  useEffect(()=>{
    const c=ref.current; if(!c||!data||data.length<2) return;
    const ctx=c.getContext('2d'), W=c.offsetWidth||600, H=height;
    c.width=W; c.height=H;
    ctx.clearRect(0,0,W,H);
    const vals=data.map(d=>d.v), mn=Math.min(...vals), mx=Math.max(...vals), rng=mx-mn||1;
    const pad={t:10,b:24,l:8,r:8}, iW=W-pad.l-pad.r, iH=H-pad.t-pad.b;
    const xS=i=>pad.l+(i/(data.length-1))*iW, yS=v=>pad.t+iH-((v-mn)/rng)*iH;
    const g=ctx.createLinearGradient(0,pad.t,0,H-pad.b);
    g.addColorStop(0,'rgba(0,229,160,.2)'); g.addColorStop(1,'rgba(0,229,160,0)');
    ctx.beginPath(); data.forEach((d,i)=>i===0?ctx.moveTo(xS(i),yS(d.v)):ctx.lineTo(xS(i),yS(d.v)));
    ctx.lineTo(xS(data.length-1),H-pad.b); ctx.lineTo(xS(0),H-pad.b);
    ctx.closePath(); ctx.fillStyle=g; ctx.fill();
    ctx.beginPath(); data.forEach((d,i)=>i===0?ctx.moveTo(xS(i),yS(d.v)):ctx.lineTo(xS(i),yS(d.v)));
    ctx.strokeStyle='#00e5a0'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#475569'; ctx.font='10px monospace'; ctx.textAlign='center';
    [[0,data[0].t],[Math.floor(data.length/2),data[Math.floor(data.length/2)]?.t],[data.length-1,data[data.length-1].t]].forEach(([i,l])=>{
      if(l) ctx.fillText(String(l).substring(0,8),xS(i),H-6);
    });
  },[data,height]);
  if(!data||data.length<2) return <div style={{height,display:'flex',alignItems:'center',justifyContent:'center',color:'#475569',fontSize:13}}>No history yet</div>;
  return <canvas ref={ref} style={{width:'100%',height,display:'block'}}/>;
}

function DonutChart({ slices, total, size=160 }) {
  const cx=size/2, cy=size/2, r=size*.38, inn=size*.24;
  let cum=-Math.PI/2;
  const paths=slices.map((s,i)=>{
    const sw=(s.value/total)*2*Math.PI;
    const x1=cx+r*Math.cos(cum),y1=cy+r*Math.sin(cum);
    const x2=cx+r*Math.cos(cum+sw),y2=cy+r*Math.sin(cum+sw);
    const xi1=cx+inn*Math.cos(cum+sw),yi1=cy+inn*Math.sin(cum+sw);
    const xi2=cx+inn*Math.cos(cum),yi2=cy+inn*Math.sin(cum);
    const lg=sw>Math.PI?1:0;
    const d=`M${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2} L${xi1},${yi1} A${inn},${inn} 0 ${lg},0 ${xi2},${yi2} Z`;
    cum+=sw;
    return <path key={i} d={d} fill={s.color} opacity={.9}/>;
  });
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{paths}<circle cx={cx} cy={cy} r={inn-2} fill="#0f172a"/><text x={cx} y={cy-6} textAnchor="middle" fill="#94a3b8" fontSize="10">{slices.length-1}</text><text x={cx} y={cy+10} textAnchor="middle" fill="#e2e8f0" fontSize="9">assets</text></svg>;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [portfolio, setPortfolio] = useState(null);
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState({ intraday:[], daily:[] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('holdings');
  const [chartRange, setChartRange] = useState('intraday');
  const [tradeForm, setTradeForm] = useState({ action:'BUY', coin:'', amountType:'Dollar Amount', amount:'' });
  const [tradeStatus, setTradeStatus] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [marketStatus, setMarketStatus] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, prRes, hRes, mRes] = await Promise.all([
        fetch('/api/portfolio'), fetch('/api/prices'),
        fetch('/api/history'), fetch('/api/market'),
      ]);
      if(pRes.ok)  { setPortfolio(await pRes.json()); setLastUpdated(new Date()); }
      if(prRes.ok) setPrices(await prRes.json());
      if(hRes.ok)  setHistory(await hRes.json());
      if(mRes.ok)  setMarketStatus(await mRes.json());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ if(status==='unauthenticated') router.replace('/'); },[status,router]);
  useEffect(()=>{ if(status==='authenticated'){ fetchData(); const iv=setInterval(fetchData,60000); return()=>clearInterval(iv); }},[status,fetchData]);

  if(status==='loading'||status==='unauthenticated') return <div style={{background:'#080c14',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#475569'}}>Loading...</div>;

  const executeTrade = async () => {
    if(!tradeForm.coin||!tradeForm.amount){ setTradeStatus({type:'error',msg:'Fill in all fields.'}); return; }
    setExecuting(true); setTradeStatus({type:'pending',msg:'Executing...'});
    try {
      const res = await fetch('/api/trade',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(tradeForm)});
      const data = await res.json();
      if(res.ok){ setTradeStatus({type:'success',msg:`✓ ${tradeForm.action} ${tradeForm.coin} executed`}); setTradeForm(f=>({...f,amount:''})); setTimeout(()=>{ fetchData(); setTradeStatus(null); },2000); }
      else setTradeStatus({type:'error',msg:data.error||'Trade failed'});
    } catch { setTradeStatus({type:'error',msg:'Network error'}); }
    finally { setExecuting(false); }
  };

  const sellAll = async () => {
    if(!confirm('Sell ALL holdings? Cannot be undone.')) return;
    setExecuting(true); setTradeStatus({type:'pending',msg:'Liquidating...'});
    try {
      const res = await fetch('/api/trade/sellall',{method:'POST'});
      const data = await res.json();
      if(res.ok){ setTradeStatus({type:'success',msg:'✓ All positions sold'}); setTimeout(()=>{ fetchData(); setTradeStatus(null); },2000); }
      else setTradeStatus({type:'error',msg:data.error||'Failed'});
    } catch { setTradeStatus({type:'error',msg:'Network error'}); }
    finally { setExecuting(false); }
  };

  const { summary, holdings=[], history:trades=[] } = portfolio||{};
  const cash       = clean(summary?.cash);
  const totalVal   = clean(summary?.totalVal);
  const pl         = clean(summary?.pl);
  const returnPct  = clean(summary?.returnPct);
  const fees       = clean(summary?.fees);
  const isProfitable = pl >= 0;

  const holdingsArr = Array.isArray(holdings) ? holdings : [];
  const holdingsWithVal = holdingsArr.map(h=>({
    ticker: h.coin||h[0], qty: h.qty||clean(h[1]),
    avgBuy: h.avgBuy||clean(h[2]), curPrice: h.curPrice||clean(h[3]),
    curVal: h.curVal||(h.qty||clean(h[1]))*(h.curPrice||clean(h[3])),
    plPct:  h.plPct||clean(h[7]),
  }));

  const totalPortVal = holdingsWithVal.reduce((s,h)=>s+h.curVal,0)+cash;
  const allSlices = [...holdingsWithVal.map(h=>({label:h.ticker,value:h.curVal,color:getCoinColor(h.ticker)})),{label:'Cash',value:cash,color:'#334155'}].filter(s=>s.value>0);
  const availableCoins = Object.keys(prices).length>0 ? Object.keys(prices) : holdingsWithVal.map(h=>h.ticker);
  const chartData = chartRange==='daily' ? history.daily : history.intraday;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--up:#00e5a0;--down:#f43f5e;--text:#e2e8f0;--muted:#475569;--gold:#f59e0b}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1100px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:rgba(15,23,42,.8);border:1px solid var(--border);border-radius:16px;backdrop-filter:blur(12px)}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(0,229,160,.1);color:var(--accent);border:1px solid rgba(0,229,160,.2)}
        .hero{background:linear-gradient(135deg,#0f172a 0%,#1a2235 60%,#0a1628 100%);border:1px solid var(--border);border-radius:24px;padding:32px;margin-bottom:20px;position:relative;overflow:hidden}
        .hero::before{content:'';position:absolute;top:-80px;right:-80px;width:280px;height:280px;background:radial-gradient(circle,rgba(0,229,160,.07) 0%,transparent 70%);pointer-events:none}
        .hero-label{font-size:10px;color:var(--muted);letter-spacing:3px;text-transform:uppercase;margin-bottom:8px}
        .hero-value{font-family:'Syne',sans-serif;font-weight:800;font-size:52px;letter-spacing:-2px;line-height:1;margin-bottom:8px}
        .hero-change{display:inline-flex;align-items:center;gap:6px;font-size:13px;margin-bottom:28px;padding:4px 10px;border-radius:8px}
        .hero-change.up{color:var(--up);background:rgba(0,229,160,.1)}.hero-change.down{color:var(--down);background:rgba(244,63,94,.1)}
        .hero-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .stat{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:14px}
        .stat-label{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
        .stat-value{font-size:15px;font-weight:500}.stat-value.up{color:var(--up)}.stat-value.down{color:var(--down)}
        .hero-actions{display:flex;gap:10px;flex-wrap:wrap}
        .btn{padding:10px 20px;border-radius:12px;border:none;font-family:'DM Mono',monospace;font-size:11px;font-weight:500;cursor:pointer;transition:all .2s;letter-spacing:.5px;text-decoration:none;display:inline-block}
        .btn-primary{background:var(--accent);color:#000}.btn-primary:hover{background:#00ffb0;transform:translateY(-1px)}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-secondary{background:var(--surface2);color:var(--text);border:1px solid var(--border)}.btn-secondary:hover{border-color:var(--accent);color:var(--accent)}
        .btn-danger{background:transparent;color:var(--down);border:1px solid rgba(244,63,94,.3)}.btn-danger:hover{background:rgba(244,63,94,.1)}
        .tabs{display:flex;gap:4px;margin-bottom:20px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:4px}
        .tab{flex:1;padding:9px;text-align:center;border-radius:10px;border:none;background:transparent;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);cursor:pointer;transition:all .2s}
        .tab.active{background:var(--surface2);color:var(--accent);border:1px solid var(--border)}
        .panel{animation:fadeIn .25s ease}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px}
        .holding-row{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:14px 18px;display:grid;grid-template-columns:40px 1fr auto auto auto;align-items:center;gap:14px;margin-bottom:10px;transition:all .2s}
        .holding-row:hover{border-color:rgba(0,229,160,.2)}
        .coin-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:12px}
        .pct-badge{font-size:11px;font-weight:500;padding:3px 8px;border-radius:7px;white-space:nowrap}
        .pct-badge.up{color:var(--up);background:rgba(0,229,160,.1)}.pct-badge.down{color:var(--down);background:rgba(244,63,94,.1)}
        .cash-row{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;margin-top:10px}
        .chart-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px;margin-bottom:16px}
        .chart-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
        .range-btns{display:flex;gap:4px}
        .range-btn{padding:4px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);cursor:pointer;transition:all .2s}
        .range-btn.active{background:var(--accent);color:#000;border-color:var(--accent)}
        .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .trade-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .trade-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px}
        .form-group{margin-bottom:12px}
        .form-label{font-size:10px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:5px}
        .form-select,.form-input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;color:var(--text);font-family:'DM Mono',monospace;font-size:12px;outline:none;transition:border-color .2s;appearance:none}
        .form-select:focus,.form-input:focus{border-color:var(--accent)}
        .action-toggle{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}
        .action-btn{padding:9px;border-radius:10px;border:1px solid var(--border);background:transparent;font-family:'DM Mono',monospace;font-size:12px;color:var(--muted);cursor:pointer;transition:all .2s}
        .action-btn.active-buy{background:rgba(0,229,160,.1);color:var(--up);border-color:rgba(0,229,160,.3)}
        .action-btn.active-sell{background:rgba(244,63,94,.1);color:var(--down);border-color:rgba(244,63,94,.3)}
        .trade-status{padding:10px 14px;border-radius:10px;font-size:12px;margin-top:10px}
        .trade-status.success{background:rgba(0,229,160,.1);color:var(--up);border:1px solid rgba(0,229,160,.2)}
        .trade-status.error{background:rgba(244,63,94,.1);color:var(--down);border:1px solid rgba(244,63,94,.2)}
        .trade-status.pending{background:rgba(59,130,246,.1);color:#60a5fa;border:1px solid rgba(59,130,246,.2)}
        .sell-all-card{background:rgba(244,63,94,.04);border:1px solid rgba(244,63,94,.2);border-radius:20px;padding:18px;margin-top:16px;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .history-row{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:13px 16px;display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:12px;margin-bottom:8px}
        .tx-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px}
        .tx-buy{background:rgba(0,229,160,.1)}.tx-sell{background:rgba(244,63,94,.1)}
        .freeze-banner{background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.3);border-radius:12px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:var(--down);text-align:center}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .empty{text-align:center;padding:48px 0;color:var(--muted);font-size:13px}
        .alloc-inner{display:flex;align-items:center;gap:24px;flex-wrap:wrap}
        .legend{flex:1;display:flex;flex-direction:column;gap:8px;min-width:140px}
        .legend-row{display:flex;align-items:center;gap:8px}
        .legend-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0}
        .nav-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(0,229,160,.4)}50%{opacity:.6;box-shadow:0 0 0 6px rgba(0,229,160,0)}}
        @media(max-width:640px){.hero-value{font-size:36px}.hero-stats{grid-template-columns:1fr 1fr}.trade-grid{grid-template-columns:1fr}.two-col{grid-template-columns:1fr}.holding-row{grid-template-columns:36px 1fr auto auto}}
      `}</style>
      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <a href="/dashboard" className="nav-link active">Wallet</a>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <Link href="/market" className="nav-link">Market</Link>
            <Link href="/badges" className="nav-link">Badges</Link>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div className="nav-dot"/>
            <span style={{fontSize:10,color:'var(--muted)',letterSpacing:1}}>LIVE</span>
          </div>
        </nav>

        {marketStatus?.frozen && <div className="freeze-banner">🚫 {marketStatus.freezeReason}</div>}

        {lastUpdated && <div style={{fontSize:10,color:'var(--muted)',textAlign:'right',marginBottom:16}}>Updated {lastUpdated.toLocaleTimeString()}</div>}

        {loading ? (
          <><div className="skeleton" style={{height:220,marginBottom:20}}/><div className="skeleton" style={{height:44,marginBottom:20}}/>{[1,2,3].map(i=><div key={i} className="skeleton" style={{height:70,marginBottom:10}}/>)}</>
        ) : (
          <>
            <div className="hero">
              <div className="hero-label">Total Portfolio Value</div>
              <div className="hero-value" style={{color:isProfitable?'var(--up)':'var(--down)'}}>
                ${Math.floor(totalVal).toLocaleString()}<span style={{fontSize:30,opacity:.6}}>.{totalVal.toFixed(2).split('.')[1]}</span>
              </div>
              <div className={`hero-change ${isProfitable?'up':'down'}`}>
                <span>{isProfitable?'▲':'▼'}</span>
                <span>{isProfitable?'+':''}{fmtUSD(pl)} ({fmtPct(returnPct)})</span>
              </div>
              <div className="hero-stats">
                <div className="stat"><div className="stat-label">Cash</div><div className="stat-value">{fmtUSD(cash)}</div></div>
                <div className="stat"><div className="stat-label">Holdings</div><div className="stat-value">{fmtUSD(clean(summary?.holdingsVal))}</div></div>
                <div className="stat"><div className="stat-label">Return</div><div className={`stat-value ${isProfitable?'up':'down'}`}>{fmtPct(returnPct)}</div></div>
                <div className="stat"><div className="stat-label">Fees Paid</div><div className="stat-value" style={{color:'var(--muted)'}}>{fmtUSD(fees)}</div></div>
              </div>
              <div className="hero-actions">
                <button className="btn btn-primary" onClick={()=>setActiveTab('trade')}>+ New Trade</button>
                <button className="btn btn-secondary" onClick={fetchData}>↻ Refresh</button>
                <Link href="/leaderboard" className="btn btn-secondary">🏆 Leaderboard</Link>
              </div>
            </div>

            <div className="tabs">
              {['holdings','charts','allocation','trade','history'].map(t=>(
                <button key={t} className={`tab${activeTab===t?' active':''}`} onClick={()=>setActiveTab(t)}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>

            {activeTab==='holdings' && (
              <div className="panel">
                {holdingsWithVal.length===0 ? <div className="empty">No holdings yet — make a trade to get started!</div> : (
                  <>
                    {holdingsWithVal.map((h,i)=>(
                      <div className="holding-row" key={i}>
                        <div className="coin-icon" style={{background:`${getCoinColor(h.ticker)}22`,color:getCoinColor(h.ticker)}}>{h.ticker.slice(0,3)}</div>
                        <div>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>{h.ticker}</div>
                          <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{prices[h.ticker]?`$${parseFloat(prices[h.ticker].price).toLocaleString()}`:`Avg $${h.avgBuy.toFixed(4)}`}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>{fmtUSD(h.curVal)}</div>
                          <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>{fmtNum(h.qty)} {h.ticker}</div>
                        </div>
                        <div className={`pct-badge ${h.plPct>=0?'up':'down'}`}>{h.plPct>=0?'▲':'▼'} {Math.abs(h.plPct).toFixed(2)}%</div>
                      </div>
                    ))}
                    <div className="cash-row">
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{width:40,height:40,borderRadius:10,background:'rgba(71,85,105,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>💵</div>
                        <div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>Cash</div><div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Available</div></div>
                      </div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15}}>{fmtUSD(cash)}</div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab==='charts' && (
              <div className="panel">
                <div className="chart-card">
                  <div className="chart-header">
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14}}>Portfolio Value Over Time</div>
                    <div className="range-btns">
                      <button className={`range-btn${chartRange==='intraday'?' active':''}`} onClick={()=>setChartRange('intraday')}>Intraday</button>
                      <button className={`range-btn${chartRange==='daily'?' active':''}`} onClick={()=>setChartRange('daily')}>Daily</button>
                    </div>
                  </div>
                  <LineChart data={chartData} height={160}/>
                </div>
              </div>
            )}

            {activeTab==='allocation' && (
              <div className="panel">
                <div className="card">
                  {allSlices.length===0 ? <div className="empty">No allocation data yet.</div> : (
                    <div className="alloc-inner">
                      <DonutChart slices={allSlices} total={totalPortVal}/>
                      <div className="legend">
                        {allSlices.map((s,i)=>(
                          <div className="legend-row" key={i}>
                            <div className="legend-dot" style={{background:s.color}}/>
                            <div style={{flex:1,fontSize:11}}>{s.label}</div>
                            <div style={{fontSize:11,color:'var(--muted)'}}>{((s.value/totalPortVal)*100).toFixed(1)}%</div>
                            <div style={{fontSize:11,color:'var(--muted)',marginLeft:4}}>{fmtUSD(s.value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab==='trade' && (
              <div className="panel">
                <div className="trade-grid">
                  <div className="trade-card">
                    <h3 style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,marginBottom:16}}>Execute Trade</h3>
                    <div className="action-toggle">
                      <button className={`action-btn${tradeForm.action==='BUY'?' active-buy':''}`} onClick={()=>setTradeForm(f=>({...f,action:'BUY'}))}>▲ BUY</button>
                      <button className={`action-btn${tradeForm.action==='SELL'?' active-sell':''}`} onClick={()=>setTradeForm(f=>({...f,action:'SELL'}))}>▼ SELL</button>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Coin</label>
                      <select className="form-select" value={tradeForm.coin} onChange={e=>setTradeForm(f=>({...f,coin:e.target.value}))}>
                        <option value="">Select a coin...</option>
                        {availableCoins.map(c=><option key={c} value={c}>{c}{prices[c]?` — $${parseFloat(prices[c].price).toLocaleString()}`:''}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Amount Type</label>
                      <select className="form-select" value={tradeForm.amountType} onChange={e=>setTradeForm(f=>({...f,amountType:e.target.value}))}>
                        <option value="Dollar Amount">Dollar Amount ($)</option>
                        <option value="# of Coins"># of Coins</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">{tradeForm.amountType==='Dollar Amount'?'Amount (USD)':'Quantity'}</label>
                      <input type="number" className="form-input" placeholder="0.00" min="0" step="any" value={tradeForm.amount} onChange={e=>setTradeForm(f=>({...f,amount:e.target.value}))}/>
                    </div>
                    {tradeForm.coin&&tradeForm.amount&&prices[tradeForm.coin]&&(
                      <div style={{fontSize:11,color:'var(--muted)',marginBottom:10,padding:'7px 11px',background:'var(--surface2)',borderRadius:8}}>
                        Est: {tradeForm.amountType==='Dollar Amount'?`${(parseFloat(tradeForm.amount)/parseFloat(prices[tradeForm.coin].price)).toFixed(6)} ${tradeForm.coin}`:fmtUSD(parseFloat(tradeForm.amount)*parseFloat(prices[tradeForm.coin].price))}
                        &nbsp;·&nbsp;Fee: {fmtUSD((parseFloat(tradeForm.amount)||0)*0.005)}
                      </div>
                    )}
                    <button className="btn btn-primary" style={{width:'100%'}} onClick={executeTrade} disabled={executing||marketStatus?.frozen}>
                      {executing?'Processing...':marketStatus?.frozen?'Market Frozen':`${tradeForm.action} ${tradeForm.coin||'—'}`}
                    </button>
                    {tradeStatus&&<div className={`trade-status ${tradeStatus.type}`}>{tradeStatus.msg}</div>}
                  </div>
                  <div className="trade-card">
                    <h3 style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,marginBottom:16}}>Portfolio Summary</h3>
                    {[['Starting Cash',fmtUSD(10000),''],['Cash Remaining',fmtUSD(cash),''],['Holdings Value',fmtUSD(clean(summary?.holdingsVal)),''],['Total Value',fmtUSD(totalVal),''],['Profit / Loss',fmtUSD(pl),isProfitable?'up':'down'],['Return %',fmtPct(returnPct),isProfitable?'up':'down'],['Total Fees',fmtUSD(fees),'']].map(([label,val,cls])=>(
                      <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                        <span style={{fontSize:11,color:'var(--muted)'}}>{label}</span>
                        <span style={{fontSize:12,fontWeight:500,color:cls==='up'?'var(--up)':cls==='down'?'var(--down)':'var(--text)'}}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sell-all-card">
                  <div><strong style={{color:'var(--down)',display:'block',marginBottom:3,fontFamily:"'Syne',sans-serif"}}>⚠ Sell All Holdings</strong><span style={{fontSize:12,color:'var(--muted)'}}>Liquidates every position at market price. Cannot be undone.</span></div>
                  <button className="btn btn-danger" onClick={sellAll} disabled={executing||holdingsWithVal.length===0}>Sell All</button>
                </div>
              </div>
            )}

            {activeTab==='history' && (
              <div className="panel">
                {(!trades||trades.length===0) ? <div className="empty">No trades yet.</div> : (
                  [...trades].reverse().slice(0,50).map((t,i)=>{
                    const isBuy = t.action==='BUY';
                    return (
                      <div className="history-row" key={i}>
                        <div className={`tx-icon ${isBuy?'tx-buy':'tx-sell'}`}>{isBuy?'💰':'📤'}</div>
                        <div>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13}}>{t.action} {t.coin}</div>
                          <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>{new Date(t.createdAt||t.created_at).toLocaleString()} · {(t.quantity||0).toFixed(4)} {t.coin} @ ${(t.price||0).toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{fontSize:12,fontWeight:500,color:isBuy?'var(--down)':'var(--up)',textAlign:'right'}}>{isBuy?'-':'+'}{fmtUSD(t.grossValue||t.gross_value||0)}</div>
                          <div style={{fontSize:10,color:'var(--muted)',marginTop:2,textAlign:'right'}}>Fee: {fmtUSD(t.fee||0)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
