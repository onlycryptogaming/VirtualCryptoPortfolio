"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Market() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(()=>{ if(status==='unauthenticated') router.replace('/'); },[status,router]);
  useEffect(()=>{
    if(status==='authenticated'){
      fetch('/api/prices?full=true').then(r=>r.json()).then(d=>{ setPrices(Array.isArray(d)?d:[]); setLastUpdated(new Date()); setLoading(false); });
      const iv=setInterval(()=>fetch('/api/prices?full=true').then(r=>r.json()).then(d=>{ setPrices(Array.isArray(d)?d:[]); setLastUpdated(new Date()); }),30000);
      return()=>clearInterval(iv);
    }
  },[status]);

  if(status==='loading'||status==='unauthenticated') return <div style={{background:'#080c14',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#475569'}}>Loading...</div>;

  const filtered = prices.filter(p=>!search||p.ticker?.toLowerCase().includes(search.toLowerCase()));

  const fmtPrice = p => {
    const n = parseFloat(p);
    if(isNaN(n)) return '$—';
    if(n >= 1) return '$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    return '$'+n.toFixed(6);
  };
  const fmtChg = n => { const x=parseFloat(n); return isNaN(x)?'—':(x>=0?'+':'')+x.toFixed(2)+'%'; };
  const chgColor = n => { const x=parseFloat(n); return isNaN(x)?'var(--muted)':x>=0?'var(--up)':'var(--down)'; };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--up:#00e5a0;--down:#f43f5e;--text:#e2e8f0;--muted:#475569}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1100px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:rgba(15,23,42,.8);border:1px solid var(--border);border-radius:16px;backdrop-filter:blur(12px)}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(0,229,160,.1);color:var(--accent);border:1px solid rgba(0,229,160,.2)}
        .page-title{font-family:'Syne',sans-serif;font-weight:800;font-size:32px;letter-spacing:-1px;margin-bottom:4px}
        .page-title span{color:var(--accent)}
        .page-sub{font-size:11px;color:var(--muted);margin-bottom:24px}
        .search-bar{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 16px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;margin-bottom:16px;transition:border-color .2s}
        .search-bar:focus{border-color:var(--accent)}
        .table-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;overflow:hidden}
        .mkt-table{width:100%;border-collapse:collapse}
        .mkt-table th{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;padding:12px 16px;text-align:left;border-bottom:1px solid var(--border);background:var(--surface2)}
        .mkt-row{border-bottom:1px solid rgba(30,41,59,.4);transition:background .15s;cursor:default}
        .mkt-row:hover{background:rgba(0,229,160,.03)}
        .mkt-row td{padding:14px 16px;font-size:12px}
        .coin-name{font-family:'Syne',sans-serif;font-weight:700;font-size:14px}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <Link href="/dashboard" className="nav-link">Wallet</Link>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <a href="/market" className="nav-link active">Market</a>
            <Link href="/badges" className="nav-link">Badges</Link>
          </div>
          {lastUpdated&&<span style={{fontSize:10,color:'var(--muted)'}}>Updated {lastUpdated.toLocaleTimeString()}</span>}
        </nav>

        <div className="page-title">📈 <span>Market</span></div>
        <div className="page-sub">Live prices — refreshes every 30 seconds</div>

        <input className="search-bar" placeholder="Search coins..." value={search} onChange={e=>setSearch(e.target.value)}/>

        {loading ? (
          [1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{height:54,marginBottom:4}}/>)
        ) : (
          <div className="table-card">
            <table className="mkt-table">
              <thead>
                <tr><th>#</th><th>Coin</th><th>Price</th><th>1h %</th><th>24h %</th><th>7d %</th></tr>
              </thead>
              <tbody>
                {filtered.map((p,i)=>(
                  <tr className="mkt-row" key={p.ticker}>
                    <td style={{color:'var(--muted)',width:40}}>{i+1}</td>
                    <td><div className="coin-name">{p.ticker}</div></td>
                    <td style={{fontFamily:"'Syne',sans-serif",fontWeight:700}}>{fmtPrice(p.price)}</td>
                    <td style={{color:chgColor(p.change1h)}}>{fmtChg(p.change1h)}</td>
                    <td style={{color:chgColor(p.change24h)}}>{fmtChg(p.change24h)}</td>
                    <td style={{color:chgColor(p.change7d)}}>{fmtChg(p.change7d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
