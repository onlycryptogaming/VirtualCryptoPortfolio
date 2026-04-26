import { db } from './db';
import { getLivePrice } from './prices';

// ── Compute full leaderboard standings ───────────────────────────
export async function getLeaderboard() {
  const [studentsRes, portfoliosRes, holdingsRes, tradesRes] = await Promise.all([
    db.from('students').select('id, name, is_bot'),
    db.from('portfolios').select('student_id, cash, fees_paid'),
    db.from('holdings').select('student_id, coin, quantity, avg_buy_price').gt('quantity', 0),
    db.from('trades').select('student_id, action, coin, quantity, price, gross_value, created_at'),
  ]);

  const students   = studentsRes.data   || [];
  const portfolios = portfoliosRes.data || [];
  const holdings   = holdingsRes.data   || [];
  const trades     = tradesRes.data     || [];

  // Get unique coins held across all students for bulk price fetch
  const uniqueCoins = [...new Set(holdings.map(h => h.coin))];
  const priceMap = {};
  await Promise.all(
    uniqueCoins.map(async coin => {
      const price = await getLivePrice(coin);
      if (price) priceMap[coin] = price;
    })
  );

  // Build standings
  const standings = students.map(student => {
    const portfolio    = portfolios.find(p => p.student_id === student.id);
    const cash         = parseFloat(portfolio?.cash || 0);
    const feesPaid     = parseFloat(portfolio?.fees_paid || 0);
    const studentHoldings = holdings.filter(h => h.student_id === student.id);
    const studentTrades   = trades.filter(t => t.student_id === student.id);

    // Compute holdings value using live prices
    const holdingsValue = studentHoldings.reduce((sum, h) => {
      const price = priceMap[h.coin] || parseFloat(h.avg_buy_price);
      return sum + parseFloat(h.quantity) * price;
    }, 0);

    const totalValue = cash + holdingsValue;
    const seedMoney  = 10000; // pulled from config ideally but fine as default
    const pl         = totalValue - seedMoney;
    const returnPct  = ((totalValue / seedMoney) - 1) * 100;

    // Best sell trade
    const sells = studentTrades.filter(t => t.action === 'SELL');
    const bestTrade = sells.length
      ? sells.reduce((best, t) =>
          parseFloat(t.gross_value) > parseFloat(best.gross_value) ? t : best
        , sells[0])
      : null;

    // Win streak
    const streak = computeStreak(studentTrades, studentHoldings);

    return {
      id:          student.id,
      name:        student.name,
      isBot:       student.is_bot,
      total:       totalValue.toFixed(2),
      cash:        cash.toFixed(2),
      holdings:    holdingsValue.toFixed(2),
      pl:          pl.toFixed(2),
      returnPct:   returnPct.toFixed(2),
      fees:        feesPaid.toFixed(2),
      coinCount:   studentHoldings.length,
      bestTrade:   bestTrade ? `${bestTrade.coin} $${parseFloat(bestTrade.gross_value).toFixed(0)}` : '—',
      streak:      streak.current,
      streakType:  streak.type,
      bestStreak:  streak.best,
    };
  });

  // Sort by total value descending
  standings.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));

  return standings.map((s, i) => ({
    ...s,
    rank: i + 1,
  }));
}

// ── Compute win/loss streak from trade history ───────────────────
function computeStreak(trades, holdings) {
  const sells = trades.filter(t => t.action === 'SELL');
  if (!sells.length) return { current: 0, type: 'none', best: 0 };

  // Build cost basis map
  const costBasis = {};
  const sorted = [...trades].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const outcomes = [];
  sorted.forEach(t => {
    if (t.action === 'BUY') {
      if (!costBasis[t.coin]) costBasis[t.coin] = { qty: 0, cost: 0 };
      const qty = parseFloat(t.quantity);
      const price = parseFloat(t.price);
      costBasis[t.coin].qty  += qty;
      costBasis[t.coin].cost += qty * price;
    } else if (t.action === 'SELL' && costBasis[t.coin]) {
      const avgBuy   = costBasis[t.coin].cost / costBasis[t.coin].qty;
      const sellPrice = parseFloat(t.price);
      outcomes.push((sellPrice - avgBuy) * parseFloat(t.quantity));
      costBasis[t.coin].qty -= parseFloat(t.quantity);
      if (costBasis[t.coin].qty <= 0) delete costBasis[t.coin];
    }
  });

  if (!outcomes.length) return { current: 0, type: 'none', best: 0 };

  const lastPositive = outcomes[outcomes.length - 1] >= 0;
  let current = 1;
  for (let i = outcomes.length - 2; i >= 0; i--) {
    if ((outcomes[i] >= 0) === lastPositive) current++;
    else break;
  }

  let best = 0, run = 0;
  outcomes.forEach(p => {
    if (p >= 0) { run++; best = Math.max(best, run); }
    else run = 0;
  });

  return { current, type: lastPositive ? 'win' : 'loss', best };
}
