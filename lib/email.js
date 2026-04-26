import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXTAUTH_URL || 'https://virtual-crypto-portfolio-supabase.vercel.app';
const FROM    = process.env.RESEND_FROM  || 'CryptoClassroom <onboarding@resend.dev>';

export async function sendInviteEmail({ to, name, className, token, teacherName }) {
  const joinUrl = `${APP_URL}/join?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    
    <div style="background: #080c14; padding: 32px; text-align: center;">
      <div style="font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -1px;">
        CRYPTO<span style="color: #00e5a0;">CLASS</span>
      </div>
      <div style="color: #475569; font-size: 12px; letter-spacing: 3px; margin-top: 6px; text-transform: uppercase;">
        Virtual Trading Simulator
      </div>
    </div>

    <div style="padding: 40px 32px;">
      <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 22px;">
        Hi ${name}! You've been invited 🎉
      </h2>
      
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        <strong>${teacherName || 'Your teacher'}</strong> has invited you to join 
        <strong>${className}</strong> on CryptoClassroom — a virtual crypto trading simulator.
      </p>

      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
        <div style="font-size: 13px; color: #166534; font-weight: 600; margin-bottom: 8px;">What you get:</div>
        <div style="font-size: 13px; color: #166534;">💰 $10,000 in virtual cash to trade</div>
        <div style="font-size: 13px; color: #166534; margin-top: 4px;">📈 Live crypto prices from CoinGecko</div>
        <div style="font-size: 13px; color: #166534; margin-top: 4px;">🏆 Compete on the class leaderboard</div>
        <div style="font-size: 13px; color: #166534; margin-top: 4px;">🏅 Earn achievement badges</div>
      </div>

      <a href="${joinUrl}" style="display: block; background: #00e5a0; color: #000000; text-decoration: none; text-align: center; padding: 16px; border-radius: 12px; font-weight: 700; font-size: 15px; margin-bottom: 28px;">
        Join CryptoClassroom →
      </a>

      <div style="background: #f8f9fa; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
        <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 10px;">How to sign in:</div>
        <div style="font-size: 13px; color: #475569;">1. Click the button above</div>
        <div style="font-size: 13px; color: #475569; margin-top: 4px;">2. Sign in with your school Google account</div>
        <div style="font-size: 13px; color: #475569; margin-top: 4px; font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; display: inline-block;">${to}</div>
        <div style="font-size: 13px; color: #475569; margin-top: 4px;">3. You'll be taken straight to your portfolio!</div>
      </div>

      <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.6; text-align: center;">
        ⚠️ Educational simulator only. No real money involved. Not financial advice.
      </p>
    </div>

  </div>
</body>
</html>`;

  const { data, error } = await resend.emails.send({
    from:    FROM,
    to,
    subject: `You've been invited to ${className} on CryptoClassroom!`,
    html,
  });

  if (error) throw new Error(error.message);
  return data;
}
