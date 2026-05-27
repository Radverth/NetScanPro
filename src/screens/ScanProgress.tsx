import React from 'react'
import { useAppStore } from '../store/appStore'
import { useScan } from '../hooks/useScan'

const PHASE_LABELS = [
  'ARP Sweep',
  'Port Scan',
  'OS Detection',
  'DHCP Lease Read',
  'DNS PTR Lookups',
  'SNMP Walk',
  'Classification',
  'Finalizing',
]

export default function ScanProgress(): React.ReactElement {
  const { scanProgress, scanError } = useAppStore()
  const { stopScan } = useScan()

  const percent = scanProgress?.percentComplete ?? 0
  const hostsFound = scanProgress?.hostsFound ?? 0
  const hostsTotal = scanProgress?.hostsTotal ?? 0
  const phase = scanProgress?.phase ?? 'Initializing…'
  const phaseIndex = scanProgress?.phaseIndex ?? 0

  // SVG ring
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (percent / 100) * circumference

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400">
            <svg className="h-5 w-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">NetScan Pro</p>
            <p className="text-xs text-slate-500">Affinity IT · Technology. Together.</p>
          </div>
        </div>
        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 animate-pulse">
          Scanning…
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-lg text-center">
          {scanError ? (
            <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/5 p-6">
              <p className="text-sm font-medium text-red-400">Scan Error</p>
              <p className="mt-1 text-sm text-slate-400">{scanError}</p>
            </div>
          ) : (
            <>
              {/* Progress ring */}
              <div className="relative mx-auto mb-8 flex h-52 w-52 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
                  {/* Track */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="12"
                  />
                  {/* Progress */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="#F5A623"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                  />
                </svg>
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-bold text-slate-100">{percent}%</span>
                  {hostsTotal > 0 && (
                    <span className="mt-1 text-sm text-slate-400">
                      {hostsFound} of ~{hostsTotal}
                    </span>
                  )}
                </div>
              </div>

              {/* Current phase */}
              <p className="mb-2 text-lg font-semibold text-slate-100">{phase}</p>
              {scanProgress?.currentHost && (
                <p className="mb-6 font-mono text-sm text-slate-500">{scanProgress.currentHost}</p>
              )}

              {/* Phase list */}
              <div className="mx-auto mt-6 max-w-xs space-y-2 text-left">
                {PHASE_LABELS.map((label, i) => {
                  const isDone = i < phaseIndex
                  const isActive = i === phaseIndex
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <div
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs ${
                          isDone
                            ? 'border-green-500/50 bg-green-500/20 text-green-400'
                            : isActive
                            ? 'border-amber-400/50 bg-amber-400/10 text-amber-400'
                            : 'border-slate-700 bg-slate-900 text-slate-700'
                        }`}
                      >
                        {isDone ? (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          isDone
                            ? 'text-slate-500 line-through'
                            : isActive
                            ? 'font-medium text-slate-100'
                            : 'text-slate-600'
                        }`}
                      >
                        {label}
                      </span>
                      {isActive && (
                        <div className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <button
            onClick={stopScan}
            className="mt-10 h-11 w-48 rounded-xl border border-slate-700 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-200"
          >
            Cancel Scan
          </button>
        </div>
      </main>
    </div>
  )
}
