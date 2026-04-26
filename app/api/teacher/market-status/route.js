import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMarketStatus } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session)
    return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const status = await getMarketStatus();
  return Response.json(status);
}
