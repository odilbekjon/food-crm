/**
 * Server manzili. Bo'sh bo'lsa — demo rejim (ma'lumotlar brauzerda). To'ldirilsa — haqiqiy server:
 *  - mahalliy ishlab chiqishda `/api` (Vite proxy server'ga yo'naltiradi, CORS kerak emas);
 *  - ishlab chiqarishda to'liq manzil, masalan https://api.example.com
 */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export const isRemote = API_URL !== ''
