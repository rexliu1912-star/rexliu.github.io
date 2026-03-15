import type { APIRoute } from 'astro';

const CONVEX_URL = 'https://shiny-butterfly-744.convex.cloud';

type ConvexResult = {
  value?: number;
};

async function callConvex(kind: 'query' | 'mutation', path: string) {
  const response = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path,
      args: {},
      format: 'json',
    }),
  });

  if (!response.ok) {
    throw new Error(`Convex ${kind} failed with status ${response.status}`);
  }

  const data = (await response.json()) as ConvexResult;
  return data.value ?? 0;
}

export const GET: APIRoute = async () => {
  try {
    const count = await callConvex('query', 'nudge:getNudgeCount');
    return new Response(JSON.stringify({ count }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch nudge count', error);
    return new Response(JSON.stringify({ count: 0, error: 'failed_to_fetch_nudge_count' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async () => {
  try {
    const count = await callConvex('mutation', 'nudge:incrementNudge');
    return new Response(JSON.stringify({ count }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to increment nudge count', error);
    return new Response(JSON.stringify({ error: 'failed_to_increment_nudge_count' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
