import React from 'react'
import type { DeviceType } from '../../electron/types'
import { DEVICE_LABELS } from './DeviceCard'

interface Props {
  search: string
  onSearchChange: (value: string) => void
  activeFilter: DeviceType | 'all'
  onFilterChange: (filter: DeviceType | 'all') => void
  deviceTypeCounts: Partial<Record<DeviceType, number>>
}

export default function FilterBar({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  deviceTypeCounts,
}: Props): React.ReactElement {
  const activeTypes = Object.entries(deviceTypeCounts).filter(([, count]) => (count ?? 0) > 0) as [
    DeviceType,
    number,
  ][]

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
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
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search hostname or IP…"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400/50 focus:outline-none"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Type chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFilterChange('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            activeFilter === 'all'
              ? 'bg-amber-400 text-slate-900'
              : 'border border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200'
          }`}
        >
          All
        </button>
        {activeTypes.map(([type, count]) => (
          <button
            key={type}
            onClick={() => onFilterChange(type)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === type
                ? 'bg-amber-400 text-slate-900'
                : 'border border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            }`}
          >
            {DEVICE_LABELS[type]} ({count})
          </button>
        ))}
      </div>
    </div>
  )
}
