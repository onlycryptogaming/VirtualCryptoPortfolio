"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ALL_BADGES = [
  {id:'first_trade',cat:'milestone',emoji:'🥇',name:'First Trade',hint:'Execute your first trade'},
  {id:'active_trader',cat:'milestone',emoji:'⚡',name:'Active Trader',hint:'Complete 10 trades'},
  {id:'power_trader',cat:'milestone',emoji:'🔥',name:'Power Trader',hint:'Complete 25 trades'},
  {id:'whale',cat:'milestone',emoji:'🐳',name:'Whale',hint:'Net $2,000 gain on a single trade'},
  {id:'doubled_up',cat:'milestone',emoji:'💰',name:'Doubled Up',hint:'Double your money on a coin'},
  {id:'first_profit',cat:'performance',emoji:'🌱',name:'First Profit',hint:'Make money on your first sell'},
  {id:'ten_pct',cat:'performance',emoji:'🚀',name:'10% Club',hint:'Portfolio hits +10% return'},
  {id:'diamond_hands',cat:'performance',emoji:'💎',name:'Diamond Hands',hint:'Portfolio hits +25% return'},
  {id:'to_the_moon',cat:'performance',emoji:'🌕',name:'To The Moon',hint:'Portfolio hits +50% return'},
  {id:'diversified',cat:'strategy',emoji:'🌈',name:'Diversified',hint:'Hold 4+ different coins at once'},
  {id:'sharpshooter',cat:'strategy',emoji:'🎯',name:'Sharpshooter',hint:'3 consecutive profitable sells'},
  {id:'hodler',cat:'strategy',emoji:'🧘',name:'HODLer',hint:'Hold a coin 7+ days, sell profitably'},
  {id:'analyst',cat:'learning',emoji:'📝',name:'Analyst',hint:'Write trade notes on 5 trades'},
  {id:'researcher',cat:'learning',emoji:'📖',name:'Researcher',hint:'Write trade notes on 15 trades'},
  {id:'bull_rider',cat:'situational',emoji:'🐂',name:'Bull Rider',hint:'Profit during a bull run'},
  {id:'flash_deal',cat:'situational',emoji:'⚡',name:'Flash Deal',hint:'Buy a coin during a flash sale'},
  {id:'news_trader',cat:'situational',emoji:'📰',name:'News Trader',hint:'Trade within 30 min of a headline'},
  {id:'champion',cat:'simulation',emoji:'🏆',name:'Class Champion',hint:'Finish 1st in the simulation'},
  {id:'beat_the_bot',cat:'simulation',emoji:'🤖',name:'Beat The Bot',hint:'Finish above Satoshi Botomoto'},
  {id:'most_improved',cat:'simulation',emoji:'📊',name:'Most Improved',hint:'Biggest week-over-week gain'},
];

const CAT_COLORS = {
  milestone:'#f59e0b',performance:'#00e5a0',strategy:'#3b82f6',
  learning:'#8b5cf6',situational:'#f43f5e',simulation:'#06b6d4',
};

export default function Badges() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [earned, setEarned] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ if(status==='unauthenticated') router.replace('/'); },[status,router]);
  useEffect(()=>{
    if(status==='authenticated'){
      fetch('/api/badges').then(r=>r.ok?r.json():[]).then(d=>{ setEarned(Array.isArray(d)?d.map(b=>b.badge_id||b):[]); setLoading(false); }).catch(()=>setLoading(false));
    }
  },[status]);

  if(status==='loading'||status==='unauthenticated') return <div style={{background:'#080c14',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#475569'}}>Loading...</div>;

  const cats = [...new Set(ALL_BADGES.map(b=>b.cat))];
  const earnedCount = ALL_BADGES.filter(b=>earned.includes(b.id)).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--text:#e2e8f0;--muted:#475569}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1100px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:rgba(15,23,42,.8);border:1px solid var(--border);border-radius:16px;backdrop-filter:blur(12px)}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(0,229,160,.1);color:var(--accent);border:1px solid rgba(0,229,160,.2)}
        .progress-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:24px;margin-bottom:24px;display:flex;align-items:center;gap:24px}
        .progress-num{font-family:'Syne',sans-serif;font-weight:800;font-size:48px;color:var(--accent)}
        .progress-bar-wrap{flex:1;background:var(--surface2);border-radius:8px;height:12px;overflow:hidden}
        .progress-bar-fill{height:100%;border-radius:8px;background:linear-gradient(90deg,var(--accent),#3b82f6);transition:width .8s ease}
        .cat-section{margin-bottom:32px}
        .cat-title{font-family:'Syne',sans-serif;font-weight:700;font-size:16px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .badge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
        .badge-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;text-align:center;transition:all .2s;position:relative}
        .badge-card.earned{border-color:var(--accent-color, #00e5a0);background:rgba(0,229,160,.05)}
        .badge-card.locked{opacity:.5}
        .badge-emoji{font-size:32px;margin-bottom:8px;display:block}
        .badge-name{font-family:'Syne',sans-serif;font-weight:700;font-size:11px;margin-bottom:4px}
        .badge-hint{font-size:9px;color:var(--muted);line-height:1.5}
        .badge-date{font-size:9px;color:var(--accent);margin-top:4px}
        .earned-check{position:absolute;top:8px;right:8px;font-size:14px}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <Link href="/dashboard" className="nav-link">Wallet</Link>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <Link href="/market" className="nav-link">Market</Link>
            <a href="/badges" className="nav-link active">Badges</a>
          </div>
        </nav>

        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:32,letterSpacing:-1,marginBottom:4}}>🏅 <span style={{color:'var(--accent)'}}>Badges</span></div>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:24}}>Earn badges by hitting trading milestones</div>

        {loading ? <div className="skeleton" style={{height:100,marginBottom:24}}/> : (
          <div className="progress-card">
            <div className="progress-num">{earnedCount}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>of {ALL_BADGES.length} badges earned</div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{width:`${(earnedCount/ALL_BADGES.length)*100}%`}}/>
              </div>
            </div>
          </div>
        )}

        {cats.map(cat=>(
          <div className="cat-section" key={cat}>
            <div className="cat-title">
              <span style={{width:12,height:12,borderRadius:3,background:CAT_COLORS[cat],display:'inline-block'}}/>
              {cat.charAt(0).toUpperCase()+cat.slice(1)}
              <span style={{fontSize:11,color:'var(--muted)',fontWeight:400}}>({ALL_BADGES.filter(b=>b.cat===cat&&earned.includes(b.id)).length}/{ALL_BADGES.filter(b=>b.cat===cat).length})</span>
            </div>
            <div className="badge-grid">
              {ALL_BADGES.filter(b=>b.cat===cat).map(badge=>{
                const isEarned = earned.includes(badge.id);
                return (
                  <div key={badge.id} className={`badge-card ${isEarned?'earned':'locked'}`} style={isEarned?{'--accent-color':CAT_COLORS[badge.cat]}:{}}>
                    {isEarned&&<span className="earned-check">✓</span>}
                    <span className="badge-emoji">{isEarned?badge.emoji:'🔒'}</span>
                    <div className="badge-name">{badge.name}</div>
                    <div className="badge-hint">{badge.hint}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
