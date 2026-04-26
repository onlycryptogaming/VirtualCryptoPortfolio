import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail, getStudentClasses } from '@/lib/students';
const TEACHER_EMAIL = process.env.TEACHER_EMAIL;
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const email     = session.user.email.toLowerCase();
  const isTeacher = email === TEACHER_EMAIL?.toLowerCase();
  const student   = await getStudentByEmail(email);
  const classes   = student ? await getStudentClasses(student.id) : [];
  return Response.json({ email, name: student?.name || session.user.name, isTeacher, studentId: student?.id || null, classes });
}
