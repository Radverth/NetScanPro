import React, { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useIPC } from '../hooks/useIPC'

export default function ExportConfirm(): React.ReactElement {
  const {
    mode,
    scanSession,
    syncResult,
    selectedOrg,
    customerName,
    exportedPdfPath,
    setExportedPdfPath,
    reset,
  } = useAppStore()
  const { generatePDF } = useIPC()

  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = async () => {
    if (!scanSession) return
    setIsExporting(true)
    setExportError(null)
    try {
      const session = {
        ...scanSession,
        orgName: mode === 'itglue' ? (selectedOrg?.name ?? '') : customerName,
        orgId: mode === 'itglue' ? (selectedOrg?.id ?? '') : '',
        mode,
      }
      const pdfPath = await generatePDF(session)
      setExportedPdfPath(pdfPath)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadErrors = () => {
    if (!syncResult?.errors.length) return
    const rows = ['IP,Hostname,Error', ...syncResult.errors.map((e) => `${e.ip},${e.hostname ?? ''},${e.error}`)]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sync-errors.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

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
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
              <svg className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Scan Complete</h1>
              <p className="text-slate-400">
                {mode === 'itglue'
                  ? selectedOrg?.name
                  : customerName}{' '}
                · {scanSession?.hosts.length ?? 0} devices found
              </p>
            </div>
          </div>

          {/* IT Glue sync summary */}
          {mode === 'itglue' && syncResult && (
            <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-5">
              <p className="mb-4 text-sm font-semibold text-slate-100">IT Glue Sync</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Created', value: syncResult.created, color: 'text-green-400' },
                  { label: 'Updated', value: syncResult.updated, color: 'text-blue-400' },
                  { label: 'Unchanged', value: syncResult.unchanged, color: 'text-slate-400' },
                  { label: 'Errors', value: syncResult.errors.length, color: 'text-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              {syncResult.errors.length > 0 && (
                <button
                  onClick={handleDownloadErrors}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 py-2 text-xs text-red-400 hover:bg-red-500/10"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download error log ({syncResult.errors.length} errors)
                </button>
              )}
            </div>
          )}

          {/* Standalone mode note */}
          {mode === 'standalone' && (
            <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <p className="text-sm text-slate-400">
                Standalone export — local data only. No IT Glue sync performed.
              </p>
            </div>
          )}

          {/* PDF export */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
            <p className="mb-3 text-sm font-semibold text-slate-100">PDF Report</p>

            {exportedPdfPath ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-slate-800 p-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="truncate font-mono text-xs text-slate-300" title={exportedPdfPath}>
                    {exportedPdfPath}
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  className="w-full rounded-lg border border-slate-700 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  Re-export PDF
                </button>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-400">
                  Generate a branded Affinity IT network assessment report as PDF.
                </p>
                {exportError && (
                  <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {exportError}
                  </p>
                )}
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-60"
                >
                  {isExporting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
                      Generating PDF…
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export PDF
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Done */}
          <button
            onClick={reset}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-xl border border-slate-700 text-sm text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          >
            Done — Start New Scan
          </button>
        </div>
      </main>
    </div>
  )
}
