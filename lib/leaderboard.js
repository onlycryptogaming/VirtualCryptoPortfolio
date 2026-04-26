import { db } from './db';
import { getLivePrice } from './prices';

export async function getLeaderboard(classId) {
  const [studentsRes, portfoliosRes, holdingsRes, tradesRes] = await Promise.all([
    db.from('class_students').select('student_id, students(id, name, is_bot)').eq('class_id', classId),
    db.from('portfolios').select('student_id, cash, fees_paid').eq('class_id', classId),
    db.from('holdings').select('student_id, coin, quantity, avg_buy_price').eq('class_id', classId).gt('quantity', 0),
    db.from('trades').select('student_id, action, coin, quantity, price, gross_value, created_at').eq('class_id', classId),
  ]);

  const students   = (studentsRes.data  || []).map(r => r.students);
  const portfolios = portfoliosRes.data || [];
  const holdings   = holdingsRes.data   || [];
  const trades     = tradesRes.data     || [];

  // Get cached prices from DB
  const uniqueCoins = [...new Set(holdings.map(h => h.coin))];
  const priceMap = {};
  if (uniqueCoins.length > 0) {
    const { data: cached } = await db.from('price_cache').select('symbol, price').in('symbol', uniqueCoins);
    (cached || []).forEach(r => { priceMap[r.symbol] = parseFloat(r.price); });
  }

  const { data: cls } = await db.from('classes').select('seed_money').eq('id', classId).single();
  const seedMoney = parseFloat(cls?.seed_money || 10000);

  const standings = students.map(student => {
    const portfolio = portfolios.find(p => p.student_id === student.id);
    const cash      = parseFloat(portfolio?.cash || 0);
    const feesPaid  = parseFloat(portfolio?.fees_paid || 0);
    const myHoldings = holdings.filter(h => h.student_id === student.id);
    const myTrades   = trades.filter(t => t.student_id === student.id);

    const holdingsValue = myHoldings.reduce((sum, h) => {
      const price = priceMap[h.coin] || parseFloat(h.avg_buy_price);
      return sum + parseFloat(h.quantity) * price;
    }, 0);

    const totalValue = cash + holdingsValue;
    const pl         = totalValue - seedMoney;
    const returnPct  = ((totalValue / seedMoney) - 1) * 100;

    const sells = myTrades.filter(t => t.action === 'SELL');
    const bestTrade = sells.length ? sells.reduce((b, t) => parseFloat(t.gross_value) > parseFloat(b.gross_value) ? t : b, sells[0]) : null;

    return {
      id:         student.id,
      name:       student.name,
      isBot:      student.is_bot,
      total:      totalValue.toFixed(2),
      cash:       cash.toFixed(2),
      holdings:   holdingsValue.toFixed(2),
      pl:         pl.toFixed(2),
      returnPct:  returnPct.toFixed(2),
      fees:       feesPaid.toFixed(2),
      coinCount:  myHoldings.length,
      bestTrade:  bestTrade ? `${bestTrade.coin} $${parseFloat(bestTrade.gross_value).toFixed(0)}` : '—',
    };
  });

  standings.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
  return standings.map((s, i) => ({ ...s, rank: i + 1 }));
}
