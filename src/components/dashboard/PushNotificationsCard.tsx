"use client";

import { useEffect, useState } from "react";

type PushNotificationsCardProps = {
  query: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function PushNotificationsCard({ query }: PushNotificationsCardProps) {
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<"idle" | "enabled" | "disabled">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supportedNow = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(supportedNow);
    if (!supportedNow) {
      setMessage("Tu navegador no soporta Web Push.");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setStatus(subscription ? "enabled" : "disabled");
      })
      .catch(() => {
        setMessage("No se pudo inicializar el servicio de notificaciones.");
      });
  }, []);

  async function enablePush() {
    if (!supported) return;
    setLoading(true);
    setMessage(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Permiso denegado. Debes permitir notificaciones en el navegador.");
        setLoading(false);
        return;
      }

      const keyResponse = await fetch("/api/push/public-key");
      const keyPayload = (await keyResponse.json()) as { publicKey?: string; error?: string };
      if (!keyResponse.ok || !keyPayload.publicKey) {
        throw new Error(keyPayload.error ?? "No se pudo cargar la clave pública VAPID.");
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyPayload.publicKey),
        });
      }

      const subscribeResponse = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          subscription: subscription.toJSON(),
        }),
      });

      if (!subscribeResponse.ok) {
        const payload = (await subscribeResponse.json()) as { error?: string };
        throw new Error(payload.error ?? "No se pudo guardar la suscripción.");
      }

      setStatus("enabled");
      setMessage("Notificaciones activadas correctamente.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al activar notificaciones.";
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function disablePush() {
    if (!supported) return;
    setLoading(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setStatus("disabled");
      setMessage("Notificaciones desactivadas.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al desactivar notificaciones.";
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function sendTest() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const payload = (await response.json()) as { sent?: number; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo enviar la prueba.");
      }

      setMessage(`Notificación de prueba enviada (${payload.sent ?? 0}).`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al enviar prueba.";
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function togglePush() {
    if (status === "enabled") {
      await disablePush();
      return;
    }
    await enablePush();
  }

  return (
    <article className="info-card alerts-card animate-rise-delay rounded-2xl p-5 md:col-span-3 md:col-start-1">
      <p className="card-label">Alertas</p>
      <div className="alerts-panel mt-2 rounded-xl border border-white/15 bg-white/5 p-4">
        <p className="text-sm text-stone-300">
          Recibe una notificación en el móvil cuando haya cambios relevantes en tus torneos.
        </p>
        <p className="mt-2 text-sm text-stone-300">
          Eventos: publicación de cuadros y detección de inscripción.
        </p>

        <div className="alerts-actions mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading || !supported}
            onClick={togglePush}
            className={`chip-action ${status === "enabled" ? "chip-action-active" : ""}`}
          >
            {status === "enabled" ? "Desactivar notificaciones" : "Activar notificaciones"}
          </button>
          <button
            type="button"
            disabled={loading || !supported || status !== "enabled"}
            onClick={sendTest}
            className="chip-action"
          >
            Enviar prueba
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`alerts-status-pill ${status === "enabled" ? "is-enabled" : "is-disabled"}`}>
          {status === "enabled" ? "Activadas" : status === "disabled" ? "Desactivadas" : "Sin configurar"}
        </span>
        <span className="text-sm text-stone-300">Estado de alertas</span>
      </div>
      {message ? <p className="alerts-message mt-2 text-sm text-cyan-200">{message}</p> : null}
    </article>
  );
}
