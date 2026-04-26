"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  return (
    <div
      style={{
        background: "#080c14",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Mono', monospace",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 24,
          padding: "48px 40px",
          textAlign: "center",
          maxWidth: 400,
          width: "90%",
        }}
      >
        <div
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: -1,
            color: "#e2e8f0",
            marginBottom: 8,
          }}
        >
          CRYPTO<span style={{ color: "#00e5a0" }}>CLASS</span>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "#475569",
            marginBottom: 32,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Virtual Trading Simulator
        </div>

        <button
          onClick={() => signIn("google")}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            border: "none",
            background: "#00e5a0",
            color: "#000",
            fontFamily: "'DM Mono', monospace",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: 0.5,
          }}
        >
          Sign in with Google
        </button>

        <div
          style={{
            fontSize: 10,
            color: "#334155",
            marginTop: 20,
            lineHeight: 1.6,
          }}
        >
          Educational simulator only. No real money involved.
          <br />
          Not financial advice.
        </div>
      </div>
    </div>
  );
}
