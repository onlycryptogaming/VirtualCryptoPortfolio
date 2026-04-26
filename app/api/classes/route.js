import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const { data } = await db.from('classes').select('*').eq('teacher_email', TEACHER_EMAIL).order('created_at', { ascending: false });
  return Response.json(data || []);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) return Response.json({ error: 'Teacher only' }, { status: 403 });
  const body = await request.json();
  const { data, error } = await db.from('classes').insert({
    name:          body.name,
    semester:      body.semester || '',
    teacher_email: TEACHER_EMAIL,
    seed_money:    body.seedMoney || 10000,
    trade_fee:     body.tradeFee || 0.005,
  }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
