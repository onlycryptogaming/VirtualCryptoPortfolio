import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLeaderboard } from '@/lib/leaderboard';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  if (!classId) {
    const { data } = await db.from('classes').select('id').eq('teacher_email', process.env.TEACHER_EMAIL).order('created_at', { ascending: false }).limit(1).single();
    classId = data?.id;
  }
  if (!classId) return Response.json([]);
  const data = await getLeaderboard(classId);
  return Response.json(data);
}
