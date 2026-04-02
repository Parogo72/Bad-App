# Badminton Dashboard

Panel personal para consultar torneos, partidos, cuadros y ranking en badminton.es.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Notificaciones Web Push

El proyecto incluye alertas push para cambios de torneo:

- Cuando pasa de cuadros pendientes a cuadros publicados.
- Cuando pasas de no inscrito a inscrito.

### 1) Claves VAPID (automático o manual)

Modo automático (recomendado para local):

- Si no defines claves en `.env.local`, la app las genera automáticamente en `data/vapid-keys.json` al primer uso.

Modo manual (recomendado para producción estable):

Ejecuta:

```bash
node -e "const w=require('web-push'); console.log(w.generateVAPIDKeys())"
```

### 2) Configurar variables de entorno

Crea `.env.local` con:

```env
VAPID_SUBJECT=mailto:tu-email@dominio.com
ALERT_CHECK_SECRET=una-clave-larga-opcional
```

Si quieres fijar claves manuales en producción, añade también:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=TU_PUBLIC_KEY
VAPID_PRIVATE_KEY=TU_PRIVATE_KEY
```

Persistencia de alertas en producción (recomendada):

- Conecta una integración de Redis en Vercel (Upstash/Vercel KV).
- Añade las variables que te cree la integración:

```env
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

Compatibilidad adicional (si tu integración expone estos nombres):

```env
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### 3) Activar desde el perfil

En la vista de perfil:

- Activa notificaciones web.
- Envía una notificación de prueba.

### 4) Ejecutar comprobación de cambios

Endpoint:

`POST /api/push/check-changes`

En producción, si defines `ALERT_CHECK_SECRET`, envía:

- Header `x-alert-secret: <secret>`
	o
- Query param `?secret=<secret>`

Puedes pasar opcionalmente un `query` en JSON para comprobar solo un jugador.

## Ejecución gratuita programada

Para hacerlo gratis, programa un cron en GitHub Actions que llame al endpoint `POST /api/push/check-changes` cada 10-15 minutos.

## Despliegue en Vercel

### Pasos rápidos

1. Sube el proyecto a GitHub.
2. En Vercel, importa el repositorio.
3. En `Root Directory`, selecciona `bad_app`.
4. Añade variables de entorno en Vercel (Project Settings -> Environment Variables):

```env
VAPID_SUBJECT=mailto:tu-email@dominio.com
ALERT_CHECK_SECRET=una-clave-larga-opcional
NEXT_PUBLIC_VAPID_PUBLIC_KEY=TU_PUBLIC_KEY
VAPID_PRIVATE_KEY=TU_PRIVATE_KEY
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

5. Despliega.

### Nota importante sobre alertas push en Vercel

- Esta app ya guarda suscripciones/snapshots en Redis (Vercel KV/Upstash) cuando detecta `KV_REST_API_URL` y `KV_REST_API_TOKEN` (o variables `UPSTASH_REDIS_*`).
- Si no hay Redis configurado, usa fallback en archivo local (`/tmp` en Vercel o `data/` en local). Ese fallback no es persistente en producción.

## Build

```bash
npm run build
```
