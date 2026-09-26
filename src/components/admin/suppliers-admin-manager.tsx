'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import { ArrowUpDown, CircleAlert, CircleCheck, Filter, Loader2, PackageSearch, Search } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { searchSuppliersAction } from '@/src/services/suppliers/actions'
import type { SupplierId, SupplierPartResult, SupplierProviderStatus, SupplierSearchOutcome } from '@/src/services/suppliers/types'
import { buttonClasses, cardClasses, inputClass } from '@/src/components/ui/styles'

type SortKey = 'price' | 'availability' | null
type ProviderOutcomeEntry = { id: SupplierId; name: string; outcome: SupplierSearchOutcome }

type SearchState = { phase: 'idle' } | { phase: 'loading' } | { phase: 'done'; results: SupplierPartResult[]; providerOutcomes: ProviderOutcomeEntry[] }

function ProviderCard({ dict, provider }: { dict: Dictionary; provider: SupplierProviderStatus }) {
  const t = dict.admin.suppliersPage
  return (
    <div className={cardClasses({ padding: 'sm', className: 'flex items-start gap-4' })}>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          provider.configured ? 'bg-accent-soft text-accent' : 'bg-surface text-muted-foreground'
        }`}
      >
        <PackageSearch className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{provider.name}</h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              provider.configured ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-surface text-muted-foreground'
            }`}
          >
            {provider.configured ? <CircleCheck className="h-3 w-3" strokeWidth={2} /> : <CircleAlert className="h-3 w-3" strokeWidth={2} />}
            {provider.configured ? t.providerConfigured : t.providerNotConfigured}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{t.providerDescriptions[provider.id]}</p>
        <p className="mt-2 text-xs font-medium text-muted-foreground">{provider.configured ? t.providerStatusReady : t.providerStatusMissingCredentials}</p>
      </div>
    </div>
  )
}

// Per-provider banner shown after a search — a real, honest status for
// each provider ('not_configured' / 'not_implemented' today, ready to also
// carry 'unavailable' / 'error' once real calls exist) rather than a single
// collapsed error string. Never renders anything for a provider that
// actually returned results.
function ProviderOutcomeBanner({ dict, name, outcome }: { dict: Dictionary; name: string; outcome: SupplierSearchOutcome }) {
  const t = dict.admin.suppliersPage
  if (outcome.status === 'ok') return null
  const label =
    outcome.status === 'not_configured'
      ? t.outcomeNotConfigured
      : outcome.status === 'not_implemented'
        ? t.outcomeNotImplemented
        : outcome.status === 'unavailable'
          ? t.outcomeUnavailable
          : t.outcomeError
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
      <CircleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span>
        <span className="font-medium text-foreground">{name}</span> — {label}
      </span>
    </div>
  )
}

