import { create } from 'zustand'
import type { ScanSession, ScanProgress, ITGlueOrg, SyncResult, ScanConfig } from '../../electron/types'

type Screen = 'org-selector' | 'scan-progress' | 'results' | 'export-confirm'

interface AppState {
  currentScreen: Screen
  mode: 'itglue' | 'standalone'
  selectedOrg: ITGlueOrg | null
  customerName: string
  scanConfig: ScanConfig
  scanSession: ScanSession | null
  scanProgress: ScanProgress | null
  isScanning: boolean
  scanError: string | null
  syncResult: SyncResult | null
  isSyncing: boolean
  updateAvailable: boolean
  updateVersion: string
  updateProgress: number
  updateDownloaded: boolean
  exportedPdfPath: string | null
  settingsOpen: boolean

  setScreen: (screen: Screen) => void
  setMode: (mode: 'itglue' | 'standalone') => void
  setOrg: (org: ITGlueOrg | null) => void
  setCustomerName: (name: string) => void
  setScanConfig: (config: Partial<ScanConfig>) => void
  setScanSession: (session: ScanSession | null) => void
  setScanProgress: (progress: ScanProgress | null) => void
  setScanning: (scanning: boolean) => void
  setScanError: (error: string | null) => void
  setSyncResult: (result: SyncResult | null) => void
  setIsSyncing: (syncing: boolean) => void
  setUpdateAvailable: (available: boolean, version?: string) => void
  setUpdateProgress: (percent: number) => void
  setUpdateDownloaded: (downloaded: boolean) => void
  setExportedPdfPath: (path: string | null) => void
  setSettingsOpen: (open: boolean) => void
  reset: () => void
}

const defaultScanConfig: ScanConfig = {
  speed: 'balanced',
  snmpCommunity: 'public',
  includeDhcpRead: true,
  includeSnmp: true,
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'org-selector',
  mode: 'standalone',
  selectedOrg: null,
  customerName: '',
  scanConfig: defaultScanConfig,
  scanSession: null,
  scanProgress: null,
  isScanning: false,
  scanError: null,
  syncResult: null,
  isSyncing: false,
  updateAvailable: false,
  updateVersion: '',
  updateProgress: 0,
  updateDownloaded: false,
  exportedPdfPath: null,
  settingsOpen: false,

  setScreen: (screen) => set({ currentScreen: screen }),
  setMode: (mode) => set({ mode }),
  setOrg: (org) => set({ selectedOrg: org }),
  setCustomerName: (name) => set({ customerName: name }),
  setScanConfig: (config) =>
    set((state) => ({ scanConfig: { ...state.scanConfig, ...config } })),
  setScanSession: (session) => set({ scanSession: session }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  setScanning: (scanning) => set({ isScanning: scanning }),
  setScanError: (error) => set({ scanError: error }),
  setSyncResult: (result) => set({ syncResult: result }),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
  setUpdateAvailable: (available, version = '') =>
    set({ updateAvailable: available, updateVersion: version }),
  setUpdateProgress: (percent) => set({ updateProgress: percent }),
  setUpdateDownloaded: (downloaded) => set({ updateDownloaded: downloaded }),
  setExportedPdfPath: (path) => set({ exportedPdfPath: path }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  reset: () =>
    set({
      currentScreen: 'org-selector',
      selectedOrg: null,
      customerName: '',
      scanSession: null,
      scanProgress: null,
      isScanning: false,
      scanError: null,
      syncResult: null,
      isSyncing: false,
      exportedPdfPath: null,
    }),
}))
