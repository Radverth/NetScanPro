import React, { useEffect } from 'react'
import { useAppStore } from './store/appStore'
import OrgSelector from './screens/OrgSelector'
import ScanProgress from './screens/ScanProgress'
import Results from './screens/Results'
import ExportConfirm from './screens/ExportConfirm'
import UpdateToast from './components/UpdateToast'

export default function App(): React.ReactElement {
  const { currentScreen, setUpdateAvailable } = useAppStore()

  useEffect(() => {
    // Listen for auto-update events
    if (typeof window !== 'undefined' && window.electronAPI) {
      const unsubscribe = window.electronAPI.updater.onUpdateAvailable((info) => {
        setUpdateAvailable(true, info.version)
      })
      return unsubscribe
    }
  }, [setUpdateAvailable])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 select-none">
      {currentScreen === 'org-selector' && <OrgSelector />}
      {currentScreen === 'scan-progress' && <ScanProgress />}
      {currentScreen === 'results' && <Results />}
      {currentScreen === 'export-confirm' && <ExportConfirm />}
      <UpdateToast />
    </div>
  )
}
