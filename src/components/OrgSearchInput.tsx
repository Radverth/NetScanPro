import React, { useState, useEffect, useRef, useCallback } from 'react'
import Fuse from 'fuse.js'
import type { ITGlueOrg } from '../../electron/types'
import { useIPC } from '../hooks/useIPC'

interface Props {
  onSelect: (org: ITGlueOrg) => void
  onCreateNew: (name: string) => void
}

export default function OrgSearchInput({ onSelect, onCreateNew }: Props): React.ReactElement {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ITGlueOrg[]>()
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [pendingOrg, setPendingOrg] = useState<{ org: ITGlueOrg; confidence: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const allOrgsRef = useRef<ITGlueOrg[]>([])
  const { searchOrgs } = useIPC()

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([])
        setIsOpen(false)
        return
      }

      setIsLoading(true)
      try {
        const orgs = await searchOrgs(q)
        allOrgsRef.current = orgs

        // Client-side Fuse.js re-rank for better fuzzy matching
        const fuse = new Fuse(orgs, {
          keys: ['name'],
          threshold: 0.35,
          includeScore: true,
        })
        const fuseResults = fuse.search(q)
        const ranked =
          fuseResults.length > 0 ? fuseResults.map((r) => r.item) : orgs.slice(0, 10)

        setResults(ranked)
        setIsOpen(true)
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    },
    [searchOrgs],
  )

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runSearch(query)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, runSearch])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (org: ITGlueOrg) => {
    // Compute confidence via Fuse
    const fuse = new Fuse([org], { keys: ['name'], threshold: 1, includeScore: true })
    const res = fuse.search(query)
    const score = res[0]?.score ?? 1
    const confidence = Math.round((1 - score) * 100)

    if (confidence < 95) {
      setPendingOrg({ org, confidence })
      setIsOpen(false)
    } else {
      setQuery(org.name)
      setIsOpen(false)
      onSelect(org)
    }
  }

  const handleConfirm = () => {
    if (!pendingOrg) return
    setQuery(pendingOrg.org.name)
    onSelect(pendingOrg.org)
    setPendingOrg(null)
  }

  const handleCreateNew = () => {
    setIsOpen(false)
    onCreateNew(query)
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false)
              setQuery('')
            }
          }}
          placeholder="Search customer name…"
          className="h-14 w-full rounded-xl border border-slate-700 bg-slate-900 pl-12 pr-12 text-base text-slate-100 placeholder-slate-500 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
          autoFocus
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        >
          {results.slice(0, 8).map((org) => (
            <button
              key={org.id}
              onClick={() => handleSelect(org)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-800"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-100">{org.name}</p>
                {org.primaryDomain && (
                  <p className="text-xs text-slate-500">{org.primaryDomain}</p>
                )}
              </div>
            </button>
          ))}
          <div className="border-t border-slate-800">
            <button
              onClick={handleCreateNew}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-800"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-400/10">
                <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-amber-400">
                Create &ldquo;{query}&rdquo; as new organisation
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Fuzzy confirmation card */}
      {pendingOrg && (
        <div className="mt-3 rounded-xl border border-amber-400/30 bg-slate-900 p-4">
          <p className="mb-3 text-sm text-slate-300">
            You typed <span className="font-medium text-slate-100">&ldquo;{query}&rdquo;</span> — did you mean{' '}
            <span className="font-medium text-amber-400">&ldquo;{pendingOrg.org.name}&rdquo;</span>?{' '}
            <span className="text-slate-500">(ID {pendingOrg.org.id})</span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-amber-400 py-2 text-sm font-medium text-slate-900 hover:bg-amber-300"
            >
              Yes, that&apos;s correct
            </button>
            <button
              onClick={() => {
                setPendingOrg(null)
                inputRef.current?.focus()
              }}
              className="flex-1 rounded-lg border border-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Search again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
