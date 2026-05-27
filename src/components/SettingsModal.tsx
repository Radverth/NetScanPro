import React, { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { useIPC } from '../hooks/useIPC'

export default function SettingsModal(): React.ReactElement | null {
  const { settingsOpen, setSettingsOpen, mode, setMode } = useAppStore()
  const { validateApiKey, getStoreValue, setStoreValue } = useIPC()

  const [apiKey, setApiKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | null>(null)
  const [selectedMode, setSelectedMode] = useState<'itglue' | 'standalone'>(mode)

  useEffect(() => {
    if (settingsOpen) {
      setSelectedMode(mode)
      getStoreValue('apiKey').then((key) => {
        if (typeof key === 'string' && key) {
          setApiKey('●'.repeat(20))
        }
      })
    }
  }, [settingsOpen, mode, getStoreValue])

  const handleValidate = async () => {
    if (!apiKey || apiKey.startsWith('●')) return
    setIsValidating(true)
    setValidationResult(null)
    try {
      const valid = await validateApiKey(apiKey)
      setValidationResult(valid ? 'valid' : 'invalid')
    } catch {
      setValidationResult('invalid')
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    if (apiKey && !apiKey.startsWith('●')) {
      await setStoreValue('apiKey', apiKey)
    }
    await setStoreValue('mode', selectedMode)
    setMode(selectedMode)
    setSettingsOpen(false)
  }

  if (!settingsOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Settings</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Mode Selection */}
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-300">Mode</label>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 p-3 hover:border-slate-600">
                <input
                  type="radio"
                  name="mode"
                  value="itglue"
                  checked={selectedMode === 'itglue'}
                  onChange={() => setSelectedMode('itglue')}
                  className="accent-amber-400"
                />
                <div>
                  <p className="text-sm font-medium text-slate-100">IT Glue Mode</p>
                  <p className="text-xs text-slate-400">Full workflow with org selector and sync</p>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 p-3 hover:border-slate-600">
                <input
                  type="radio"
                  name="mode"
                  value="standalone"
                  checked={selectedMode === 'standalone'}
                  onChange={() => setSelectedMode('standalone')}
                  className="accent-amber-400"
                />
                <div>
                  <p className="text-sm font-medium text-slate-100">Standalone Mode</p>
                  <p className="text-xs text-slate-400">Scan and export PDF — no IT Glue required</p>
                </div>
              </label>
            </div>
          </div>

          {/* API Key */}
          {selectedMode === 'itglue' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                IT Glue API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setValidationResult(null)
                  }}
                  placeholder="Enter API key…"
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
                <button
                  onClick={handleValidate}
                  disabled={isValidating || !apiKey || apiKey.startsWith('●')}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-300 hover:border-slate-500 hover:text-slate-100 disabled:opacity-40"
                >
                  {isValidating ? 'Checking…' : 'Test'}
                </button>
              </div>
              {validationResult === 'valid' && (
                <p className="mt-1.5 text-xs text-green-400">✓ API key is valid</p>
              )}
              {validationResult === 'invalid' && (
                <p className="mt-1.5 text-xs text-red-400">✗ API key invalid or unreachable</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setSettingsOpen(false)}
            className="rounded-lg px-4 py-2.5 text-sm text-slate-400 hover:text-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-amber-300"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
