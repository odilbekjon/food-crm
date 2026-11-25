import type { CrmApi } from '@/services/api/types'
import { isRemote } from '@/services/config'
import { mockApi } from '@/services/mock/mockApi'
import { httpApi } from '@/services/remote/httpApi'

/**
 * Ilovada ishlatiladigan yagona API nuqtasi.
 * `VITE_API_URL` berilsa — haqiqiy server (HTTP), aks holda demo rejim (ma'lumotlar brauzerda).
 */
export const api: CrmApi = isRemote ? httpApi : mockApi
export { isRemote } from '@/services/config'
export type { CrmApi } from '@/services/api/types'
