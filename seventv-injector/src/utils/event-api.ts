import { EVENT_API_URL } from "../constants";
import { debug } from "./debug";

export interface EventApiDispatchPayload<T = unknown> {
  type: string;
  body: T & {
    id?: string;
  };
}

type EventApiHandler = (payload: EventApiDispatchPayload) => void;

interface EventApiSubscription {
  type: string;
  objectId: string;
  handler: EventApiHandler;
}

function toWebSocketUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export class EventApiClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private readonly subscriptions = new Set<EventApiSubscription>();
  private readonly queue: string[] = [];

  connect(): void {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }

    this.socket = new WebSocket(toWebSocketUrl(EVENT_API_URL));
    this.socket.addEventListener("open", () => {
      debug.trace("Event API connected");

      for (const payload of this.queue.splice(0)) {
        this.socket?.send(payload);
      }

      for (const subscription of this.subscriptions) {
        this.sendSubscribe(subscription.type, subscription.objectId);
      }
    });

    this.socket.addEventListener("message", (event) => {
      this.handleMessage(event.data);
    });

    this.socket.addEventListener("close", () => {
      debug.trace("Event API disconnected");
      this.socket = null;

      if (this.reconnectTimer === null && this.subscriptions.size > 0) {
        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, 1000);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socket?.close();
    this.socket = null;
  }

  subscribe(type: string, objectId: string, handler: EventApiHandler): () => void {
    const subscription = {
      type,
      objectId,
      handler,
    };

    this.subscriptions.add(subscription);
    this.connect();
    this.sendSubscribe(type, objectId);

    return () => {
      this.subscriptions.delete(subscription);
      this.send(
        JSON.stringify({
          op: 36,
          d: {
            type,
            condition: {
              object_id: objectId,
            },
          },
        }),
      );

      if (this.subscriptions.size === 0) {
        this.disconnect();
      }
    };
  }

  private sendSubscribe(type: string, objectId: string): void {
    this.send(
      JSON.stringify({
        op: 35,
        d: {
          type,
          condition: {
            object_id: objectId,
          },
        },
      }),
    );
  }

  private send(payload: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.queue.push(payload);
      return;
    }

    this.socket.send(payload);
  }

  private handleMessage(raw: string): void {
    const message = JSON.parse(raw) as {
      op: number;
      d?: EventApiDispatchPayload;
    };

    if (message.op !== 0 || !message.d?.body?.id) {
      return;
    }

    for (const subscription of this.subscriptions) {
      if (
        subscription.type === message.d.type &&
        subscription.objectId === message.d.body.id
      ) {
        subscription.handler(message.d);
      }
    }
  }
}

export const eventApi = new EventApiClient();
