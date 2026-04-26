-- ============================================================
-- CryptoClassroom — Supabase Schema
-- Paste this entire file into Supabase SQL Editor and run it
-- ============================================================

-- ── Students ─────────────────────────────────────────────────────
create table if not exists students (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  email       text not null unique,
  is_bot      boolean default false,
  created_at  timestamptz default now()
);

-- ── Config (simulation settings + market controls) ───────────────
create table if not exists config (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz default now()
);

-- Seed default config values
insert into config (key, value) values
  ('SEED_MONEY',           '10000'),
  ('TRADE_FEE',            '0.005'),
  ('TRADE_FEE_OVERRIDE',   ''),
  ('MARKET_FREEZE',        '0'),
  ('MARKET_FREEZE_REASON', ''),
  ('MARKET_FREEZE_UNTIL',  ''),
  ('TRADING_HOURS_ON',     '0'),
  ('TRADING_HOURS_START',  '09:00'),
  ('TRADING_HOURS_END',    '15:00'),
  ('DAILY_LIMIT_ON',       '0'),
  ('DAILY_LIMIT_N',        '3'),
  ('BULL_RUN_ACTIVE',      '0'),
  ('BULL_RUN_MULTIPLIER',  '2'),
  ('FLASH_SALE_COIN',      ''),
  ('FLASH_SALE_FACTOR',    '0.8'),
  ('FLASH_SALE_UNTIL',     ''),
  ('MARGIN_ENABLED',       '0'),
  ('MARGIN_MULTIPLIER',    '2'),
  ('SIM_PAUSED',           '0'),
  ('HEADLINE_HISTORY',     '[]')
on conflict (key) do nothing;

-- ── Portfolios (one row per student — cash + fees) ───────────────
create table if not exists portfolios (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  cash        numeric(14,4) not null default 10000,
  fees_paid   numeric(14,4) not null default 0,
  updated_at  timestamptz default now(),
  unique(student_id)
);

-- ── Holdings (one row per student per coin) ──────────────────────
create table if not exists holdings (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references students(id) on delete cascade,
  coin         text not null,
  quantity     numeric(20,8) not null default 0,
  avg_buy_price numeric(20,8) not null default 0,
  updated_at   timestamptz default now(),
  unique(student_id, coin)
);

-- ── Trades (full history) ────────────────────────────────────────
create table if not exists trades (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references students(id) on delete cascade,
  action       text not null check (action in ('BUY','SELL')),
  coin         text not null,
  quantity     numeric(20,8) not null,
  price        numeric(20,8) not null,
  gross_value  numeric(14,4) not null,
  fee          numeric(14,4) not null,
  cash_after   numeric(14,4) not null,
  reasoning    text default '',
  created_at   timestamptz default now()
);

-- ── Portfolio snapshots (for charts) ────────────────────────────
create table if not exists snapshots (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references students(id) on delete cascade,
  total_value  numeric(14,4) not null,
  cash         numeric(14,4) not null,
  snapshot_type text default 'intraday', -- 'intraday' or 'daily'
  created_at   timestamptz default now()
);

-- ── Watchlist alerts ─────────────────────────────────────────────
create table if not exists watchlist (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references students(id) on delete cascade,
  coin         text not null,
  direction    text not null check (direction in ('above','below')),
  target_price numeric(20,8) not null,
  triggered    boolean default false,
  email_alert  boolean default false,
  created_at   timestamptz default now()
);

-- ── Badges ───────────────────────────────────────────────────────
create table if not exists badges (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references students(id) on delete cascade,
  badge_id     text not null,
  earned_at    timestamptz default now(),
  unique(student_id, badge_id)
);

-- ── Indexes for performance ──────────────────────────────────────
create index if not exists idx_holdings_student    on holdings(student_id);
create index if not exists idx_trades_student      on trades(student_id);
create index if not exists idx_trades_created      on trades(created_at);
create index if not exists idx_snapshots_student   on snapshots(student_id);
create index if not exists idx_snapshots_created   on snapshots(created_at);
create index if not exists idx_watchlist_student   on watchlist(student_id);
create index if not exists idx_badges_student      on badges(student_id);
