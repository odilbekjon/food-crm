import { AuthError, DEMO_ACCOUNT, type AuthApi, type UserProfile } from './types'

/* ----------------------------- Mock amalga oshirish ----------------------------- */

interface StoredAccount extends UserProfile {
  passwordHash: string
}

const ACCOUNTS_KEY = 'food-crm:accounts'
const SESSION_KEY = 'food-crm:session'

async function hashPassword(email: string, password: string): Promise<string> {
  const data = `${email.toLowerCase()}:${password}`
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  // HTTPS bo'lmagan muhitda (LAN IP) subtle mavjud emas — oddiy zaxira xesh (faqat demo).
  let hash = 5381
  for (let i = 0; i < data.length; i += 1) hash = ((hash << 5) + hash + data.charCodeAt(i)) | 0
  return `d${hash}`
}

function readAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (raw) return JSON.parse(raw) as StoredAccount[]
  } catch {
    /* buzilgan yoki mavjud emas */
  }
  return []
}

function writeAccounts(accounts: StoredAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    /* ignore */
  }
}

function publicProfile({ passwordHash: _hash, ...profile }: StoredAccount): UserProfile {
  return profile
}

async function ensureDemoAccount(): Promise<void> {
  const accounts = readAccounts()
  if (accounts.some((account) => account.email === DEMO_ACCOUNT.email)) return
  accounts.push({
    id: 'user_demo',
    name: 'Demo foydalanuvchi',
    email: DEMO_ACCOUNT.email,
    phone: '+998 90 123 45 67',
    storeName: 'Demo do‘kon',
    role: 'owner',
    createdAt: new Date().toISOString(),
    passwordHash: await hashPassword(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password),
  })
  writeAccounts(accounts)
}

function setSession(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(SESSION_KEY, userId)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

function sessionAccount(): StoredAccount | null {
  try {
    const id = localStorage.getItem(SESSION_KEY)
    if (!id) return null
    return readAccounts().find((account) => account.id === id) ?? null
  } catch {
    return null
  }
}

export const mockAuthApi: AuthApi = {
  peek() {
    const account = sessionAccount()
    return account ? publicProfile(account) : null
  },

  async restore() {
    return this.peek?.() ?? null
  },

  async login(email, password) {
    await ensureDemoAccount()
    const normalized = email.trim().toLowerCase()
    const account = readAccounts().find((item) => item.email === normalized)
    if (!account || account.passwordHash !== (await hashPassword(normalized, password))) {
      throw new AuthError('invalid_credentials')
    }
    setSession(account.id)
    return publicProfile(account)
  },

  async signup(input) {
    await ensureDemoAccount()
    const email = input.email.trim().toLowerCase()
    const accounts = readAccounts()
    if (accounts.some((item) => item.email === email)) throw new AuthError('email_taken')
    const account: StoredAccount = {
      id: `user_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      storeName: input.storeName.trim(),
      role: 'owner',
      createdAt: new Date().toISOString(),
      passwordHash: await hashPassword(email, input.password),
    }
    writeAccounts([...accounts, account])
    setSession(account.id)
    return publicProfile(account)
  },

  async logout() {
    setSession(null)
  },

  async updateProfile(update) {
    const current = sessionAccount()
    if (!current) throw new AuthError('not_signed_in')
    const next: StoredAccount = {
      ...current,
      name: update.name.trim(),
      phone: update.phone.trim(),
      storeName: update.storeName.trim(),
    }
    writeAccounts(readAccounts().map((account) => (account.id === next.id ? next : account)))
    return publicProfile(next)
  },

  async changePassword(currentPassword, nextPassword) {
    const current = sessionAccount()
    if (!current) throw new AuthError('not_signed_in')
    if (current.passwordHash !== (await hashPassword(current.email, currentPassword))) throw new AuthError('wrong_password')
    const next: StoredAccount = { ...current, passwordHash: await hashPassword(current.email, nextPassword) }
    writeAccounts(readAccounts().map((account) => (account.id === next.id ? next : account)))
  },
}
