import React from 'react'
import { useAppStore } from '../store/appStore'

export default function UpdateToast(): React.ReactElement | null {
  const { updateAvailable, updateVersion } = useAppStore()

  if (!updateAvailable) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-amber-400/30 bg-slate-900 px-4 py-3 shadow-xl">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/20">
        <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-100">
          Update {updateVersion} available
        </p>
        <p className="text-xs text-slate-400">Will install on next launch</p>
      </div>
    </div>
  )
}
