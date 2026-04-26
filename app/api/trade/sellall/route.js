import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { executeSellAll } from '@/lib/trade';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student)
    return Response.json({ error: 'Not a registered student' }, { status: 403 });

  const result = await executeSellAll({ studentId: student.id });

  if (!result.success)
    return Response.json({ error: result.error }, { status: 400 });

  return Response.json(result);
}
