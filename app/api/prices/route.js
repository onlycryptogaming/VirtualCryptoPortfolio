import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');

  let symbols = [];
  if (classId) {
    const { data } = await db.from('class_coins').select('symbol').eq('class_id', classId).eq('active', true);
    symbols = (data || []).map(r => r.symbol);
  }

  const query = symbols.length > 0
    ? db.from('price_cache').select('*').in('symbol', symbols)
    : db.from('price_cache').select('*');

  const { data } = await query.order('symbol');
  const priceMap = {};
  (data || []).forEach(r => {
    priceMap[r.symbol] = { price: String(r.price), change1h: String(r.change_1h || 0), change24h: String(r.change_24h || 0), change7d: String(r.change_7d || 0) };
  });
  return Response.json(priceMap);
}
