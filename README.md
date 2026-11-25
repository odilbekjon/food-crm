# food-crm-frontend

Oziq-ovqat do'konlari uchun CRM — **faqat frontend** (Vite · React 19 · TypeScript · Tailwind v4 · shadcn/ui).
Backend alohida repozitoriyda/papkada (`food-crm/server`).

## Ishga tushirish

```bash
npm install
npm run dev        # http://localhost:5173  (demo rejim)
npm run build      # tsc -b && vite build -> dist/
```

**Demo kirish:** `demo@foodcrm.uz` / `Demo1234`. Demo rejimda ma'lumotlar brauzerda (IndexedDB) saqlanadi.

## Ikki rejim

| Rejim | Qachon | Ma'lumot |
|---|---|---|
| Demo | `VITE_API_URL` bo'sh (standart) | brauzerda, 45 kunlik demo tarix |
| Server | `VITE_API_URL=/api` | haqiqiy backend (PostgreSQL) |

## Vercel'ga joylashtirish

`vercel.json` tayyor (SPA yo'naltirish, kesh, xavfsizlik sarlavhalari). Vercel'da: **Add New → Project → shu repozitoriy → Deploy**.
Framework avtomatik aniqlanadi (Vite), qo'shimcha sozlama shart emas.

### Backend ulanganda (keyingi bosqich)

Brauzer faqat bitta manzil bilan gaplashsin (cookie muammosi bo'lmasligi uchun), shuning uchun `/api` ni Vercel backendga yo'naltiradi.
`vercel.json` dagi `rewrites` ning **boshiga** qo'shing (`<BACKEND>` — backend manzili, masalan `https://foodcrm-api.onrender.com`):

```json
{ "source": "/api/:path*", "destination": "https://<BACKEND>/:path*" }
```

So'ng Vercel → Settings → Environment Variables: `VITE_API_URL` = `/api` (Production), qayta deploy qiling.
Backendda `ALLOWED_ORIGINS` ga Vercel manzilini (`https://<loyiha>.vercel.app`) qo'shing.
