import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setConfigs, getAllConfig } from '@/lib/db';
import { getAllStudents, addStudent, removeStudent, resetStudentPortfolio, getStudentByName } from '@/lib/students';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL)
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const action = params.action;
  let body = {};
  try { body = await request.json(); } catch {}

  switch (action) {

    // ── Market Controls ──────────────────────────────────────────
    case 'freeze':
      await setConfigs({
        MARKET_FREEZE:        '1',
        MARKET_FREEZE_REASON: body.reason || 'Market temporarily closed',
        MARKET_FREEZE_UNTIL:  body.minutes
          ? new Date(Date.now() + body.minutes * 60000).toISOString()
          : '',
      });
      return Response.json({ success: true, message: '🔒 Market frozen' });

    case 'unfreeze':
      await setConfigs({ MARKET_FREEZE: '0', MARKET_FREEZE_REASON: '', MARKET_FREEZE_UNTIL: '' });
      return Response.json({ success: true, message: '✅ Market open' });

    case 'bull-run/start':
      await setConfigs({
        BULL_RUN_ACTIVE:     '1',
        BULL_RUN_MULTIPLIER: String(body.multiplier || 2),
      });
      return Response.json({ success: true, message: `🐂 Bull run started (${body.multiplier || 2}×)` });

    case 'bull-run/stop':
      await setConfigs({ BULL_RUN_ACTIVE: '0' });
      return Response.json({ success: true, message: '⏹ Bull run ended' });

    case 'flash-sale/start': {
      if (!body.coin)
        return Response.json({ error: 'Coin is required' }, { status: 400 });
      const factor = 1 - ((body.discountPct || 20) / 100);
      const until  = new Date(Date.now() + (body.minutes || 30) * 60000).toISOString();
      await setConfigs({
        FLASH_SALE_COIN:   body.coin.toUpperCase(),
        FLASH_SALE_FACTOR: String(factor),
        FLASH_SALE_UNTIL:  until,
      });
      return Response.json({ success: true, message: `⚡ Flash sale: ${body.coin.toUpperCase()} ${body.discountPct || 20}% off` });
    }

    case 'flash-sale/stop':
      await setConfigs({ FLASH_SALE_COIN: '', FLASH_SALE_FACTOR: '', FLASH_SALE_UNTIL: '' });
      return Response.json({ success: true, message: '⏹ Flash sale ended' });

    // ── Simulation ───────────────────────────────────────────────
    case 'pause':
      await setConfigs({
        SIM_PAUSED:           '1',
        MARKET_FREEZE:        '1',
        MARKET_FREEZE_REASON: '⏸ Simulation paused — class discussion in progress',
      });
      return Response.json({ success: true, message: '⏸ Simulation paused' });

    case 'resume':
      await setConfigs({ SIM_PAUSED: '0', MARKET_FREEZE: '0', MARKET_FREEZE_REASON: '' });
      return Response.json({ success: true, message: '▶ Simulation resumed' });

    case 'end':
      await setConfigs({
        SIM_PAUSED:           '1',
        MARKET_FREEZE:        '1',
        MARKET_FREEZE_REASON: '🏁 Simulation has ended. Thanks for playing!',
      });
      return Response.json({ success: true, message: '🏁 Simulation ended' });

    // ── Headlines ────────────────────────────────────────────────
    case 'post-headline': {
      if (!body.headline)
        return Response.json({ error: 'Headline is required' }, { status: 400 });
      const cfg = await getAllConfig();
      let history = [];
      try { history = JSON.parse(cfg.HEADLINE_HISTORY || '[]'); } catch {}
      history.push({ text: body.headline, url: body.url || '', ts: Date.now(), type: '👨‍🏫 Teacher Post' });
      if (history.length > 20) history = history.slice(-20);
      await setConfigs({ HEADLINE_HISTORY: JSON.stringify(history) });
      return Response.json({ success: true, message: '📰 Headline posted' });
    }

    case 'clear-headlines':
      await setConfigs({ HEADLINE_HISTORY: '[]' });
      return Response.json({ success: true, message: '🗑 Headlines cleared' });

    // ── Fee Override ─────────────────────────────────────────────
    case 'set-fee': {
      const pct = parseFloat(body.feePct);
      if (isNaN(pct) || pct < 0 || pct > 100)
        return Response.json({ error: 'Invalid fee percentage' }, { status: 400 });
      await setConfigs({ TRADE_FEE_OVERRIDE: String(pct / 100) });
      return Response.json({ success: true, message: `💸 Fee set to ${pct}%` });
    }

    case 'reset-fee':
      await setConfigs({ TRADE_FEE_OVERRIDE: '' });
      return Response.json({ success: true, message: '✅ Fee reset to default' });

    // ── Student Management ───────────────────────────────────────
    case 'add-student': {
      if (!body.name || !body.email)
        return Response.json({ error: 'Name and email are required' }, { status: 400 });
      const cfg2    = await getAllConfig();
      const seed    = parseFloat(cfg2.SEED_MONEY) || 10000;
      const student = await addStudent({ name: body.name, email: body.email, seedMoney: seed });
      return Response.json({ success: true, message: `✅ ${body.name} added`, student });
    }

    case 'remove-student': {
      if (!body.studentId)
        return Response.json({ error: 'studentId is required' }, { status: 400 });
      await removeStudent(body.studentId);
      return Response.json({ success: true, message: '✅ Student removed' });
    }

    case 'reset-student': {
      if (!body.studentId)
        return Response.json({ error: 'studentId is required' }, { status: 400 });
      const cfg3 = await getAllConfig();
      const seed = parseFloat(cfg3.SEED_MONEY) || 10000;
      await resetStudentPortfolio(body.studentId, seed);
      return Response.json({ success: true, message: '✅ Student portfolio reset' });
    }

    case 'get-students': {
      const students = await getAllStudents();
      return Response.json(students);
    }

    default:
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
