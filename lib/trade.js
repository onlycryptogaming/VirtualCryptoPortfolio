import { db, getMarketStatus } from './db';
import { getLivePrice } from './prices';

function fmtUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// ── Check all trading restrictions ───────────────────────────────
async function checkRestrictions(market, studentId) {
  if (market.frozen) return `🚫 ${market.freezeReason}`;
  if (market.paused) return '⏸ Simulation is paused — trading suspended';

  if (market.tradingHoursOn) {
    const now = new Date().toLocaleTimeString('en-US', {
      hour12:   false,
      timeZone: 'America/New_York',
      hour:     '2-digit',
      minute:   '2-digit',
    });
    if (now < market.tradingHoursStart || now > market.tradingHoursEnd) {
      return `⏰ Trading hours are ${market.tradingHoursStart}–${market.tradingHoursEnd} ET. Market is closed.`;
    }
  }

  if (market.dailyLimitOn) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await db
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('created_at', today.toISOString());
    if ((count || 0) >= market.dailyLimitN) {
      return `📵 Daily trade limit reached (${market.dailyLimitN} trades/day).`;
    }
  }

  return null;
}

// ════════════════════════════════════════════════════════════════
// MAIN TRADE EXECUTION ENGINE
// ════════════════════════════════════════════════════════════════
export async function executeTrade({
  studentId, action, coin, amountType, amount, reasoning = '',
}) {
  const market = await getMarketStatus();

  // 1. Check restrictions
  const restricted = await checkRestrictions(market, studentId);
  if (restricted) return { success: false, error: restricted };

  // 2. Fetch live price
  const rawPrice = await getLivePrice(coin);
  if (!rawPrice) {
    return { success: false, error: `❌ Could not fetch live price for ${coin}. Try again.` };
  }

  // Apply flash sale discount if active
  const price = (market.flashSale?.coin === coin)
    ? rawPrice * market.flashSale.factor
    : rawPrice;

  // 3. Read student portfolio + holdings
  const [portfolioRes, holdingRes] = await Promise.all([
    db.from('portfolios').select('cash, fees_paid').eq('student_id', studentId).single(),
    db.from('holdings').select('*').eq('student_id', studentId).eq('coin', coin).single(),
  ]);

  const portfolio = portfolioRes.data;
  if (!portfolio) return { success: false, error: 'Portfolio not found.' };

  const cash     = parseFloat(portfolio.cash);
  const feesPaid = parseFloat(portfolio.fees_paid);
  const holding  = holdingRes.data;

  const { feeRate, seedMoney } = market;
  let quantity, grossValue, fee, newCash, newFees;

  // 4. Calculate trade
  if (action === 'BUY') {
    quantity   = amountType === 'Dollar Amount' ? amount / price : amount;
    grossValue = price * quantity;
    fee        = grossValue * feeRate;
    const totalCost = grossValue + fee;

    if (totalCost > cash) {
      return {
        success: false,
        error: `❌ Not enough cash. Need ${fmtUSD(totalCost)}, have ${fmtUSD(cash)}.`,
      };
    }

    newCash  = cash - totalCost;
    newFees  = feesPaid + fee;

    // Upsert holding — update avg buy price if coin already held
    if (holding) {
      const oldQty = parseFloat(holding.quantity);
      const oldAvg = parseFloat(holding.avg_buy_price);
      const newQty = oldQty + quantity;
      const newAvg = ((oldQty * oldAvg) + (quantity * price)) / newQty;
      await db.from('holdings').update({
        quantity:       newQty,
        avg_buy_price:  newAvg,
        updated_at:     new Date().toISOString(),
      }).eq('student_id', studentId).eq('coin', coin);
    } else {
      await db.from('holdings').insert({
        student_id:    studentId,
        coin,
        quantity,
        avg_buy_price: price,
      });
    }

  } else if (action === 'SELL') {
    if (!holding) return { success: false, error: `❌ You don't own any ${coin}.` };

    quantity = amountType === 'Dollar Amount' ? amount / price : amount;
    const ownedQty = parseFloat(holding.quantity);

    if (quantity > ownedQty + 0.000001) {
      return {
        success: false,
        error: `❌ You only own ${ownedQty.toFixed(6)} ${coin}.`,
      };
    }

    grossValue     = price * quantity;
    fee            = grossValue * feeRate;
    const proceeds = grossValue - fee;
    newCash        = cash + proceeds;
    newFees        = feesPaid + fee;

    const remaining = ownedQty - quantity;
    if (remaining <= 0.000001) {
      await db.from('holdings').delete().eq('student_id', studentId).eq('coin', coin);
    } else {
      await db.from('holdings').update({
        quantity:   remaining,
        updated_at: new Date().toISOString(),
      }).eq('student_id', studentId).eq('coin', coin);
    }

  } else {
    return { success: false, error: 'Invalid action — must be BUY or SELL' };
  }

  // 5. Update portfolio cash + fees
  await db.from('portfolios').update({
    cash:       newCash,
    fees_paid:  newFees,
    updated_at: new Date().toISOString(),
  }).eq('student_id', studentId);

  // 6. Record trade in history
  await db.from('trades').insert({
    student_id:  studentId,
    action,
    coin,
    quantity,
    price,
    gross_value: grossValue,
    fee,
    cash_after:  newCash,
    reasoning,
  });

  // 7. Save intraday snapshot
  const allHoldings = await db
    .from('holdings')
    .select('quantity, avg_buy_price')
    .eq('student_id', studentId)
    .gt('quantity', 0);

  // We don't have current prices for all coins here so use avg_buy as proxy
  // The actual snapshot value gets updated by the price refresh job
  const holdingsValue = (allHoldings.data || []).reduce((sum, h) =>
    sum + parseFloat(h.quantity) * parseFloat(h.avg_buy_price), 0);
  const totalValue = newCash + holdingsValue;

  await db.from('snapshots').insert({
    student_id:    studentId,
    total_value:   totalValue,
    cash:          newCash,
    snapshot_type: 'intraday',
  });

  return {
    success:  true,
    message:  `✅ ${action} ${quantity.toFixed(6)} ${coin} @ ${fmtUSD(price)}`,
    price,
    quantity,
    fee,
    newCash,
    totalValue,
  };
}

