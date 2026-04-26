import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLeaderboard } from '@/lib/leaderboard';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session)
    return Response.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const data = await getLeaderboard();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
