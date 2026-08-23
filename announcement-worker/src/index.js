async function checkPosters(env) {
  if (
    !env.POSTER_CHECK_URL ||
    !env.POSTER_CHECK_KEY
  ) {
    throw new Error(
      'Poster checker configuration is incomplete.'
    );
  }

  const response = await fetch(
    env.POSTER_CHECK_URL,
    {
      method: 'POST',
      headers: {
        'X-Poster-Check-Key':
          env.POSTER_CHECK_KEY
      }
    }
  );

  const result = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    console.error(
      'Poster check failed:',
      result
    );

    throw new Error(
      result.error ||
      `Poster check returned HTTP ${response.status}.`
    );
  }

  console.log(
    'Poster check completed:',
    JSON.stringify(result)
  );

  return result;
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      checkPosters(env)
    );
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== '/') {
      return new Response(
        'Not found',
        {
          status: 404
        }
      );
    }

    return Response.json({
      service:
        'Khanqah announcement checker',
      status: 'running'
    });
  }
};