export function SuppliersAdminManager({ dict, providers }: { dict: Dictionary; providers: SupplierProviderStatus[] }) {
  const t = dict.admin.suppliersPage
  const [keyword, setKeyword] = useState('')
  const [partNumber, setPartNumber] = useState('')
  const [vin, setVin] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [providerFilter, setProviderFilter] = useState<SupplierId | 'all'>('all')
  const [state, setState] = useState<SearchState>({ phase: 'idle' })
  const [pending, startTransition] = useTransition()

  const canSearch = keyword.trim().length > 0 || partNumber.trim().length > 0

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    if (!canSearch || pending) return
    setState({ phase: 'loading' })
    startTransition(async () => {
      const result = await searchSuppliersAction({ keyword, partNumber, vin })
      setState({ phase: 'done', results: result.results, providerOutcomes: result.providerOutcomes })
    })
  }

  // Prepared for real multi-provider results: filter by provider, then sort
  // by price or availability. Harmless no-ops today since `results` is
  // always empty (no provider has a real searchParts() implementation yet).
  const sortedResults = useMemo(() => {
    if (state.phase !== 'done') return []
    let list = providerFilter === 'all' ? state.results : state.results.filter((r) => r.provider === providerFilter)
    if (sortKey === 'price') {
      list = [...list].sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY))
    } else if (sortKey === 'availability') {
      list = [...list].sort((a, b) => Number(b.available ?? false) - Number(a.available ?? false))
    }
    return list
  }, [state, sortKey, providerFilter])

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className={cardClasses({ padding: 'sm' })}>
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.searchSection}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t.keywordLabel}</label>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className={inputClass} placeholder={t.keywordPlaceholder} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t.partNumberLabel}</label>
            <input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className={inputClass} placeholder={t.partNumberPlaceholder} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t.vinLabel}</label>
            <input
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              className={inputClass}
              placeholder={t.vinPlaceholder}
              maxLength={17}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{t.searchHint}</p>
          <button type="submit" disabled={!canSearch || pending} className={buttonClasses({ variant: 'primary', size: 'sm', className: 'gap-1.5' })}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Search className="h-4 w-4" strokeWidth={2} />}
            {t.searchButton}
          </button>
        </div>
      </form>

      <div className={cardClasses({ padding: 'sm' })}>
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.providersSection}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} dict={dict} provider={provider} />
          ))}
        </div>
      </div>

      <div className={cardClasses({ padding: 'sm' })}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t.resultsSection}</h2>
          {state.phase === 'done' && state.results.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value as SupplierId | 'all')}
                className="h-9 rounded-lg border border-border bg-surface-raised px-3 text-xs font-medium text-foreground"
              >
                <option value="all">{t.filterAllProviders}</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSortKey('price')}
                className={buttonClasses({ variant: sortKey === 'price' ? 'secondary' : 'secondary-muted', size: 'sm', className: 'gap-1.5' })}
              >
                <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={2} />
                {t.sortByPrice}
              </button>
              <button
                type="button"
                onClick={() => setSortKey('availability')}
                className={buttonClasses({ variant: sortKey === 'availability' ? 'secondary' : 'secondary-muted', size: 'sm', className: 'gap-1.5' })}
              >
                <Filter className="h-3.5 w-3.5" strokeWidth={2} />
                {t.sortByAvailability}
              </button>
            </div>
          )}
        </div>

        {state.phase === 'idle' && <p className="mt-4 text-sm text-muted-foreground">{t.resultsIdle}</p>}

        {state.phase === 'loading' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            {t.resultsLoading}
          </div>
        )}

        {state.phase === 'done' && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              {state.providerOutcomes.map((entry) => (
                <ProviderOutcomeBanner key={entry.id} dict={dict} name={entry.name} outcome={entry.outcome} />
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead className="bg-surface text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2.5">{t.table.provider}</th>
                    <th className="px-3 py-2.5">{t.table.partNumber}</th>
                    <th className="px-3 py-2.5">{t.table.brand}</th>
                    <th className="px-3 py-2.5">{t.table.description}</th>
                    <th className="px-3 py-2.5">{t.table.price}</th>
                    <th className="px-3 py-2.5">{t.table.availability}</th>
                    <th className="px-3 py-2.5">{t.table.quantity}</th>
                    <th className="px-3 py-2.5">{t.table.eta}</th>
                    <th className="px-3 py-2.5">{t.table.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedResults.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        {t.resultsEmpty}
                      </td>
                    </tr>
                  ) : (
                    sortedResults.map((result, index) => (
                      <tr key={`${result.provider}-${result.partNumber}-${index}`}>
                        <td className="px-3 py-2.5 font-medium text-foreground">{result.supplierName}</td>
                        <td className="px-3 py-2.5">{result.partNumber}</td>
                        <td className="px-3 py-2.5">{result.brand ?? '—'}</td>
                        <td className="px-3 py-2.5">{result.description}</td>
                        <td className="px-3 py-2.5">{result.price !== null ? `${result.price} ${result.currency ?? ''}`.trim() : '—'}</td>
                        <td className="px-3 py-2.5">{result.available === null ? '—' : result.available ? t.available : t.unavailable}</td>
                        <td className="px-3 py-2.5">{result.quantity ?? '—'}</td>
                        <td className="px-3 py-2.5">{result.eta ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <button type="button" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                            {t.table.actionSelect}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
