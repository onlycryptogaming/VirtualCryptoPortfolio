const COINGECKO_KEY  = process.env.COINGECKO_API_KEY;
const FREECRYPTO_KEY = process.env.FREECRYPTO_API_KEY;

// ── Fetch live price for a single coin (used at trade execution) ─
export async function getLivePrice(symbol) {
  // Pass 1: CoinGecko
  try {
    const geckoId = symbolToGeckoId(symbol);
    if (geckoId) {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`;
      const res = await fetch(url, {
        headers: COINGECKO_KEY ? { 'x-cg-demo-api-key': COINGECKO_KEY } : {},
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json[geckoId]?.usd) return parseFloat(json[geckoId].usd);
      }
    }
  } catch {}

  // Pass 2: FreeCrypto fallback
  try {
    if (FREECRYPTO_KEY) {
      const url = `https://api.freecryptoapi.com/v1/getData?symbol=${symbol}&token=${FREECRYPTO_KEY}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.symbols?.[0]?.last) {
          return parseFloat(json.symbols[0].last);
        }
      }
    }
  } catch {}

  return null;
}

// ── Fetch prices for multiple coins at once (price page) ─────────
export async function getBulkPrices(symbols) {
  const priceMap = {};
  const geckoIds = symbols
    .map(s => ({ sym: s, id: symbolToGeckoId(s) }))
    .filter(x => x.id);
  const ids = geckoIds.map(x => x.id).join(',');

  try {
    const url =
      `https://api.coingecko.com/api/v3/coins/markets` +
      `?vs_currency=usd&ids=${ids}&order=market_cap_desc` +
      `&price_change_percentage=1h,24h,7d&sparkline=false`;
    const res = await fetch(url, {
      headers: COINGECKO_KEY ? { 'x-cg-demo-api-key': COINGECKO_KEY } : {},
      next: { revalidate: 1800 },
    });
    if (res.ok) {
      const json = await res.json();
      geckoIds.forEach(({ sym, id }) => {
        const coin = json.find(c => c.id === id);
        if (coin) {
          priceMap[sym] = {
            price:     String(coin.current_price),
            change1h:  String(coin.price_change_percentage_1h_in_currency?.toFixed(2) || '0'),
            change24h: String(coin.price_change_percentage_24h_in_currency?.toFixed(2) || '0'),
            change7d:  String(coin.price_change_percentage_7d_in_currency?.toFixed(2) || '0'),
            marketCap: String(coin.market_cap || '0'),
          };
        }
      });
    }
  } catch {}

  return priceMap;
}

// ── Symbol → CoinGecko ID map ─────────────────────────────────────
export const GECKO_ID_MAP = {
  BTC:    'bitcoin',
  ETH:    'ethereum',
  SOL:    'solana',
  ADA:    'cardano',
  AVAX:   'avalanche-2',
  DOT:    'polkadot',
  ATOM:   'cosmos',
  NEAR:   'near',
  ALGO:   'algorand',
  XRP:    'ripple',
  LTC:    'litecoin',
  BCH:    'bitcoin-cash',
  XLM:    'stellar',
  HBAR:   'hedera-hashgraph',
  ICP:    'internet-computer',
  FIL:    'filecoin',
  TON:    'the-open-network',
  TRX:    'tron',
  VET:    'vechain',
  EOS:    'eos',
  XTZ:    'tezos',
  MATIC:  'matic-network',
  ARB:    'arbitrum',
  OP:     'optimism',
  IMX:    'immutable-x',
  STX:    'blockstack',
  DOGE:   'dogecoin',
  SHIB:   'shiba-inu',
  PEPE:   'pepe',
  BONK:   'bonk',
  FLOKI:  'floki',
  WIF:    'dogwifcoin',
  USDT:   'tether',
  USDC:   'usd-coin',
  DAI:    'dai',
  UNI:    'uniswap',
  AAVE:   'aave',
  MKR:    'maker',
  CRV:    'curve-dao-token',
  LINK:   'chainlink',
  GRT:    'the-graph',
  RNDR:   'render-token',
  FET:    'fetch-ai',
  WLD:    'worldcoin-wld',
  TAO:    'bittensor',
  SAND:   'the-sandbox',
  MANA:   'decentraland',
  AXS:    'axie-infinity',
  BNB:    'binancecoin',
  OKB:    'okb',
  APT:    'aptos',
  SUI:    'sui',
  SEI:    'sei-network',
  TIA:    'celestia',
  INJ:    'injective-protocol',
  EGLD:   'elrond-erd-2',
  FTM:    'fantom',
  THETA:  'theta-token',
  KAVA:   'kava',
};

export function symbolToGeckoId(symbol) {
  return GECKO_ID_MAP[symbol?.toUpperCase()] || null;
}

export function getAvailableCoins() {
  return Object.keys(GECKO_ID_MAP);
}
