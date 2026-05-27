import { useEffect, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import type { ScanConfig } from '../../electron/types'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export function useScan() {
  const {
    isScanning,
    scanProgress,
    scanSession,
    scanError,
    setScanProgress,
    setScanSession,
    setScanning,
    setScanError,
    setScreen,
  } = useAppStore()

  useEffect(() => {
    if (!isElectron) return

    const unsubProgress = window.electronAPI.scan.onProgress((progress) => {
      setScanProgress(progress)
    })

    const unsubComplete = window.electronAPI.scan.onComplete((session) => {
      setScanSession(session)
      setScanning(false)
      setScanProgress(null)
      setScreen('results')
    })

    const unsubError = window.electronAPI.scan.onError((error) => {
      setScanError(error)
      setScanning(false)
    })

    return () => {
      unsubProgress()
      unsubComplete()
      unsubError()
    }
  }, [setScanProgress, setScanSession, setScanning, setScanError, setScreen])

  const startScan = useCallback(
    async (config: ScanConfig) => {
      if (!isElectron) return
      setScanError(null)
      setScanning(true)
      setScanProgress({
        phase: 'Initializing',
        phaseIndex: 0,
        totalPhases: 8,
        hostsFound: 0,
        hostsTotal: 0,
        currentHost: '',
        percentComplete: 0,
      })
      try {
        await window.electronAPI.scan.start(config)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg !== 'Scan cancelled') {
          setScanError(msg)
          setScanning(false)
        }
      }
    },
    [setScanError, setScanning, setScanProgress],
  )

  const stopScan = useCallback(async () => {
    if (!isElectron) return
    await window.electronAPI.scan.stop()
    setScanning(false)
    setScanProgress(null)
    setScreen('org-selector')
  }, [setScanning, setScanProgress, setScreen])

  return {
    isScanning,
    scanProgress,
    scanSession,
    scanError,
    startScan,
    stopScan,
  }
}
