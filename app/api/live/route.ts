import { connection, type NextRequest } from 'next/server';
import { getLive } from '@/lib/server';

export async function GET(req: NextRequest) {
  await connection();
  return Response.json(await getLive(req.nextUrl.searchParams.get('id')));
}
