import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail, getPortfolioHistory } from '@/lib/students';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student)
    return Response.json({ error: 'Not a registered student' }, { status: 403 });

  const history = await getPortfolioHistory(student.id);
  return Response.json(history);
}
