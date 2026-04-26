import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendInviteEmail } from '@/lib/email';
const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { classId, students } = await request.json();
  if (!classId || !students?.length) return Response.json({ error: 'classId and students required' }, { status: 400 });

  const { data: cls } = await db.from('classes').select('name').eq('id', classId).single();
  if (!cls) return Response.json({ error: 'Class not found' }, { status: 404 });

  const results = { sent: [], failed: [] };

  for (const student of students) {
    try {
      // Create invitation record
      const { data: inv, error } = await db.from('invitations').insert({
        class_id: classId,
        email:    student.email.toLowerCase().trim(),
        name:     student.name,
      }).select().single();

      if (error) throw new Error(error.message);

      // Send email
      await sendInviteEmail({
        to:          student.email,
        name:        student.name,
        className:   cls.name,
        token:       inv.token,
        teacherName: 'Your Teacher',
      });

      results.sent.push(student.email);
    } catch (e) {
      results.failed.push({ email: student.email, error: e.message });
    }
  }

  return Response.json({ success: true, ...results });
}
