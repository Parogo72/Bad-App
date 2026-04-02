import { promises as fs } from "node:fs";
import path from "node:path";
import webpush from "web-push";
import { getPlayerDashboard } from "@/lib/badminton";

type StoredSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  query: string;
  createdAt: string;
};

type TournamentSnapshot = {
  id: string;
  name: string;
  status: string;
  hasDraws: boolean;
  registered: boolean;
};

type PushStateFile = {
  subscriptions: StoredSubscription[];
  snapshots: Record<string, TournamentSnapshot[]>;
};

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "bad-app-data")
  : path.join(process.cwd(), "data");
const PUSH_STATE_FILE = path.join(DATA_DIR, "push-alerts.json");
const VAPID_KEYS_FILE = path.join(DATA_DIR, "vapid-keys.json");

type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

async function ensureVapidKeysFile(): Promise<{ publicKey: string; privateKey: string }> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await fs.readFile(VAPID_KEYS_FILE, "utf8");
    const parsed = JSON.parse(raw) as { publicKey?: string; privateKey?: string };
    if (parsed.publicKey && parsed.privateKey) {
      return { publicKey: parsed.publicKey, privateKey: parsed.privateKey };
    }
  } catch {
    // Create new keys when file does not exist or is invalid.
  }

  const generated = webpush.generateVAPIDKeys();
  await fs.writeFile(
    VAPID_KEYS_FILE,
    JSON.stringify({ publicKey: generated.publicKey, privateKey: generated.privateKey }, null, 2),
    "utf8",
  );

  return generated;
}

async function getVapidConfig(): Promise<VapidConfig> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  const subject = process.env.VAPID_SUBJECT ?? "mailto:alerts@localhost";

  if (publicKey && privateKey) {
    return { publicKey, privateKey, subject };
  }

  const generated = await ensureVapidKeysFile();
  return {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject,
  };
}

let vapidInitialized = false;
let cachedVapidPublicKey = "";

async function ensureVapidConfigured() {
  if (vapidInitialized) return true;

  const cfg = await getVapidConfig();
  if (!cfg.publicKey || !cfg.privateKey) return false;

  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  cachedVapidPublicKey = cfg.publicKey;
  vapidInitialized = true;
  return true;
}

async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(PUSH_STATE_FILE);
  } catch {
    const initial: PushStateFile = { subscriptions: [], snapshots: {} };
    await fs.writeFile(PUSH_STATE_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readState(): Promise<PushStateFile> {
  await ensureStoreFile();
  const raw = await fs.readFile(PUSH_STATE_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw) as PushStateFile;
    if (!Array.isArray(parsed.subscriptions) || typeof parsed.snapshots !== "object") {
      throw new Error("Invalid schema");
    }
    return parsed;
  } catch {
    const initial: PushStateFile = { subscriptions: [], snapshots: {} };
    await fs.writeFile(PUSH_STATE_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

async function writeState(state: PushStateFile) {
  await ensureStoreFile();
  await fs.writeFile(PUSH_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function toTournamentSnapshot(input: {
  id: string;
  name: string;
  status: string;
  matches: Array<{ drawUrl: string }>;
  playerTournamentUrl: string | null;
}): TournamentSnapshot {
  const hasDraws = input.matches.some((m) => Boolean(m.drawUrl));
  return {
    id: input.id,
    name: input.name,
    status: input.status,
    hasDraws,
    registered: Boolean(input.playerTournamentUrl),
  };
}

function buildChanges(previous: TournamentSnapshot[], current: TournamentSnapshot[]): string[] {
  const prevById = new Map(previous.map((t) => [t.id, t]));
  const changes: string[] = [];

  for (const now of current) {
    const before = prevById.get(now.id);
    if (!before) continue;

    const pendingToDraws =
      (before.status.toLowerCase().includes("pendiente") || !before.hasDraws) &&
      !now.status.toLowerCase().includes("pendiente") &&
      now.hasDraws;

    if (pendingToDraws) {
      changes.push(`Cuadros publicados en ${now.name}`);
    }

    if (!before.registered && now.registered) {
      changes.push(`Inscripción detectada en ${now.name}`);
    }
  }

  return changes;
}

export async function getPublicVapidKey() {
  const ok = await ensureVapidConfigured();
  if (!ok) return "";
  return cachedVapidPublicKey;
}

export async function addSubscription(subscription: StoredSubscription) {
  const state = await readState();
  const filtered = state.subscriptions.filter((s) => s.endpoint !== subscription.endpoint);
  filtered.push(subscription);
  state.subscriptions = filtered;
  await writeState(state);
}

export async function removeSubscriptionByEndpoint(endpoint: string) {
  const state = await readState();
  state.subscriptions = state.subscriptions.filter((s) => s.endpoint !== endpoint);
  await writeState(state);
}

export async function sendTestNotification(query: string) {
  if (!(await ensureVapidConfigured())) {
    throw new Error("Faltan claves VAPID. Configura NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.");
  }

  const state = await readState();
  const targets = state.subscriptions.filter((s) => s.query === query);
  if (targets.length === 0) return 0;

  const payload = JSON.stringify({
    title: "Notificación de prueba",
    body: `Alertas activadas para ${query}`,
    url: "/",
  });

  let sent = 0;
  for (const sub of targets) {
    try {
      await webpush.sendNotification(sub as webpush.PushSubscription, payload);
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await removeSubscriptionByEndpoint(sub.endpoint);
      }
    }
  }

  return sent;
}

export async function checkAndNotifyTournamentChanges(queryFilter?: string) {
  if (!(await ensureVapidConfigured())) {
    throw new Error("Faltan claves VAPID. Configura NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.");
  }

  const state = await readState();
  const grouped = new Map<string, StoredSubscription[]>();

  for (const sub of state.subscriptions) {
    if (queryFilter && sub.query !== queryFilter) continue;
    const list = grouped.get(sub.query) ?? [];
    list.push(sub);
    grouped.set(sub.query, list);
  }

  const summary: Array<{ query: string; notifications: number; changes: string[] }> = [];

  for (const [query, subs] of grouped.entries()) {
    const dashboard = await getPlayerDashboard(query);
    const current = dashboard.upcomingTournaments.map(toTournamentSnapshot);
    const previous = state.snapshots[query] ?? [];
    const changes = buildChanges(previous, current);

    let sent = 0;
    if (changes.length > 0) {
      const payload = JSON.stringify({
        title: "Actualización de torneos",
        body: changes.slice(0, 2).join(" • "),
        url: "/",
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(sub as webpush.PushSubscription, payload);
          sent += 1;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            state.subscriptions = state.subscriptions.filter((s) => s.endpoint !== sub.endpoint);
          }
        }
      }
    }

    state.snapshots[query] = current;
    summary.push({ query, notifications: sent, changes });
  }

  await writeState(state);
  return summary;
}