// ════════════════════════════════════════════════════════════════
// SELL ALL HOLDINGS
// ════════════════════════════════════════════════════════════════
export async function executeSellAll({ studentId }) {
  const market = await getMarketStatus();

  const restricted = await checkRestrictions(market, studentId);
  if (restricted) return { success: false, error: restricted };

  const [portfolioRes, holdingsRes] = await Promise.all([
    db.from('portfolios').select('cash, fees_paid').eq('student_id', studentId).single(),
    db.from('holdings').select('*').eq('student_id', studentId).gt('quantity', 0),
  ]);

  const portfolio = portfolioRes.data;
  const holdings  = holdingsRes.data || [];

  if (!holdings.length) return { success: false, error: 'No holdings to sell.' };

  // Fetch all prices in parallel
  const prices = await Promise.all(holdings.map(h => getLivePrice(h.coin)));

  let runningCash = parseFloat(portfolio.cash);
  let runningFees = parseFloat(portfolio.fees_paid);
  const tradeRows = [];

  holdings.forEach((h, i) => {
    const price = prices[i];
    if (!price) return;
    const qty      = parseFloat(h.quantity);
    const gross    = price * qty;
    const fee      = gross * market.feeRate;
    const proceeds = gross - fee;
    runningCash   += proceeds;
    runningFees   += fee;
    tradeRows.push({
      student_id:  studentId,
      action:      'SELL',
      coin:        h.coin,
      quantity:    qty,
      price,
      gross_value: gross,
      fee,
      cash_after:  runningCash,
      reasoning:   '💥 SELL ALL',
    });
  });

  // Write everything in parallel
  await Promise.all([
    db.from('portfolios').update({
      cash:       runningCash,
      fees_paid:  runningFees,
      updated_at: new Date().toISOString(),
    }).eq('student_id', studentId),
    db.from('holdings').delete().eq('student_id', studentId),
    db.from('trades').insert(tradeRows),
    db.from('snapshots').insert({
      student_id:    studentId,
      total_value:   runningCash,
      cash:          runningCash,
      snapshot_type: 'intraday',
    }),
  ]);

  return {
    success: true,
    message: `✅ Sold all ${holdings.length} position${holdings.length !== 1 ? 's' : ''}.`,
  };
}
