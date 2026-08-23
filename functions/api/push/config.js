export function onRequestGet(context) {
  const publicKey =
    context.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return Response.json(
      {
        error: 'Push notifications are unavailable.'
      },
      {
        status: 500
      }
    );
  }

  return Response.json(
    {
      publicKey
    },
    {
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  );
}