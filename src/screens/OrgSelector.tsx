import React, { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { useScan } from '../hooks/useScan'
import { useIPC } from '../hooks/useIPC'
import OrgSearchInput from '../components/OrgSearchInput'
import SettingsModal from '../components/SettingsModal'
import type { ITGlueOrg } from '../../electron/types'

export default function OrgSelector(): React.ReactElement {
  const {
    mode,
    setMode,
    selectedOrg,
    setOrg,
    customerName,
    setCustomerName,
    scanConfig,
    setScanConfig,
    setScreen,
    setSettingsOpen,
  } = useAppStore()
  const { startScan } = useScan()
  const { getStoreValue } = useIPC()

  const [showScanOptions, setShowScanOptions] = useState(false)
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgDomain, setNewOrgDomain] = useState('')
  const { createOrg } = useIPC()

  useEffect(() => {
    getStoreValue('mode').then((storedMode) => {
      if (storedMode === 'itglue' || storedMode === 'standalone') {
        setMode(storedMode)
      }
    })
  }, [getStoreValue, setMode])

  const canProceed = mode === 'standalone' ? customerName.trim().length > 0 : selectedOrg !== null

  const handleStart = async () => {
    if (!canProceed) return
    setScreen('scan-progress')
    await startScan(scanConfig)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canProceed) handleStart()
  }

  const handleOrgSelect = (org: ITGlueOrg) => {
    setOrg(org)
  }

  const handleCreateNew = (name: string) => {
    setNewOrgName(name)
    setIsCreatingOrg(true)
  }

  const handleSubmitNewOrg = async () => {
    try {
      const org = await createOrg({ name: newOrgName, primaryDomain: newOrgDomain || undefined })
      setOrg(org)
      setIsCreatingOrg(false)
    } catch (err) {
      console.error('Failed to create org:', err)
    }
  }

  return (
    <div className="flex min-h-screen flex-col" onKeyDown={handleKeyDown}>
      <SettingsModal />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400">
            <svg className="h-5 w-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">NetScan Pro</p>
            <p className="text-xs text-slate-500">Affinity IT · Technology. Together.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode badge */}
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              mode === 'itglue'
                ? 'bg-blue-500/10 text-blue-400'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {mode === 'itglue' ? 'IT Glue' : 'Standalone'}
          </span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-100"
            aria-label="Settings"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-lg">
          <h1 className="mb-2 text-3xl font-bold text-slate-100">
            {mode === 'itglue' ? 'Select Organisation' : 'Customer Name'}
          </h1>
          <p className="mb-8 text-slate-400">
            {mode === 'itglue'
              ? 'Search for the customer in IT Glue to begin network discovery.'
              : 'Enter the customer name to begin network discovery and PDF export.'}
          </p>

          {mode === 'itglue' ? (
            <div className="space-y-4">
              {!isCreatingOrg ? (
                <>
                  <OrgSearchInput onSelect={handleOrgSelect} onCreateNew={handleCreateNew} />
                  {selectedOrg && (
                    <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-slate-100">{selectedOrg.name}</p>
                        <p className="text-xs text-slate-500">ID {selectedOrg.id}</p>
                      </div>
                      <button
                        onClick={() => setOrg(null)}
                        className="ml-auto text-slate-500 hover:text-slate-300"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <p className="text-sm font-medium text-slate-100">Create new organisation</p>
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Organisation name *"
                    className="h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400/50 focus:outline-none"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newOrgDomain}
                    onChange={(e) => setNewOrgDomain(e.target.value)}
                    placeholder="Primary domain (optional)"
                    className="h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400/50 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmitNewOrg}
                      disabled={!newOrgName.trim()}
                      className="flex-1 rounded-lg bg-amber-400 py-2.5 text-sm font-medium text-slate-900 hover:bg-amber-300 disabled:opacity-40"
                    >
                      Create Organisation
                    </button>
                    <button
                      onClick={() => setIsCreatingOrg(false)}
                      className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="h-14 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-base text-slate-100 placeholder-slate-500 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                autoFocus
              />

              {/* Scan options */}
              <div className="rounded-xl border border-slate-700 bg-slate-900">
                <button
                  onClick={() => setShowScanOptions(!showScanOptions)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm text-slate-400 hover:text-slate-200"
                >
                  <span>Scan Options</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${showScanOptions ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showScanOptions && (
                  <div className="space-y-4 border-t border-slate-800 px-4 pb-4 pt-3">
                    {/* Scan speed */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-400">Scan Speed</label>
                      <div className="flex gap-2">
                        {(['fast', 'balanced', 'thorough'] as const).map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setScanConfig({ speed })}
                            className={`flex-1 rounded-lg py-2 text-xs font-medium capitalize transition-colors ${
                              scanConfig.speed === speed
                                ? 'bg-amber-400 text-slate-900'
                                : 'border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                            }`}
                          >
                            {speed}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        {scanConfig.speed === 'fast' && 'ARP + top 100 ports — under 60s'}
                        {scanConfig.speed === 'balanced' && 'Top 1000 ports + OS detection — 2–3 min'}
                        {scanConfig.speed === 'thorough' && 'All ports + SNMP + full OS — 5–10 min'}
                      </p>
                    </div>

                    {/* IP range */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        IP Range Override
                      </label>
                      <input
                        type="text"
                        value={scanConfig.ipRange ?? ''}
                        onChange={(e) => setScanConfig({ ipRange: e.target.value || undefined })}
                        placeholder="Auto-detect from NIC (e.g. 192.168.1.0/24)"
                        className="h-9 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-400/50 focus:outline-none"
                      />
                    </div>

                    {/* SNMP community */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        SNMP Community String
                      </label>
                      <input
                        type="text"
                        value={scanConfig.snmpCommunity}
                        onChange={(e) => setScanConfig({ snmpCommunity: e.target.value })}
                        placeholder="public"
                        className="h-9 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-400/50 focus:outline-none"
                      />
                    </div>

                    {/* Toggles */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Include DHCP read</span>
                      <button
                        onClick={() => setScanConfig({ includeDhcpRead: !scanConfig.includeDhcpRead })}
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          scanConfig.includeDhcpRead ? 'bg-amber-400' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            scanConfig.includeDhcpRead ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Include SNMP walk</span>
                      <button
                        onClick={() => setScanConfig({ includeSnmp: !scanConfig.includeSnmp })}
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          scanConfig.includeSnmp ? 'bg-amber-400' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            scanConfig.includeSnmp ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleStart}
            disabled={!canProceed}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-base font-semibold text-slate-900 transition-all hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start Scan
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <p className="mt-3 text-center text-xs text-slate-600">Press Enter to start</p>
        </div>
      </main>
    </div>
  )
}
