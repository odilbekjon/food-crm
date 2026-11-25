import { isRemote } from '../config'
import { httpAuthApi } from './http'
import { mockAuthApi } from './mock'
import type { AuthApi } from './types'

export { AuthError, DEMO_ACCOUNT } from './types'
export type { AuthApi, AuthErrorCode, ProfileUpdate, SignupInput, UserProfile } from './types'

/** Server rejimida haqiqiy server, aks holda demo (brauzer) autentifikatsiyasi. */
export const authApi: AuthApi = isRemote ? httpAuthApi : mockAuthApi
