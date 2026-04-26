import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchTop100Coins } from '@/lib/prices';
import { db } from '@/lib/db';
const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');
  if (source === 'coingecko') {
    const coins = await fetchTop100Coins();
    return Response.json(coins);
  }
  const classId = searchParams.get('classId');
  if (classId) {
    const { data } = await db.from('class_coins').select('*').eq('class_id', classId).order('symbol');
    return Response.json(data || []);
  }
  return Response.json([]);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) return Response.json({ error: 'Teacher only' }, { status: 403 });
  const { classId, coins } = await request.json();
  if (!classId || !coins?.length) return Response.json({ error: 'classId and coins required' }, { status: 400 });
  const rows = coins.map(c => ({ class_id: classId, symbol: c.symbol, gecko_id: c.geckoId, name: c.name, sector: c.sector || 'Other', active: true }));
  await db.from('class_coins').upsert(rows, { onConflict: 'class_id,symbol' });
  return Response.json({ success: true, message: `${coins.length} coins saved` });
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) return Response.json({ error: 'Teacher only' }, { status: 403 });
  const { classId, symbol } = await request.json();
  await db.from('class_coins').update({ active: false }).eq('class_id', classId).eq('symbol', symbol);
  return Response.json({ success: true });
}
