import webpush from 'web-push';

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

function clean(value, maxLength = 200) {
  return String(value || '')
    .trim()
    .slice(0, maxLength);
}

async function removeSubscription(env, subscriptionId) {
  await env.DB
    .prepare(`
      DELETE FROM notification_preferences
      WHERE subscription_id = ?
    `)
    .bind(subscriptionId)
    .run();

  await env.DB
    .prepare(`
      DELETE FROM push_subscriptions
      WHERE id = ?
    `)
    .bind(subscriptionId)
    .run();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const adminKey = request.headers.get('X-Admin-Key');

  if (
    !env.PUSH_ADMIN_KEY ||
    adminKey !== env.PUSH_ADMIN_KEY
  ) {
    return json({
      error: 'Unauthorized.'
    }, 401);
  }

  if (
    !env.DB ||
    !env.VAPID_PUBLIC_KEY ||
    !env.VAPID_PRIVATE_KEY ||
    !env.VAPID_SUBJECT
  ) {
    return json({
      error: 'Push configuration is incomplete.',
      missing: {
        DB: !env.DB,
        VAPID_PUBLIC_KEY: !env.VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY: !env.VAPID_PRIVATE_KEY,
        VAPID_SUBJECT: !env.VAPID_SUBJECT
      }
    }, 500);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      error: 'Invalid request.'
    }, 400);
  }

  const khanqahId = clean(body.khanqahId, 100);
  const location = clean(body.location, 100);
  const prayer = clean(body.prayer, 50);
  const dateText = clean(body.dateText, 100);
  const time = clean(body.time, 50);

  if (
    !khanqahId ||
    !location ||
    !prayer ||
    !dateText ||
    !time
  ) {
    return json({
      error: 'Please complete all fields.'
    }, 400);
  }

  const allowedPrayers = [
    'Fajr',
    'Dhuhr',
    'Asr',
    'Maghrib',
    'Isha',
    'Jumuah',
    'Eid'
  ];

  if (!allowedPrayers.includes(prayer)) {
    return json({
      error: 'Invalid prayer.'
    }, 400);
  }

  const subscriptions = await env.DB
    .prepare(`
      SELECT
        s.id,
        s.endpoint,
        s.p256dh,
        s.auth
      FROM push_subscriptions s
      INNER JOIN notification_preferences p
        ON p.subscription_id = s.id
      WHERE p.khanqah_id = ?
        AND p.prayer_changes = 1
    `)
    .bind(khanqahId)
    .all();

  const rows = subscriptions.results || [];

  if (rows.length === 0) {
    const subscriptionCount = await env.DB
      .prepare(`
        SELECT COUNT(*) AS count
        FROM push_subscriptions
      `)
      .first();

    const preferenceCount = await env.DB
      .prepare(`
        SELECT COUNT(*) AS count
        FROM notification_preferences
      `)
      .first();

    const matchingPreferences = await env.DB
      .prepare(`
        SELECT
          subscription_id,
          khanqah_id,
          announcements,
          prayer_changes
        FROM notification_preferences
        WHERE khanqah_id = ?
      `)
      .bind(khanqahId)
      .all();

    return json({
      success: true,
      sent: 0,
      debug: {
        receivedKhanqahId: khanqahId,
        subscriptionCount: subscriptionCount?.count ?? null,
        preferenceCount: preferenceCount?.count ?? null,
        matchingPreferences: matchingPreferences.results || []
      },
      message: 'No matching prayer-change subscribers were found.'
    });
  }

  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );

  const title = `${location} Khanqah — ${prayer} Time Change`;
  const notificationBody = `${dateText}'s ${prayer} Jamat will be at ${time}.`;

  const payload = JSON.stringify({
    title,
    body: notificationBody,
    url: '/',
    tag: `prayer-${khanqahId}-${prayer.toLowerCase()}`
  });

  let sent = 0;
  let removed = 0;
  let failed = 0;

  for (const row of rows) {
    const subscription = {
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth
      }
    };

    try {
      await webpush.sendNotification(
        subscription,
        payload,
        {
          TTL: 86400,
          urgency: 'high'
        }
      );

      sent += 1;
    } catch (error) {
      const statusCode = error?.statusCode;

      if (
        statusCode === 404 ||
        statusCode === 410
      ) {
        await removeSubscription(
          env,
          row.id
        );

        removed += 1;
      } else {
        failed += 1;

        console.error(
          'Unable to send push notification:',
          error
        );
      }
    }
  }

  await env.DB
    .prepare(`
      INSERT INTO notification_log (
        type,
        khanqah_id,
        title,
        body,
        sent_count
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(
      'prayer_change',
      khanqahId,
      title,
      notificationBody,
      sent
    )
    .run();

  return json({
    success: true,
    sent,
    failed,
    removed
  });
}