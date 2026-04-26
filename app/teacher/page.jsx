"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const fmtUSD = n => { const x=parseFloat(n); return isNaN(x)?'$0.00':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(x); };
const fmtPct = n => { const x=parseFloat(n); return isNaN(x)?'0.00%':(x>=0?'+':'')+x.toFixed(2)+'%'; };
const clean  = s => parseFloat(String(s||'').replace(/[$,%]/g,''))||0;

const TEACHER_EMAIL = process.env.NEXT_PUBLIC_TEACHER_EMAIL;

export default function Teacher() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marketStatus, setMarketStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [freezeMsg, setFreezeMsg] = useState('');
  const [headline, setHeadline] = useState('');
  const [headlineUrl, setHeadlineUrl] = useState('');
  const [flashCoin, setFlashCoin] = useState('');
  const [flashPct, setFlashPct] = useState('20');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [settingsForm, setSettingsForm] = useState({});

  useEffect(()=>{ if(status==='unauthenticated') router.replace('/'); },[status,router]);

  const fetchData = async () => {
    try {
      const [lbRes, mktRes, sRes] = await Promise.all([
        fetch('/api/leaderboard'), fetch('/api/teacher/market-status'), fetch('/api/settings'),
      ]);
      if(lbRes.ok) setStudents(await lbRes.json());
      if(mktRes.ok) setMarketStatus(await mktRes.json());
      if(sRes.ok) { const s=await sRes.json(); setSettings(s); setSettingsForm(s); }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ if(status==='authenticated') fetchData(); },[status]);

  if(status==='loading'||status==='unauthenticated') return <div style={{background:'#080c14',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#475569'}}>Loading...</div>;

  const teacherAction = async (endpoint, body={}) => {
    setActionMsg({type:'pending',msg:'Processing...'});
    try {
      const res = await fetch(`/api/teacher/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data = await res.json();
      if(res.ok){ setActionMsg({type:'success',msg:data.message||'✓ Done'}); fetchData(); }
      else setActionMsg({type:'error',msg:data.error||'Action failed'});
    } catch { setActionMsg({type:'error',msg:'Network error'}); }
    setTimeout(()=>setActionMsg(null),4000);
  };

  const saveSettings = async () => {
    setActionMsg({type:'pending',msg:'Saving...'});
    try {
      const res = await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(settingsForm)});
      const data = await res.json();
      if(res.ok){ setActionMsg({type:'success',msg:'✓ Settings saved'}); fetchData(); }
      else setActionMsg({type:'error',msg:data.error||'Failed'});
    } catch { setActionMsg({type:'error',msg:'Network error'}); }
    setTimeout(()=>setActionMsg(null),4000);
  };

  const humans = students.filter(s=>!s.isBot);
  const classAvg = humans.length ? humans.reduce((s,r)=>s+clean(r.returnPct),0)/humans.length : 0;
  const profitable = humans.filter(s=>clean(s.pl)>0).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--up:#00e5a0;--down:#f43f5e;--text:#e2e8f0;--muted:#475569;--gold:#f59e0b}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1200px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:rgba(15,23,42,.8);border:1px solid var(--border);border-radius:16px;backdrop-filter:blur(12px)}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(245,158,11,.1);color:var(--gold);border:1px solid rgba(245,158,11,.2)}
        .teacher-badge{padding:4px 10px;background:rgba(245,158,11,.15);color:var(--gold);border-radius:8px;font-size:10px;border:1px solid rgba(245,158,11,.3)}
        .page-title{font-family:'Syne',sans-serif;font-weight:800;font-size:32px;letter-spacing:-1px;margin-bottom:4px}
        .page-title span{color:var(--accent)}
        .tabs{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:4px;margin-bottom:24px;flex-wrap:wrap}
        .stab{flex:1;padding:9px;text-align:center;border-radius:10px;border:none;background:transparent;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);cursor:pointer;transition:all .2s;min-width:80px}
        .stab.active{background:var(--surface2);color:var(--gold);border:1px solid var(--border)}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px}
        .stat-label{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
        .stat-value{font-family:'Syne',sans-serif;font-weight:700;font-size:24px}
        .stat-value.up{color:var(--up)}.stat-value.down{color:var(--down)}.stat-value.gold{color:var(--gold)}
        .controls-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .ctrl-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px}
        .ctrl-title{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;margin-bottom:6px}
        .ctrl-desc{font-size:11px;color:var(--muted);margin-bottom:14px;line-height:1.6}
        .status-pill{display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:4px 10px;border-radius:8px;margin-bottom:12px}
        .status-pill.on{background:rgba(0,229,160,.1);color:var(--up)}.status-pill.off{background:rgba(71,85,105,.2);color:var(--muted)}.status-pill.warn{background:rgba(245,158,11,.1);color:var(--gold)}
        .btn{padding:9px 16px;border-radius:10px;border:none;font-family:'DM Mono',monospace;font-size:11px;font-weight:500;cursor:pointer;transition:all .2s}
        .btn-green{background:rgba(0,229,160,.15);color:var(--up);border:1px solid rgba(0,229,160,.3)}.btn-green:hover{background:rgba(0,229,160,.25)}
        .btn-red{background:rgba(244,63,94,.15);color:var(--down);border:1px solid rgba(244,63,94,.3)}.btn-red:hover{background:rgba(244,63,94,.25)}
        .btn-gold{background:rgba(245,158,11,.15);color:var(--gold);border:1px solid rgba(245,158,11,.3)}.btn-gold:hover{background:rgba(245,158,11,.25)}
        .btn-muted{background:var(--surface2);color:var(--text);border:1px solid var(--border)}.btn-muted:hover{border-color:var(--accent);color:var(--accent)}
        .btn-row{display:flex;gap:8px;flex-wrap:wrap}
        .text-input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-family:'DM Mono',monospace;font-size:12px;outline:none;transition:border-color .2s;margin-bottom:10px}
        .text-input:focus{border-color:var(--accent)}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .form-label{font-size:10px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:4px}
        .student-table{width:100%;border-collapse:collapse}
        .student-table th{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;padding:10px 14px;text-align:left;border-bottom:1px solid var(--border)}
        .srow{border-bottom:1px solid rgba(30,41,59,.4);transition:background .15s}
        .srow:hover{background:rgba(0,229,160,.03)}
        .srow td{padding:12px 14px;font-size:12px}
        .action-msg{position:fixed;bottom:24px;right:24px;padding:14px 20px;border-radius:14px;font-size:13px;z-index:999;border:1px solid}
        .action-msg.success{background:rgba(0,229,160,.1);color:var(--up);border-color:rgba(0,229,160,.3)}
        .action-msg.error{background:rgba(244,63,94,.1);color:var(--down);border-color:rgba(244,63,94,.3)}
        .action-msg.pending{background:rgba(59,130,246,.1);color:#60a5fa;border-color:rgba(59,130,246,.3)}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @media(max-width:640px){.stats-grid{grid-template-columns:1fr 1fr}.controls-grid{grid-template-columns:1fr}}
      `}</style>
      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <Link href="/dashboard" className="nav-link">Wallet</Link>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <Link href="/market" className="nav-link">Market</Link>
            <a href="/teacher" className="nav-link active">Teacher</a>
          </div>
          <div className="teacher-badge">👨‍🏫 TEACHER</div>
        </nav>

        <div className="page-title">🎓 Teacher <span>Dashboard</span></div>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:24}}>Manage your simulation, control the market, monitor students.</div>

        <div className="tabs">
          {['overview','controls','students','settings','news'].map(s=>(
            <button key={s} className={`stab${activeSection===s?' active':''}`} onClick={()=>setActiveSection(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
          ))}
        </div>

        {loading ? <div style={{display:'flex',flexDirection:'column',gap:12}}>{[1,2,3].map(i=><div key={i} className="skeleton" style={{height:80}}/>)}</div> : (
          <>
            {activeSection==='overview' && (
              <>
                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-label">Students</div><div className="stat-value gold">{humans.length}</div></div>
                  <div className="stat-card"><div className="stat-label">Profitable</div><div className={`stat-value ${profitable/Math.max(humans.length,1)>=.5?'up':'down'}`}>{profitable}/{humans.length}</div></div>
                  <div className="stat-card"><div className="stat-label">Avg Return</div><div className={`stat-value ${classAvg>=0?'up':'down'}`}>{classAvg>=0?'+':''}{classAvg.toFixed(2)}%</div></div>
                  <div className="stat-card"><div className="stat-label">Market</div><div className={`stat-value ${marketStatus?.frozen?'down':'up'}`}>{marketStatus?.frozen?'🔒 FROZEN':'✓ OPEN'}</div></div>
                </div>
                <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:22}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,marginBottom:14}}>Quick Actions</div>
                  <div className="btn-row">
                    <button className="btn btn-muted" onClick={fetchData}>↻ Refresh</button>
                    <button className="btn btn-gold" onClick={()=>setActiveSection('controls')}>⚙ Market Controls</button>
                    <button className="btn btn-muted" onClick={()=>setActiveSection('students')}>👥 Students</button>
                    <button className="btn btn-muted" onClick={()=>setActiveSection('news')}>📰 Post News</button>
                    <Link href="/leaderboard" style={{textDecoration:'none'}}><button className="btn btn-muted">🏆 Leaderboard</button></Link>
                  </div>
                </div>
              </>
            )}

            {activeSection==='controls' && (
              <div className="controls-grid">
                <div className="ctrl-card">
                  <div className="ctrl-title">🚫 Market Freeze</div>
                  <div className="ctrl-desc">Suspend all trading instantly. Students see your message.</div>
                  <div className={`status-pill ${marketStatus?.frozen?'warn':'off'}`}><span>{marketStatus?.frozen?'🔴':'⚪'}</span>{marketStatus?.frozen?'FROZEN':'OPEN'}</div>
                  {!marketStatus?.frozen&&<input className="text-input" placeholder="Reason (e.g. Class discussion)" value={freezeMsg} onChange={e=>setFreezeMsg(e.target.value)}/>}
                  <div className="btn-row">
                    {marketStatus?.frozen
                      ? <button className="btn btn-green" onClick={()=>teacherAction('unfreeze')}>▶ Unfreeze</button>
                      : <button className="btn btn-red" onClick={()=>teacherAction('freeze',{reason:freezeMsg||'Market temporarily closed'})}>🔒 Freeze</button>}
                  </div>
                </div>
                <div className="ctrl-card">
                  <div className="ctrl-title">🐂 Bull Run</div>
                  <div className="ctrl-desc">Amplify all price changes to simulate a bull market.</div>
                  <div className={`status-pill ${marketStatus?.bullRun?'on':'off'}`}><span>{marketStatus?.bullRun?'🟢':'⚪'}</span>{marketStatus?.bullRun?`ACTIVE — ${marketStatus.bullMult}×`:'INACTIVE'}</div>
                  <div className="btn-row">
                    {marketStatus?.bullRun
                      ? <button className="btn btn-red" onClick={()=>teacherAction('bull-run/stop')}>⏹ End Bull Run</button>
                      : <><button className="btn btn-gold" onClick={()=>teacherAction('bull-run/start',{multiplier:2})}>🐂 2×</button><button className="btn btn-red" onClick={()=>teacherAction('bull-run/start',{multiplier:3})}>🚀 3×</button></>}
                  </div>
                </div>
                <div className="ctrl-card">
                  <div className="ctrl-title">⚡ Flash Sale</div>
                  <div className="ctrl-desc">Discount one coin temporarily to create a buying opportunity.</div>
                  <div className={`status-pill ${marketStatus?.flashSale?'warn':'off'}`}><span>{marketStatus?.flashSale?'🟡':'⚪'}</span>{marketStatus?.flashSale?`ACTIVE — ${marketStatus.flashSale.coin}`:'NONE'}</div>
                  {!marketStatus?.flashSale&&<div className="form-row"><input className="text-input" placeholder="Coin (BTC)" value={flashCoin} onChange={e=>setFlashCoin(e.target.value)} style={{marginBottom:0}}/><input className="text-input" placeholder="% off (20)" value={flashPct} onChange={e=>setFlashPct(e.target.value)} style={{marginBottom:0}}/></div>}
                  {!marketStatus?.flashSale&&<div style={{height:10}}/>}
                  <div className="btn-row">
                    {marketStatus?.flashSale
                      ? <button className="btn btn-muted" onClick={()=>teacherAction('flash-sale/stop')}>⏹ End Sale</button>
                      : <button className="btn btn-gold" onClick={()=>{if(flashCoin&&flashPct)teacherAction('flash-sale/start',{coin:flashCoin.toUpperCase(),discountPct:parseFloat(flashPct),minutes:30})}}>⚡ Start Flash Sale</button>}
                  </div>
                </div>
                <div className="ctrl-card">
                  <div className="ctrl-title">🏁 Simulation</div>
                  <div className="ctrl-desc">Pause for discussion or end the simulation.</div>
                  <div className="btn-row" style={{flexDirection:'column'}}>
                    <button className="btn btn-gold" style={{width:'100%',marginBottom:8}} onClick={()=>teacherAction('pause')}>⏸ Pause Simulation</button>
                    <button className="btn btn-green" style={{width:'100%',marginBottom:8}} onClick={()=>teacherAction('resume')}>▶ Resume Simulation</button>
                    <button className="btn btn-red" style={{width:'100%'}} onClick={()=>{if(confirm('End simulation?'))teacherAction('end')}}>🏁 End Simulation</button>
                  </div>
                </div>
              </div>
            )}

            {activeSection==='students' && (
              <>
                <div className="ctrl-card" style={{marginBottom:16}}>
                  <div className="ctrl-title" style={{marginBottom:12}}>➕ Add Student</div>
                  <div className="form-row">
                    <div><label className="form-label">Name</label><input className="text-input" placeholder="Jane Smith" value={newStudentName} onChange={e=>setNewStudentName(e.target.value)} style={{marginBottom:0}}/></div>
                    <div><label className="form-label">Email</label><input className="text-input" placeholder="jsmith@school.edu" value={newStudentEmail} onChange={e=>setNewStudentEmail(e.target.value)} style={{marginBottom:0}}/></div>
                  </div>
                  <div style={{height:10}}/>
                  <button className="btn btn-green" onClick={()=>{if(newStudentName&&newStudentEmail){teacherAction('add-student',{name:newStudentName,email:newStudentEmail});setNewStudentName('');setNewStudentEmail('');}}} >➕ Add Student</button>
                </div>
                <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:22,overflowX:'auto'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15}}>All Students ({humans.length})</div>
                    <button className="btn btn-muted" onClick={fetchData}>↻ Refresh</button>
                  </div>
                  <table className="student-table">
                    <thead><tr><th>Rank</th><th>Name</th><th>Portfolio</th><th>Return</th><th>P/L</th><th>Cash</th><th>Actions</th></tr></thead>
                    <tbody>
                      {students.map((s,i)=>{
                        const ret=clean(s.returnPct), pl=clean(s.pl), isPos=ret>=0;
                        return (
                          <tr className="srow" key={i}>
                            <td style={{color:'var(--muted)',fontWeight:700}}>{i+1}</td>
                            <td><div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13}}>{s.isBot?'🤖 ':''}{s.name}</div></td>
                            <td style={{fontFamily:"'Syne',sans-serif",fontWeight:700}}>{fmtUSD(s.total)}</td>
                            <td style={{color:isPos?'var(--up)':'var(--down)',fontWeight:500}}>{fmtPct(ret)}</td>
                            <td style={{color:isPos?'var(--up)':'var(--down)'}}>{isPos?'+':''}{fmtUSD(pl)}</td>
                            <td style={{color:'var(--muted)'}}>{fmtUSD(s.cash)}</td>
                            <td>
                              <div className="btn-row">
                                <button className="btn btn-muted" style={{padding:'4px 10px',fontSize:10}} onClick={()=>{if(confirm(`Reset ${s.name}?`))teacherAction('reset-student',{studentId:s.id})}}>↺ Reset</button>
                                <button className="btn btn-red" style={{padding:'4px 10px',fontSize:10}} onClick={()=>{if(confirm(`Remove ${s.name}?`))teacherAction('remove-student',{studentId:s.id})}}>✕ Remove</button>
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

            {activeSection==='settings' && settings && (
              <div className="controls-grid">
                <div className="ctrl-card">
                  <div className="ctrl-title">💰 Simulation Settings</div>
                  <div className="ctrl-desc">Core settings for this simulation run.</div>
                  <label className="form-label">Starting Cash ($)</label>
                  <input className="text-input" type="number" value={settingsForm.seedMoney||10000} onChange={e=>setSettingsForm(f=>({...f,seedMoney:parseFloat(e.target.value)}))}/>
                  <label className="form-label">Trade Fee (%)</label>
                  <input className="text-input" type="number" step="0.1" value={settingsForm.tradeFeePct||0.5} onChange={e=>setSettingsForm(f=>({...f,tradeFeePct:parseFloat(e.target.value)}))}/>
                  <button className="btn btn-green" onClick={saveSettings}>💾 Save Settings</button>
                </div>
                <div className="ctrl-card">
                  <div className="ctrl-title">⏰ Trading Hours</div>
                  <div className="ctrl-desc">Restrict trading to specific hours (ET).</div>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <label style={{fontSize:12}}>Enable</label>
                    <input type="checkbox" checked={!!settingsForm.tradingHoursOn} onChange={e=>setSettingsForm(f=>({...f,tradingHoursOn:e.target.checked}))}/>
                  </div>
                  <div className="form-row">
                    <div><label className="form-label">Open</label><input className="text-input" type="time" value={settingsForm.tradingHoursStart||'09:00'} onChange={e=>setSettingsForm(f=>({...f,tradingHoursStart:e.target.value}))} style={{marginBottom:0}}/></div>
                    <div><label className="form-label">Close</label><input className="text-input" type="time" value={settingsForm.tradingHoursEnd||'15:00'} onChange={e=>setSettingsForm(f=>({...f,tradingHoursEnd:e.target.value}))} style={{marginBottom:0}}/></div>
                  </div>
                  <div style={{height:10}}/>
                  <button className="btn btn-green" onClick={saveSettings}>💾 Save</button>
                </div>
                <div className="ctrl-card">
                  <div className="ctrl-title">📵 Daily Trade Limit</div>
                  <div className="ctrl-desc">Cap how many trades each student can make per day.</div>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <label style={{fontSize:12}}>Enable</label>
                    <input type="checkbox" checked={!!settingsForm.dailyLimitOn} onChange={e=>setSettingsForm(f=>({...f,dailyLimitOn:e.target.checked}))}/>
                  </div>
                  <label className="form-label">Max trades per day</label>
                  <input className="text-input" type="number" min="1" value={settingsForm.dailyLimitN||3} onChange={e=>setSettingsForm(f=>({...f,dailyLimitN:parseInt(e.target.value)}))}/>
                  <button className="btn btn-green" onClick={saveSettings}>💾 Save</button>
                </div>
                <div className="ctrl-card">
                  <div className="ctrl-title">📈 Margin Trading</div>
                  <div className="ctrl-desc">Allow leveraged positions. Losses are also amplified!</div>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <label style={{fontSize:12}}>Enable</label>
                    <input type="checkbox" checked={!!settingsForm.marginEnabled} onChange={e=>setSettingsForm(f=>({...f,marginEnabled:e.target.checked}))}/>
                  </div>
                  <label className="form-label">Leverage multiplier</label>
                  <select className="text-input" value={settingsForm.marginMult||2} onChange={e=>setSettingsForm(f=>({...f,marginMult:parseInt(e.target.value)}))}>
                    <option value={2}>2× (doubles gains and losses)</option>
                    <option value={3}>3× (triples gains and losses)</option>
                  </select>
                  <button className="btn btn-green" onClick={saveSettings}>💾 Save</button>
                </div>
              </div>
            )}

            {activeSection==='news' && (
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                <div className="ctrl-card">
                  <div className="ctrl-title">📰 Post a Headline</div>
                  <div className="ctrl-desc">Pushes to all student dashboards. Use to simulate real market events.</div>
                  <input className="text-input" placeholder="🚀 Elon Musk tweets about DOGE — price surging!" value={headline} onChange={e=>setHeadline(e.target.value)}/>
                  <input className="text-input" placeholder="Optional URL (https://...)" value={headlineUrl} onChange={e=>setHeadlineUrl(e.target.value)}/>
                  <div className="btn-row">
                    <button className="btn btn-gold" onClick={()=>{if(headline){teacherAction('post-headline',{headline,url:headlineUrl});setHeadline('');setHeadlineUrl('');}}}>📰 Post to All Students</button>
                    <button className="btn btn-muted" onClick={()=>teacherAction('clear-headlines')}>🗑 Clear Headlines</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {actionMsg&&<div className={`action-msg ${actionMsg.type}`}>{actionMsg.msg}</div>}
    </>
  );
}
