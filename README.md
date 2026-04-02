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

## Notificaciones automáticas en producción

Al desplegar en Vercel, las notificaciones se comprueban automáticamente **cada 15 minutos** sin necesidad de configuración manual.

- El archivo `.vercel/crons.json` hace que Vercel ejecute automáticamente `/api/push/check-changes` cada 15 minutos.
- Las claves VAPID se generan automáticamente si no las defines en env variables.
- Las suscripciones se persisten en Redis (si configuras KV) o en `/tmp` (menos persistente pero funciona).

### Alternativa: GitHub Actions (opcional)

Si prefieres usar GitHub Actions en lugar de Vercel Crons, crea `.github/workflows/push-alerts.yml`:

```yaml
name: Check Tournament Changes
on:
  schedule:
    - cron: '*/15 * * * *'
  workflow_dispatch:
jobs:
  check-changes:
    runs-on: ubuntu-latest
    steps:
      - name: Check push alert changes
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -d '{}' \
            https://tu-dominio-vercel.vercel.app/api/push/check-changes
```

## Despliegue en Vercel

### Pasos rápidos

1. Sube el proyecto a GitHub.
2. En Vercel, importa el repositorio.
3. En `Root Directory`, selecciona `bad_app`.
4. (Opcional) Añade variables de entorno en Vercel para más control:

Si quieres usar claves VAPID fijas y Redis persistente:

```env
VAPID_SUBJECT=mailto:tu-email@dominio.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=TU_PUBLIC_KEY
VAPID_PRIVATE_KEY=TU_PRIVATE_KEY
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

Si las dejas vacías, la app genera las claves automáticamente y usa `/tmp`.

5. Despliega.

### Nota importante sobre alertas push en Vercel

**Recomendación:** Conecta Upstash Redis desde el dashboard de Vercel (1 click → automáticamente crea `KV_REST_API_*` env vars) para que las suscripciones persistan.

Sin Redis, las suscripciones se pierden cada vez que Vercel reinicia el servidor (raro pero posible).

Con Redis, todo funciona de manera confiable.

## Build

```bash
npm run build
```
