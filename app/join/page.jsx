"use client";
import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function JoinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [invite, setInvite] = useState(null);
  const [error, setError]   = useState(null);
  const [joining, setJoining] = useState(false);
  const [done, setDone]     = useState(false);

  // Validate token
  useEffect(() => {
    if (!token) { setError("No invitation token found."); return; }
    fetch(`/api/join?token=${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setInvite(d); })
      .catch(() => setError("Failed to load invitation."));
  }, [token]);

  // Auto-join once signed in
  useEffect(() => {
    if (status === "authenticated" && invite && !done) {
      setJoining(true);
      fetch("/api/join", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, email: session.user.email }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.success || d.alreadyAccepted) {
            setDone(true);
            setTimeout(() => router.replace("/dashboard"), 2000);
          } else {
            setError(d.error || "Failed to join class.");
            setJoining(false);
          }
        })
        .catch(() => { setError("Network error."); setJoining(false); });
    }
  }, [status, invite, done, token, session, router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#080c14;color:#e2e8f0;font-family:'DM Mono',monospace;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
        .card{background:#0f172a;border:1px solid #1e293b;border-radius:24px;padding:40px 36px;max-width:440px;width:100%;text-align:center}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:22px;letter-spacing:-1px;margin-bottom:6px}
        .logo span{color:#00e5a0}
        .title{font-family:'Syne',sans-serif;font-weight:700;font-size:22px;margin-bottom:8px;margin-top:24px}
        .sub{font-size:12px;color:#475569;margin-bottom:24px;line-height:1.6}
        .info-box{background:rgba(0,229,160,.06);border:1px solid rgba(0,229,160,.2);border-radius:12px;padding:16px;margin-bottom:24px;text-align:left}
        .info-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px}
        .info-label{color:#475569}
        .info-value{color:#e2e8f0;font-weight:600}
        .btn{width:100%;padding:14px;border-radius:12px;border:none;background:#00e5a0;color:#000;font-family:'DM Mono',monospace;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;margin-bottom:10px}
        .btn:hover{background:#00ffb0}
        .btn:disabled{opacity:.5;cursor:not-allowed}
        .error{background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.3);color:#f43f5e;border-radius:10px;padding:12px;font-size:12px;margin-bottom:16px}
        .success{background:rgba(0,229,160,.1);border:1px solid rgba(0,229,160,.3);color:#00e5a0;border-radius:10px;padding:12px;font-size:12px;margin-bottom:16px}
        .spinner{display:inline-block;width:20px;height:20px;border:2px solid #1e293b;border-top-color:#00e5a0;border-radius:50%;animation:spin .8s linear infinite;margin-bottom:12px}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      <div className="card">
        <div className="logo">CRYPTO<span>CLASS</span></div>

        {!invite && !error && (
          <><div className="spinner" style={{marginTop:24}}/><div style={{fontSize:12,color:'#475569'}}>Loading invitation...</div></>
        )}

        {error && (
          <>
            <div className="title">⚠️ Oops</div>
            <div className="error">{error}</div>
            <div style={{fontSize:11,color:'#475569'}}>Contact your teacher if you think this is a mistake.</div>
          </>
        )}

        {done && (
          <>
            <div style={{fontSize:48,margin:'20px 0'}}>🎉</div>
            <div className="title">You're in!</div>
            <div className="success">Successfully joined {invite?.className}! Redirecting to your portfolio...</div>
          </>
        )}

        {invite && !error && !done && (
          <>
            <div style={{fontSize:48,margin:'16px 0'}}>👋</div>
            <div className="title">You're Invited!</div>
            <div className="sub">Join your class and start trading with virtual crypto.</div>

            <div className="info-box">
              <div className="info-row"><span className="info-label">Student</span><span className="info-value">{invite.name}</span></div>
              <div className="info-row"><span className="info-label">Class</span><span className="info-value">{invite.className}</span></div>
              <div className="info-row"><span className="info-label">Starting Cash</span><span className="info-value">$10,000</span></div>
            </div>

            {status === "unauthenticated" && (
              <>
                <button className="btn" onClick={() => signIn("google")}>Sign in with Google to Join</button>
                <div style={{fontSize:10,color:'#334155',lineHeight:1.6}}>
                  Use your school account: {invite.email}
                </div>
              </>
            )}

            {status === "loading" && <><div className="spinner"/><div style={{fontSize:12,color:'#475569'}}>Signing in...</div></>}

            {status === "authenticated" && joining && (
              <><div className="spinner"/><div style={{fontSize:12,color:'#475569'}}>Joining {invite.className}...</div></>
            )}
          </>
        )}
      </div>
    </>
  );
}
