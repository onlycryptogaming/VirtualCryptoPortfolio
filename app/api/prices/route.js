import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBulkPrices, getAvailableCoins } from '@/lib/prices';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const full = searchParams.get('full') === 'true';

  try {
    const coins  = getAvailableCoins();
    const prices = await getBulkPrices(coins);

    if (full) {
      return Response.json(
        Object.entries(prices).map(([ticker, data], i) => ({
          rank:      i + 1,
          ticker,
          ...data,
        }))
      );
    }

    return Response.json(prices);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
