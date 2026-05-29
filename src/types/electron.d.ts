import type { ScanConfig, ScanSession, ScanProgress, ITGlueOrg, SyncResult } from '../../electron/types'

export {}

declare global {
  interface Window {
    electronAPI: {
      scan: {
        start: (config: ScanConfig) => Promise<void>
        stop: () => Promise<void>
        onProgress: (callback: (progress: ScanProgress) => void) => () => void
        onComplete: (callback: (session: ScanSession) => void) => () => void
        onError: (callback: (error: string) => void) => () => void
      }
      itglue: {
        searchOrgs: (query: string) => Promise<ITGlueOrg[]>
        createOrg: (data: { name: string; primaryDomain?: string }) => Promise<ITGlueOrg>
        validateKey: (key: string) => Promise<boolean>
        syncDevices: (session: ScanSession) => Promise<SyncResult>
      }
      pdf: {
        generate: (session: ScanSession, options: { outputPath?: string }) => Promise<string>
      }
      store: {
        get: (key: string) => Promise<unknown>
        set: (key: string, value: unknown) => Promise<void>
      }
      updater: {
        installNow: () => Promise<void>
        checkForUpdates: () => Promise<void>
        onUpdateAvailable: (callback: (info: { version: string }) => void) => () => void
        onUpdateProgress: (callback: (progress: { percent: number }) => void) => () => void
        onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void
        onError: (callback: (info: { message: string }) => void) => () => void
      }
    }
  }
}
