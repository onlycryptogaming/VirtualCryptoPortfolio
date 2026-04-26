import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { executeTrade } from '@/lib/trade';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student)
    return Response.json({ error: 'Not a registered student' }, { status: 403 });

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }); }

  const { action, coin, amountType, amount, reasoning } = body;

  if (!['BUY', 'SELL'].includes(action))
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  if (!coin)
    return Response.json({ error: 'Coin is required' }, { status: 400 });
  if (!amount || parseFloat(amount) <= 0)
    return Response.json({ error: 'Amount must be greater than 0' }, { status: 400 });

  const result = await executeTrade({
    studentId:  student.id,
    action,
    coin:       coin.toUpperCase(),
    amountType: amountType || 'Dollar Amount',
    amount:     parseFloat(amount),
    reasoning:  reasoning || '',
  });

  if (!result.success)
    return Response.json({ error: result.error }, { status: 400 });

  return Response.json(result);
}
