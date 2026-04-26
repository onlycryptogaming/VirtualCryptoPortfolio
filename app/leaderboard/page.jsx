"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const fmtUSD = n => { const x=parseFloat(n); return isNaN(x)?'$0.00':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(x); };
const fmtPct = n => { const x=parseFloat(n); return isNaN(x)?'0.00%':(x>=0?'+':'')+x.toFixed(2)+'%'; };
const clean  = s => parseFloat(String(s||'').replace(/[$,%]/g,''))||0;

export default function Leaderboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(()=>{ if(status==='unauthenticated') router.replace('/'); },[status,router]);
  useEffect(()=>{
    if(status==='authenticated'){
      fetch('/api/leaderboard').then(r=>r.json()).then(d=>{ setStudents(Array.isArray(d)?d:[]); setLastUpdated(new Date()); setLoading(false); });
      const iv=setInterval(()=>fetch('/api/leaderboard').then(r=>r.json()).then(d=>{ setStudents(Array.isArray(d)?d:[]); setLastUpdated(new Date()); }),60000);
      return()=>clearInterval(iv);
    }
  },[status]);

  if(status==='loading'||status==='unauthenticated') return <div style={{background:'#080c14',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#475569'}}>Loading...</div>;

  const medals = ['🥇','🥈','🥉'];
  const humans = students.filter(s=>!s.isBot);
  const seedMoney = 10000;

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
        .page-title{font-family:'Syne',sans-serif;font-weight:800;font-size:32px;letter-spacing:-1px;margin-bottom:4px}
        .page-title span{color:var(--gold)}
        .page-sub{font-size:11px;color:var(--muted);margin-bottom:24px}
        .podium{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px}
        .podium-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:20px;text-align:center;transition:all .2s;position:relative;overflow:hidden}
        .podium-card.first{border-color:rgba(245,158,11,.4);background:linear-gradient(135deg,#0f172a,#1a1a00)}
        .podium-card.second{border-color:rgba(148,163,184,.3)}
        .podium-card.third{border-color:rgba(205,127,50,.3)}
        .podium-medal{font-size:32px;margin-bottom:8px}
        .podium-name{font-family:'Syne',sans-serif;font-weight:700;font-size:14px;margin-bottom:4px}
        .podium-value{font-family:'Syne',sans-serif;font-weight:800;font-size:22px;margin-bottom:4px}
        .podium-return{font-size:12px;font-weight:500}
        .table-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px;overflow-x:auto}
        .lb-table{width:100%;border-collapse:collapse}
        .lb-table th{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;padding:10px 14px;text-align:left;border-bottom:1px solid var(--border)}
        .lb-row{border-bottom:1px solid rgba(30,41,59,.4);transition:background .15s}
        .lb-row:hover{background:rgba(0,229,160,.03)}
        .lb-row td{padding:13px 14px;font-size:12px}
        .rank-cell{font-family:'Syne',sans-serif;font-weight:700;font-size:16px;color:var(--muted);width:40px}
        .name-cell{font-family:'Syne',sans-serif;font-weight:600;font-size:13px}
        .bar-wrap{background:var(--surface2);border-radius:4px;height:6px;overflow:hidden;width:80px;margin-top:4px}
        .bar-fill{height:100%;border-radius:4px;transition:width .6s}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @media(max-width:640px){.podium{grid-template-columns:1fr}}
      `}</style>
      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <Link href="/dashboard" className="nav-link">Wallet</Link>
            <a href="/leaderboard" className="nav-link active">Leaderboard</a>
            <Link href="/market" className="nav-link">Market</Link>
            <Link href="/badges" className="nav-link">Badges</Link>
          </div>
          {lastUpdated&&<span style={{fontSize:10,color:'var(--muted)'}}>Updated {lastUpdated.toLocaleTimeString()}</span>}
        </nav>

        <div className="page-title">🏆 <span>Leaderboard</span></div>
        <div className="page-sub">Live standings — updates every 60 seconds</div>

        {loading ? (
          <><div className="skeleton" style={{height:180,marginBottom:20}}/><div className="skeleton" style={{height:400}}/></>
        ) : (
          <>
            {humans.length >= 3 && (
              <div className="podium">
                {[1,0,2].map(i => {
                  const s = humans[i];
                  if(!s) return <div key={i}/>;
                  const ret = clean(s.returnPct);
                  const isPos = ret >= 0;
                  return (
                    <div key={i} className={`podium-card ${i===0?'first':i===1?'second':'third'}`}>
                      <div className="podium-medal">{medals[i]}</div>
                      <div className="podium-name">{s.name}</div>
                      <div className="podium-value" style={{color:isPos?'var(--up)':'var(--down)'}}>{fmtUSD(s.total)}</div>
                      <div className="podium-return" style={{color:isPos?'var(--up)':'var(--down)'}}>{fmtPct(ret)}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="table-card">
              <table className="lb-table">
                <thead>
                  <tr><th>Rank</th><th>Student</th><th>Portfolio</th><th>Return</th><th>P/L</th><th>Cash</th><th>Coins</th><th>Fees</th><th>Progress</th></tr>
                </thead>
                <tbody>
                  {students.map((s,i)=>{
                    const ret = clean(s.returnPct);
                    const pl  = clean(s.pl);
                    const isPos = ret >= 0;
                    return (
                      <tr className="lb-row" key={i}>
                        <td className="rank-cell">{i<3?medals[i]:i+1}</td>
                        <td><div className="name-cell">{s.isBot?'🤖 ':''}{s.name}</div></td>
                        <td style={{fontFamily:"'Syne',sans-serif",fontWeight:700}}>{fmtUSD(s.total)}</td>
                        <td style={{color:isPos?'var(--up)':'var(--down)',fontWeight:500}}>{fmtPct(ret)}</td>
                        <td style={{color:isPos?'var(--up)':'var(--down)'}}>{isPos?'+':''}{fmtUSD(pl)}</td>
                        <td style={{color:'var(--muted)'}}>{fmtUSD(s.cash)}</td>
                        <td style={{color:'var(--muted)',textAlign:'center'}}>{s.coinCount||0}</td>
                        <td style={{color:'var(--muted)'}}>{fmtUSD(s.fees)}</td>
                        <td>
                          <div className="bar-wrap">
                            <div className="bar-fill" style={{width:`${Math.min(100,Math.abs(ret)*2)}%`,background:isPos?'var(--up)':'var(--down)'}}/>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
