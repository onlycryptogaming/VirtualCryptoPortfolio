import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { executeSellAll } from '@/lib/trade';
import { db } from '@/lib/db';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Not registered' }, { status: 403 });

  let classId;
  try { const body = await request.json(); classId = body.classId; } catch {}
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id').eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json({ error: 'No class found' }, { status: 404 });

  const result = await executeSellAll({ studentId: student.id, classId });
  if (!result.success) return Response.json({ error: result.error }, { status: 400 });
  return Response.json(result);
}
