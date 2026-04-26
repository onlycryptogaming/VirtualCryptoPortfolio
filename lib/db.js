import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

// Service role client — bypasses RLS, server-side only
export const db = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// ── Config helpers ────────────────────────────────────────────────

const CONFIG_DEFAULTS = {
  SEED_MONEY:           '10000',
  TRADE_FEE:            '0.005',
  TRADE_FEE_OVERRIDE:   '',
  MARKET_FREEZE:        '0',
  MARKET_FREEZE_REASON: '',
  MARKET_FREEZE_UNTIL:  '',
  TRADING_HOURS_ON:     '0',
  TRADING_HOURS_START:  '09:00',
  TRADING_HOURS_END:    '15:00',
  DAILY_LIMIT_ON:       '0',
  DAILY_LIMIT_N:        '3',
  BULL_RUN_ACTIVE:      '0',
  BULL_RUN_MULTIPLIER:  '2',
  FLASH_SALE_COIN:      '',
  FLASH_SALE_FACTOR:    '0.8',
  FLASH_SALE_UNTIL:     '',
  MARGIN_ENABLED:       '0',
  MARGIN_MULTIPLIER:    '2',
  SIM_PAUSED:           '0',
  HEADLINE_HISTORY:     '[]',
};

export async function getAllConfig() {
  const { data } = await db.from('config').select('key, value');
  const map = { ...CONFIG_DEFAULTS };
  (data || []).forEach(r => { map[r.key] = r.value; });
  return map;
}

export async function getConfig(key) {
  const { data } = await db.from('config').select('value').eq('key', key).single();
  return data?.value ?? CONFIG_DEFAULTS[key] ?? null;
}

export async function setConfig(key, value) {
  await db.from('config').upsert({ key, value: String(value), updated_at: new Date().toISOString() });
}

export async function setConfigs(updates) {
  const rows = Object.entries(updates).map(([key, value]) => ({
    key,
    value: String(value),
    updated_at: new Date().toISOString(),
  }));
  await db.from('config').upsert(rows);
}

export async function getMarketStatus() {
  const cfg = await getAllConfig();

  // Auto-expire flash sale
  if (cfg.FLASH_SALE_COIN && cfg.FLASH_SALE_UNTIL && new Date() > new Date(cfg.FLASH_SALE_UNTIL)) {
    await setConfigs({ FLASH_SALE_COIN: '', FLASH_SALE_FACTOR: '', FLASH_SALE_UNTIL: '' });
    cfg.FLASH_SALE_COIN = '';
  }

  // Auto-expire market freeze
  if (cfg.MARKET_FREEZE === '1' && cfg.MARKET_FREEZE_UNTIL && new Date() > new Date(cfg.MARKET_FREEZE_UNTIL)) {
    await setConfigs({ MARKET_FREEZE: '0', MARKET_FREEZE_UNTIL: '', MARKET_FREEZE_REASON: '' });
    cfg.MARKET_FREEZE = '0';
  }

  return {
    frozen:            cfg.MARKET_FREEZE === '1',
    freezeReason:      cfg.MARKET_FREEZE_REASON || 'Market temporarily closed',
    paused:            cfg.SIM_PAUSED === '1',
    tradingHoursOn:    cfg.TRADING_HOURS_ON === '1',
    tradingHoursStart: cfg.TRADING_HOURS_START,
    tradingHoursEnd:   cfg.TRADING_HOURS_END,
    dailyLimitOn:      cfg.DAILY_LIMIT_ON === '1',
    dailyLimitN:       parseInt(cfg.DAILY_LIMIT_N) || 3,
    feeRate:           cfg.TRADE_FEE_OVERRIDE
                         ? parseFloat(cfg.TRADE_FEE_OVERRIDE)
                         : parseFloat(cfg.TRADE_FEE),
    seedMoney:         parseFloat(cfg.SEED_MONEY) || 10000,
    bullRun:           cfg.BULL_RUN_ACTIVE === '1',
    bullMult:          parseFloat(cfg.BULL_RUN_MULTIPLIER) || 2,
    flashSale:         cfg.FLASH_SALE_COIN
                         ? {
                             coin:   cfg.FLASH_SALE_COIN,
                             factor: parseFloat(cfg.FLASH_SALE_FACTOR) || 0.8,
                             until:  cfg.FLASH_SALE_UNTIL,
                           }
                         : null,
    marginEnabled:     cfg.MARGIN_ENABLED === '1',
    marginMult:        parseInt(cfg.MARGIN_MULTIPLIER) || 2,
    headlines:         JSON.parse(cfg.HEADLINE_HISTORY || '[]'),
  };
}
