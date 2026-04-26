import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json([]);

  const { data } = await db
    .from('badges')
    .select('badge_id, earned_at')
    .eq('student_id', student.id)
    .order('earned_at');

  return Response.json(data || []);
}
