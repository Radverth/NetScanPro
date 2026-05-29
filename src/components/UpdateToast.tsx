import React, { useEffect } from 'react'
import { useAppStore } from '../store/appStore'

export default function UpdateToast(): React.ReactElement | null {
  const {
    updateAvailable,
    updateVersion,
    updateProgress,
    updateDownloaded,
    setUpdateAvailable,
    setUpdateProgress,
    setUpdateDownloaded,
  } = useAppStore()

  useEffect(() => {
    const api = window.electronAPI?.updater
    if (!api) return
    const offAvailable = api.onUpdateAvailable(({ version }) => setUpdateAvailable(true, version))
    const offProgress = api.onUpdateProgress(({ percent }) => setUpdateProgress(percent))
    const offDownloaded = api.onUpdateDownloaded(() => setUpdateDownloaded(true))
    return () => {
      offAvailable()
      offProgress()
      offDownloaded()
    }
  }, [setUpdateAvailable, setUpdateProgress, setUpdateDownloaded])

  if (!updateAvailable) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-lg border border-amber-400/30 bg-slate-900 shadow-xl">
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/20">
          <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-100">Update {updateVersion} available</p>
          {updateDownloaded ? (
            <>
              <p className="mt-0.5 text-xs text-slate-400">Ready to install</p>
              <button
                onClick={() => window.electronAPI?.updater.installNow()}
                className="mt-2 w-full rounded bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-amber-300 active:bg-amber-500"
              >
                Restart &amp; Install
              </button>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-xs text-slate-400">
                Downloading{updateProgress > 0 ? ` ${updateProgress}%` : '…'}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${updateProgress}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
