import { DurableObject } from "cloudflare:workers";

const ALLOWED_ORIGINS = new Set();

// const ALLOWED_ORIGINS = new Set([
//   "https://khanqah-naqshbandia-site.pages.dev/"
// ]);

const ACTIVE_TIMEOUT_MS = 90 * 1000;
const ALARM_INTERVAL_MS = 30 * 1000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/presence") {
      return new Response("Not found", {
        status: 404
      });
    }

    if (
      request.method !== "GET" ||
      request.headers.get("Upgrade")?.toLowerCase() !== "websocket"
    ) {
      return new Response("WebSocket required", {
        status: 426
      });
    }

    const origin = request.headers.get("Origin");

    if (
      origin &&
      ALLOWED_ORIGINS.size &&
      !ALLOWED_ORIGINS.has(origin)
    ) {
      return new Response("Forbidden", {
        status: 403
      });
    }

    const presence =
      env.PRESENCE.getByName("website");

    return presence.fetch(request);
  }
};

export class Presence extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
  }

  async fetch() {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    server.serializeAttachment({
      id: crypto.randomUUID(),
      active: true,
      lastSeen: Date.now()
    });

    await this.ensureAlarm();

    this.broadcastCount();

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  getActiveSockets() {
    const now = Date.now();

    return this.ctx
      .getWebSockets()
      .filter(socket => {
        const session =
          socket.deserializeAttachment();

        if (!session) {
          return false;
        }

        return (
          session.active === true &&
          now - session.lastSeen <
            ACTIVE_TIMEOUT_MS
        );
      });
  }

  sendCount(socket, count) {
    try {
      socket.send(
        JSON.stringify({
          type: "presence",
          count
        })
      );
    } catch {
    }
  }

  broadcastCount() {
    const allSockets =
      this.ctx.getWebSockets();

    const count =
      this.getActiveSockets().length;

    for (const socket of allSockets) {
      this.sendCount(
        socket,
        count
      );
    }
  }

  updateSession(ws, changes) {
    const current =
      ws.deserializeAttachment() || {
        id: crypto.randomUUID(),
        active: false,
        lastSeen: 0
      };

    const updated = {
      ...current,
      ...changes
    };

    ws.serializeAttachment(updated);

    return updated;
  }

  async webSocketMessage(
    ws,
    message
  ) {
    let data;

    try {
      data =
        typeof message === "string"
          ? JSON.parse(message)
          : null;
    } catch {
      return;
    }

    if (!data?.type) {
      return;
    }

    if (
      data.type === "heartbeat"
    ) {
      this.updateSession(
        ws,
        {
          active: true,
          lastSeen: Date.now()
        }
      );

      await this.ensureAlarm();

      this.broadcastCount();

      return;
    }

    if (
      data.type === "active"
    ) {
      this.updateSession(
        ws,
        {
          active: true,
          lastSeen: Date.now()
        }
      );

      await this.ensureAlarm();

      this.broadcastCount();

      return;
    }

    if (
      data.type === "inactive"
    ) {
      this.updateSession(
        ws,
        {
          active: false
        }
      );

      this.broadcastCount();

      return;
    }

    if (
      data.type === "count"
    ) {
      this.sendCount(
        ws,
        this.getActiveSockets().length
      );
    }
  }

  async webSocketClose() {
    this.broadcastCount();
  }

  async webSocketError() {
    this.broadcastCount();
  }

  async ensureAlarm() {
    const currentAlarm =
      await this.ctx.storage.getAlarm();

    if (currentAlarm === null) {
      await this.ctx.storage.setAlarm(
        Date.now() +
          ALARM_INTERVAL_MS
      );
    }
  }

  async alarm() {
    const sockets =
      this.ctx.getWebSockets();

    if (!sockets.length) {
      return;
    }

    this.broadcastCount();

    await this.ctx.storage.setAlarm(
      Date.now() +
        ALARM_INTERVAL_MS
    );
  }
}