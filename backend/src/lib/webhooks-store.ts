interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  createdAt: Date;
}

const webhooks: Map<string, Webhook> = new Map();

export function getWebhooks(): Webhook[] {
  return Array.from(webhooks.values());
}

export function getWebhook(id: string): Webhook | undefined {
  return webhooks.get(id);
}

export function createWebhook(data: Omit<Webhook, "id" | "createdAt">): Webhook {
  const webhook: Webhook = { ...data, id: crypto.randomUUID(), createdAt: new Date() };
  webhooks.set(webhook.id, webhook);
  return webhook;
}

export function deleteWebhook(id: string): boolean {
  return webhooks.delete(id);
}

export async function triggerWebhook(event: string, payload: any) {
  for (const wh of webhooks.values()) {
    if (wh.active && wh.events.includes(event)) {
      try {
        await fetch(wh.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() }),
        });
      } catch (e) {
        console.error(`Webhook ${wh.id} failed:`, e);
      }
    }
  }
}

export const webhooksDB = {
  getAll: getWebhooks,
  get: getWebhook,
  create: createWebhook,
  delete: deleteWebhook,
  trigger: triggerWebhook,
};
