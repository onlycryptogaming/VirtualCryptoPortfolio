import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail, getStudentPortfolio, getPortfolioHistory } from '@/lib/students';
import { getLivePrice } from '@/lib/prices';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student)
    return Response.json({ error: 'Not a registered student' }, { status: 403 });

  const { portfolio, holdings, trades } = await getStudentPortfolio(student.id);

  // Fetch live prices for all held coins
  const uniqueCoins = [...new Set(holdings.map(h => h.coin))];
  const priceMap = {};
  await Promise.all(
    uniqueCoins.map(async coin => {
      const price = await getLivePrice(coin);
      if (price) priceMap[coin] = price;
    })
  );

  const cash         = parseFloat(portfolio.cash);
  const feesPaid     = parseFloat(portfolio.fees_paid);
  const seedMoney    = 10000;

  const holdingsWithPrices = holdings.map(h => {
    const curPrice = priceMap[h.coin] || parseFloat(h.avg_buy_price);
    const qty      = parseFloat(h.quantity);
    const avgBuy   = parseFloat(h.avg_buy_price);
    const curVal   = qty * curPrice;
    const plPct    = avgBuy > 0 ? ((curPrice / avgBuy) - 1) * 100 : 0;
    return {
      coin:     h.coin,
      qty,
      avgBuy,
      curPrice,
      curVal,
      plPct,
      plTotal:  (curPrice - avgBuy) * qty,
    };
  });

  const holdingsValue = holdingsWithPrices.reduce((s, h) => s + h.curVal, 0);
  const totalValue    = cash + holdingsValue;
  const pl            = totalValue - seedMoney;
  const returnPct     = ((totalValue / seedMoney) - 1) * 100;

  return Response.json({
    summary: {
      startCash:   seedMoney,
      cash:        cash.toFixed(2),
      holdingsVal: holdingsValue.toFixed(2),
      totalVal:    totalValue.toFixed(2),
      pl:          pl.toFixed(2),
      returnPct:   returnPct.toFixed(2),
      fees:        feesPaid.toFixed(2),
    },
    holdings: holdingsWithPrices,
    history:  trades.map(t => ({
      id:         t.id,
      action:     t.action,
      coin:       t.coin,
      quantity:   parseFloat(t.quantity),
      price:      parseFloat(t.price),
      grossValue: parseFloat(t.gross_value),
      fee:        parseFloat(t.fee),
      cashAfter:  parseFloat(t.cash_after),
      reasoning:  t.reasoning,
      createdAt:  t.created_at,
    })),
  });
}
