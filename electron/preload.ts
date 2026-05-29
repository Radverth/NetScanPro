import { contextBridge, ipcRenderer } from 'electron'
import type { ScanConfig, ScanSession, ScanProgress, ITGlueOrg, SyncResult } from './types'

// Whitelist of valid IPC channels
const SCAN_CHANNELS = ['scan:progress', 'scan:complete', 'scan:error'] as const
const UPDATER_CHANNELS = [
  'updater:update-available',
  'updater:download-progress',
  'updater:update-downloaded',
  'updater:error',
] as const

type ScanChannel = (typeof SCAN_CHANNELS)[number]
type UpdaterChannel = (typeof UPDATER_CHANNELS)[number]

function isValidScanChannel(channel: string): channel is ScanChannel {
  return (SCAN_CHANNELS as readonly string[]).includes(channel)
}

function isValidUpdaterChannel(channel: string): channel is UpdaterChannel {
  return (UPDATER_CHANNELS as readonly string[]).includes(channel)
}

const electronAPI = {
  scan: {
    start: (config: ScanConfig): Promise<void> =>
      ipcRenderer.invoke('scan:start', config),

    stop: (): Promise<void> =>
      ipcRenderer.invoke('scan:stop'),

    onProgress: (callback: (progress: ScanProgress) => void): (() => void) => {
      const channel = 'scan:progress'
      if (!isValidScanChannel(channel)) return () => {}
      const handler = (_event: Electron.IpcRendererEvent, progress: ScanProgress) => callback(progress)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    },

    onComplete: (callback: (session: ScanSession) => void): (() => void) => {
      const channel = 'scan:complete'
      if (!isValidScanChannel(channel)) return () => {}
      const handler = (_event: Electron.IpcRendererEvent, session: ScanSession) => callback(session)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    },

    onError: (callback: (error: string) => void): (() => void) => {
      const channel = 'scan:error'
      if (!isValidScanChannel(channel)) return () => {}
      const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    },
  },

  itglue: {
    searchOrgs: (query: string): Promise<ITGlueOrg[]> =>
      ipcRenderer.invoke('itglue:search-orgs', query),

    createOrg: (data: { name: string; primaryDomain?: string }): Promise<ITGlueOrg> =>
      ipcRenderer.invoke('itglue:create-org', data),

    validateKey: (key: string): Promise<boolean> =>
      ipcRenderer.invoke('itglue:validate-key', key),

    syncDevices: (session: ScanSession): Promise<SyncResult> =>
      ipcRenderer.invoke('itglue:sync-devices', session),
  },

  pdf: {
    generate: (session: ScanSession, options: { outputPath?: string }): Promise<string> =>
      ipcRenderer.invoke('pdf:generate', session, options),
  },

  store: {
    get: (key: string): Promise<unknown> =>
      ipcRenderer.invoke('store:get', key),

    set: (key: string, value: unknown): Promise<void> =>
      ipcRenderer.invoke('store:set', key, value),
  },

  app: {
    getVersion: (): Promise<string> =>
      ipcRenderer.invoke('app:version'),

    showLog: (): Promise<void> =>
      ipcRenderer.invoke('app:show-log'),

    detectSubnet: (): Promise<string> =>
      ipcRenderer.invoke('app:detect-subnet'),
  },

  updater: {
    installNow: (): Promise<void> =>
      ipcRenderer.invoke('updater:install-now'),

    checkForUpdates: (): Promise<void> =>
      ipcRenderer.invoke('updater:check'),

    onUpdateAvailable: (callback: (info: { version: string }) => void): (() => void) => {
      const channel = 'updater:update-available'
      if (!isValidUpdaterChannel(channel)) return () => {}
      const handler = (_event: Electron.IpcRendererEvent, info: { version: string }) => callback(info)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    },

    onUpdateProgress: (callback: (progress: { percent: number }) => void): (() => void) => {
      const channel = 'updater:download-progress'
      if (!isValidUpdaterChannel(channel)) return () => {}
      const handler = (_event: Electron.IpcRendererEvent, progress: { percent: number }) => callback(progress)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    },

    onUpdateDownloaded: (callback: (info: { version: string }) => void): (() => void) => {
      const channel = 'updater:update-downloaded'
      if (!isValidUpdaterChannel(channel)) return () => {}
      const handler = (_event: Electron.IpcRendererEvent, info: { version: string }) => callback(info)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    },

    onError: (callback: (info: { message: string }) => void): (() => void) => {
      const channel = 'updater:error'
      if (!isValidUpdaterChannel(channel)) return () => {}
      const handler = (_event: Electron.IpcRendererEvent, info: { message: string }) => callback(info)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
