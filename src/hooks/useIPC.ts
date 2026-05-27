import { useCallback } from 'react'
import type { ScanConfig, ScanSession, ITGlueOrg, SyncResult } from '../../electron/types'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export function useIPC() {
  const searchOrgs = useCallback(async (query: string): Promise<ITGlueOrg[]> => {
    if (!isElectron) return []
    return window.electronAPI.itglue.searchOrgs(query)
  }, [])

  const createOrg = useCallback(
    async (data: { name: string; primaryDomain?: string }): Promise<ITGlueOrg> => {
      if (!isElectron) throw new Error('Not in Electron')
      return window.electronAPI.itglue.createOrg(data)
    },
    [],
  )

  const validateApiKey = useCallback(async (key: string): Promise<boolean> => {
    if (!isElectron) return false
    return window.electronAPI.itglue.validateKey(key)
  }, [])

  const syncDevices = useCallback(async (session: ScanSession): Promise<SyncResult> => {
    if (!isElectron) throw new Error('Not in Electron')
    return window.electronAPI.itglue.syncDevices(session)
  }, [])

  const generatePDF = useCallback(
    async (session: ScanSession, outputPath?: string): Promise<string> => {
      if (!isElectron) throw new Error('Not in Electron')
      return window.electronAPI.pdf.generate(session, { outputPath })
    },
    [],
  )

  const startScan = useCallback(async (config: ScanConfig): Promise<void> => {
    if (!isElectron) return
    return window.electronAPI.scan.start(config)
  }, [])

  const stopScan = useCallback(async (): Promise<void> => {
    if (!isElectron) return
    return window.electronAPI.scan.stop()
  }, [])

  const getStoreValue = useCallback(async (key: string): Promise<unknown> => {
    if (!isElectron) return undefined
    return window.electronAPI.store.get(key)
  }, [])

  const setStoreValue = useCallback(async (key: string, value: unknown): Promise<void> => {
    if (!isElectron) return
    return window.electronAPI.store.set(key, value)
  }, [])

  return {
    searchOrgs,
    createOrg,
    validateApiKey,
    syncDevices,
    generatePDF,
    startScan,
    stopScan,
    getStoreValue,
    setStoreValue,
  }
}
