import type { APIRoute } from 'astro';

const CONVEX_URL = 'https://shiny-butterfly-744.convex.cloud';

export const GET: APIRoute = async ({ url }) => {
  const itemIds = (url.searchParams.get('ids') ?? '')
    .split(',')
    .map((itemId) => itemId.trim())
    .filter(Boolean);

  if (!itemIds.length) {
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: 'library:getCounts',
      args: { itemIds },
      format: 'json',
    }),
  });

  const data = await res.json();

  return new Response(JSON.stringify(data.value ?? {}), {
    status: res.ok ? 200 : res.status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const { itemId } = await request.json();

  if (!itemId) {
    return new Response('missing itemId', { status: 400 });
  }

  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: 'library:increment',
      args: { itemId },
      format: 'json',
    }),
  });

  const data = await res.json();

  return new Response(JSON.stringify({ count: data.value ?? 0 }), {
    status: res.ok ? 200 : res.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
