import type { ClientMsg, ServerMsg } from "@aa/shared";

type Listener = (msg: ServerMsg) => void;

export class Net {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private queue: ClientMsg[] = [];
  private url: string;

  constructor(url = defaultWsUrl()) {
    this.url = url;
  }

  connect(): void {
    if (this.ws) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      for (const m of this.queue) ws.send(JSON.stringify(m));
      this.queue.length = 0;
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as ServerMsg;
        for (const l of this.listeners) l(msg);
      } catch {}
    };
    ws.onclose = () => {
      this.ws = null;
      setTimeout(() => this.connect(), 1500);
    };
    ws.onerror = () => {};
  }

  send(msg: ClientMsg): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.queue.push(msg);
      this.connect();
    }
  }

  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

function defaultWsUrl(): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/ws`;
}
