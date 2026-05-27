import Store from 'electron-store'
import { safeStorage } from 'electron'
import type { StoreSchema, ScanSession } from './types'

// We store the API key encrypted using Electron's safeStorage
// The rest of the fields are stored as-is
interface RawStoreSchema {
  encryptedApiKey: string
  mode: 'itglue' | 'standalone'
  orgId: string
  orgName: string
  scanHistory: ScanSession[]
}

const store = new Store<RawStoreSchema>({
  name: 'netscan-pro-config',
  defaults: {
    encryptedApiKey: '',
    mode: 'standalone',
    orgId: '',
    orgName: '',
    scanHistory: [],
  },
})

export function getApiKey(): string {
  const encrypted = store.get('encryptedApiKey', '')
  if (!encrypted) return ''
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buf = Buffer.from(encrypted, 'base64')
      return safeStorage.decryptString(buf)
    }
    return Buffer.from(encrypted, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

export function setApiKey(key: string): void {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(key)
      store.set('encryptedApiKey', encrypted.toString('base64'))
    } else {
      store.set('encryptedApiKey', Buffer.from(key, 'utf-8').toString('base64'))
    }
  } catch {
    store.set('encryptedApiKey', Buffer.from(key, 'utf-8').toString('base64'))
  }
}

export function getMode(): 'itglue' | 'standalone' {
  return store.get('mode', 'standalone')
}

export function setMode(mode: 'itglue' | 'standalone'): void {
  store.set('mode', mode)
}

export function getOrgId(): string {
  return store.get('orgId', '')
}

export function setOrgId(id: string): void {
  store.set('orgId', id)
}

export function getOrgName(): string {
  return store.get('orgName', '')
}

export function setOrgName(name: string): void {
  store.set('orgName', name)
}

export function getScanHistory(): ScanSession[] {
  return store.get('scanHistory', [])
}

export function addScanToHistory(session: ScanSession): void {
  const history = getScanHistory()
  // Keep last 50 scans
  const updated = [session, ...history].slice(0, 50)
  store.set('scanHistory', updated)
}

export function getStoreValue(key: keyof StoreSchema): unknown {
  if (key === 'apiKey') return getApiKey()
  if (key === 'mode') return getMode()
  if (key === 'orgId') return getOrgId()
  if (key === 'orgName') return getOrgName()
  if (key === 'scanHistory') return getScanHistory()
  return undefined
}

export function setStoreValue(key: keyof StoreSchema, value: unknown): void {
  if (key === 'apiKey') {
    setApiKey(value as string)
  } else if (key === 'mode') {
    setMode(value as 'itglue' | 'standalone')
  } else if (key === 'orgId') {
    setOrgId(value as string)
  } else if (key === 'orgName') {
    setOrgName(value as string)
  } else if (key === 'scanHistory') {
    store.set('scanHistory', value as ScanSession[])
  }
}

export default store
