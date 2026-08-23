const encoder = new TextEncoder();

function base64UrlToBytes(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);

  const base64 = (value + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const binary = atob(base64);

  return Uint8Array.from(
    binary,
    character => character.charCodeAt(0)
  );
}

function bytesToBase64Url(bytes) {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function concatBytes(...arrays) {
  const length = arrays.reduce(
    (total, array) => total + array.length,
    0
  );

  const result = new Uint8Array(length);

  let offset = 0;

  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }

  return result;
}

async function hmac(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    {
      name: 'HMAC',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    dataBytes
  );

  return new Uint8Array(signature);
}

async function hkdfExtract(salt, inputKeyMaterial) {
  return hmac(
    salt,
    inputKeyMaterial
  );
}

async function hkdfExpand(
  pseudoRandomKey,
  info,
  length
) {
  const result = [];
  let previous = new Uint8Array(0);
  let counter = 1;
  let generated = 0;

  while (generated < length) {
    const input = concatBytes(
      previous,
      info,
      new Uint8Array([counter])
    );

    previous = await hmac(
      pseudoRandomKey,
      input
    );

    result.push(previous);
    generated += previous.length;
    counter += 1;
  }

  return concatBytes(...result)
    .slice(0, length);
}

function getVapidJwk(publicKey, privateKey) {
  const publicBytes = base64UrlToBytes(publicKey);
  const privateBytes = base64UrlToBytes(privateKey);

  if (
    publicBytes.length !== 65 ||
    publicBytes[0] !== 4
  ) {
    throw new Error(
      'Invalid VAPID public key.'
    );
  }

  if (privateBytes.length !== 32) {
    throw new Error(
      'Invalid VAPID private key.'
    );
  }

  return {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToBase64Url(
      publicBytes.slice(1, 33)
    ),
    y: bytesToBase64Url(
      publicBytes.slice(33, 65)
    ),
    d: bytesToBase64Url(
      privateBytes
    ),
    ext: true
  };
}

async function createVapidJwt({
  endpoint,
  publicKey,
  privateKey,
  subject
}) {
  const audience =
    new URL(endpoint).origin;

  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const payload = {
    aud: audience,
    exp: Math.floor(
      Date.now() / 1000
    ) + (12 * 60 * 60),
    sub: subject
  };

  const encodedHeader =
    bytesToBase64Url(
      encoder.encode(
        JSON.stringify(header)
      )
    );

  const encodedPayload =
    bytesToBase64Url(
      encoder.encode(
        JSON.stringify(payload)
      )
    );

  const unsignedToken =
    `${encodedHeader}.${encodedPayload}`;

  const signingKey =
    await crypto.subtle.importKey(
      'jwk',
      getVapidJwk(
        publicKey,
        privateKey
      ),
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      false,
      ['sign']
    );

  const signature =
    await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-256'
      },
      signingKey,
      encoder.encode(
        unsignedToken
      )
    );

  const encodedSignature =
    bytesToBase64Url(
      new Uint8Array(signature)
    );

  return `${unsignedToken}.${encodedSignature}`;
}

async function encryptPayload(
  subscription,
  payload
) {
  const userPublicKey =
    base64UrlToBytes(
      subscription.keys.p256dh
    );

  const authSecret =
    base64UrlToBytes(
      subscription.keys.auth
    );

  if (
    userPublicKey.length !== 65 ||
    userPublicKey[0] !== 4
  ) {
    throw new Error(
      'Invalid subscription public key.'
    );
  }

  const userKey =
    await crypto.subtle.importKey(
      'raw',
      userPublicKey,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      false,
      []
    );

  const serverKeys =
    await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveBits']
    );

  const sharedSecret =
    new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: 'ECDH',
          public: userKey
        },
        serverKeys.privateKey,
        256
      )
    );

  const serverPublicKey =
    new Uint8Array(
      await crypto.subtle.exportKey(
        'raw',
        serverKeys.publicKey
      )
    );

  const keyInfo =
    concatBytes(
      encoder.encode(
        'WebPush: info'
      ),
      new Uint8Array([0]),
      userPublicKey,
      serverPublicKey
    );

  const prkKey =
    await hkdfExtract(
      authSecret,
      sharedSecret
    );

  const inputKeyMaterial =
    await hkdfExpand(
      prkKey,
      keyInfo,
      32
    );

  const salt =
    crypto.getRandomValues(
      new Uint8Array(16)
    );

  const prk =
    await hkdfExtract(
      salt,
      inputKeyMaterial
    );

  const contentEncryptionKey =
    await hkdfExpand(
      prk,
      concatBytes(
        encoder.encode(
          'Content-Encoding: aes128gcm'
        ),
        new Uint8Array([0])
      ),
      16
    );

  const nonce =
    await hkdfExpand(
      prk,
      concatBytes(
        encoder.encode(
          'Content-Encoding: nonce'
        ),
        new Uint8Array([0])
      ),
      12
    );

  const plaintext =
    concatBytes(
      encoder.encode(payload),
      new Uint8Array([2])
    );

  const aesKey =
    await crypto.subtle.importKey(
      'raw',
      contentEncryptionKey,
      {
        name: 'AES-GCM'
      },
      false,
      ['encrypt']
    );

  const ciphertext =
    new Uint8Array(
      await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: nonce,
          tagLength: 128
        },
        aesKey,
        plaintext
      )
    );

  const recordSize =
    new Uint8Array(4);

  new DataView(
    recordSize.buffer
  ).setUint32(
    0,
    4096,
    false
  );

  return concatBytes(
    salt,
    recordSize,
    new Uint8Array([
      serverPublicKey.length
    ]),
    serverPublicKey,
    ciphertext
  );
}

export async function sendWebPush({
  subscription,
  payload,
  vapidPublicKey,
  vapidPrivateKey,
  vapidSubject,
  ttl = 86400,
  urgency = 'normal'
}) {
  if (
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth
  ) {
    throw new Error(
      'Invalid push subscription.'
    );
  }

  const jwt =
    await createVapidJwt({
      endpoint:
        subscription.endpoint,
      publicKey:
        vapidPublicKey,
      privateKey:
        vapidPrivateKey,
      subject:
        vapidSubject
    });

  const encryptedPayload =
    await encryptPayload(
      subscription,
      payload
    );

  const response =
    await fetch(
      subscription.endpoint,
      {
        method: 'POST',
        headers: {
          Authorization:
            `vapid t=${jwt}, k=${vapidPublicKey}`,
          'Content-Encoding':
            'aes128gcm',
          'Content-Type':
            'application/octet-stream',
          TTL:
            String(ttl),
          Urgency:
            urgency
        },
        body:
          encryptedPayload
      }
    );

  if (!response.ok) {
    const responseBody =
      await response
        .text()
        .catch(() => '');

    const error =
      new Error(
        `Push service returned HTTP ${response.status}.`
      );

    error.statusCode =
      response.status;

    error.body =
      responseBody;

    throw error;
  }

  return {
    statusCode:
      response.status
  };
}