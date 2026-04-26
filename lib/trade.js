import { db, getMarketStatus } from './db';
import { getLivePrice } from './prices';

function fmtUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

async function checkRestrictions(market, studentId, classId) {
  if (market.frozen) return `🚫 ${market.freezeReason}`;
  if (market.paused) return '⏸ Simulation is paused';
  if (market.tradingHoursOn) {
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });
    if (now < market.tradingHoursStart || now > market.tradingHoursEnd)
      return `⏰ Trading hours are ${market.tradingHoursStart}–${market.tradingHoursEnd} ET.`;
  }
  if (market.dailyLimitOn) {
    const today = new Date(); today.setHours(0,0,0,0);
    const { count } = await db.from('trades').select('*', { count: 'exact', head: true }).eq('student_id', studentId).eq('class_id', classId).gte('created_at', today.toISOString());
    if ((count || 0) >= market.dailyLimitN) return `📵 Daily trade limit reached (${market.dailyLimitN}/day).`;
  }
  return null;
}

export async function executeTrade({ studentId, classId, action, coin, amountType, amount, reasoning = '' }) {
  const market = await getMarketStatus(classId);
  const restricted = await checkRestrictions(market, studentId, classId);
  if (restricted) return { success: false, error: restricted };

  const rawPrice = await getLivePrice(coin);
  if (!rawPrice) return { success: false, error: `❌ Could not fetch price for ${coin}.` };
  const price = market.flashSale?.coin === coin ? rawPrice * market.flashSale.factor : rawPrice;

  const [portfolioRes, holdingRes] = await Promise.all([
    db.from('portfolios').select('cash, fees_paid').eq('student_id', studentId).eq('class_id', classId).single(),
    db.from('holdings').select('*').eq('student_id', studentId).eq('class_id', classId).eq('coin', coin).single(),
  ]);

  const portfolio = portfolioRes.data;
  if (!portfolio) return { success: false, error: 'Portfolio not found.' };
  const cash     = parseFloat(portfolio.cash);
  const feesPaid = parseFloat(portfolio.fees_paid);
  const holding  = holdingRes.data;
  const { feeRate, seedMoney } = market;

  let quantity, grossValue, fee, newCash, newFees;

  if (action === 'BUY') {
    quantity   = amountType === 'Dollar Amount' ? amount / price : amount;
    grossValue = price * quantity;
    fee        = grossValue * feeRate;
    if (grossValue + fee > cash) return { success: false, error: `❌ Not enough cash. Need ${fmtUSD(grossValue + fee)}, have ${fmtUSD(cash)}.` };
    newCash = cash - grossValue - fee;
    newFees = feesPaid + fee;
    if (holding) {
      const newQty = parseFloat(holding.quantity) + quantity;
      const newAvg = ((parseFloat(holding.quantity) * parseFloat(holding.avg_buy_price)) + (quantity * price)) / newQty;
      await db.from('holdings').update({ quantity: newQty, avg_buy_price: newAvg, updated_at: new Date().toISOString() }).eq('student_id', studentId).eq('class_id', classId).eq('coin', coin);
    } else {
      await db.from('holdings').insert({ student_id: studentId, class_id: classId, coin, quantity, avg_buy_price: price });
    }
  } else if (action === 'SELL') {
    if (!holding) return { success: false, error: `❌ You don't own any ${coin}.` };
    quantity = amountType === 'Dollar Amount' ? amount / price : amount;
    if (quantity > parseFloat(holding.quantity) + 0.000001) return { success: false, error: `❌ You only own ${parseFloat(holding.quantity).toFixed(6)} ${coin}.` };
    grossValue = price * quantity;
    fee        = grossValue * feeRate;
    newCash    = cash + grossValue - fee;
    newFees    = feesPaid + fee;
    const remaining = parseFloat(holding.quantity) - quantity;
    if (remaining <= 0.000001) {
      await db.from('holdings').delete().eq('student_id', studentId).eq('class_id', classId).eq('coin', coin);
    } else {
      await db.from('holdings').update({ quantity: remaining, updated_at: new Date().toISOString() }).eq('student_id', studentId).eq('class_id', classId).eq('coin', coin);
    }
  } else {
    return { success: false, error: 'Invalid action' };
  }

  await Promise.all([
    db.from('portfolios').update({ cash: newCash, fees_paid: newFees, updated_at: new Date().toISOString() }).eq('student_id', studentId).eq('class_id', classId),
    db.from('trades').insert({ student_id: studentId, class_id: classId, action, coin, quantity, price, gross_value: grossValue, fee, cash_after: newCash, reasoning }),
    db.from('snapshots').insert({ student_id: studentId, class_id: classId, total_value: newCash, cash: newCash, snapshot_type: 'intraday' }),
  ]);

  return { success: true, message: `✅ ${action} ${quantity.toFixed(6)} ${coin} @ ${fmtUSD(price)}`, price, quantity, fee, newCash };
}

export async function executeSellAll({ studentId, classId }) {
  const market = await getMarketStatus(classId);
  const restricted = await checkRestrictions(market, studentId, classId);
  if (restricted) return { success: false, error: restricted };

  const [portfolioRes, holdingsRes] = await Promise.all([
    db.from('portfolios').select('cash, fees_paid').eq('student_id', studentId).eq('class_id', classId).single(),
    db.from('holdings').select('*').eq('student_id', studentId).eq('class_id', classId).gt('quantity', 0),
  ]);

  const holdings = holdingsRes.data || [];
  if (!holdings.length) return { success: false, error: 'No holdings to sell.' };

  const prices = await Promise.all(holdings.map(h => getLivePrice(h.coin)));
  let runningCash = parseFloat(portfolioRes.data.cash);
  let runningFees = parseFloat(portfolioRes.data.fees_paid);
  const tradeRows = [];

  holdings.forEach((h, i) => {
    const price = prices[i]; if (!price) return;
    const qty = parseFloat(h.quantity), gross = price * qty, fee = gross * market.feeRate;
    runningCash += gross - fee; runningFees += fee;
    tradeRows.push({ student_id: studentId, class_id: classId, action: 'SELL', coin: h.coin, quantity: qty, price, gross_value: gross, fee, cash_after: runningCash, reasoning: '💥 SELL ALL' });
  });

  await Promise.all([
    db.from('portfolios').update({ cash: runningCash, fees_paid: runningFees, updated_at: new Date().toISOString() }).eq('student_id', studentId).eq('class_id', classId),
    db.from('holdings').delete().eq('student_id', studentId).eq('class_id', classId),
    db.from('trades').insert(tradeRows),
    db.from('snapshots').insert({ student_id: studentId, class_id: classId, total_value: runningCash, cash: runningCash, snapshot_type: 'intraday' }),
  ]);

  return { success: true, message: `✅ Sold all ${holdings.length} positions.` };
}
