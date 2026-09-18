import type { ComponentType } from 'react'
import { ListFilter, ArrowDown, ArrowUp, Inbox, Archive, Layers } from 'lucide-react'

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>

// Shared icon/chip-class maps for the custom StatusSelect-based dropdowns
// on requests-filters.tsx / vehicle-requests-filters.tsx (status filter,
// sort filter, archive-view filter) — StatusSelect itself is fully generic
// (statuses/labels/icons/chipClasses), so these are the only per-dropdown
// pieces that need to exist; no new dropdown component required.

export const ALL_STATUS_ICON: IconType = ListFilter
export const ALL_STATUS_CHIP_CLASS = 'bg-muted-foreground/10 text-muted-foreground'

export const SORT_OPTIONS = ['newest', 'oldest'] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

export const SORT_ICONS: Record<SortOption, IconType> = {
  newest: ArrowDown,
  oldest: ArrowUp,
}

export const SORT_CHIP_CLASSES: Record<SortOption, string> = {
  newest: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  oldest: 'bg-gray-400/10 text-gray-500 dark:text-gray-400',
}

export const ARCHIVE_VIEW_OPTIONS = ['active', 'archived', 'all'] as const
export type ArchiveViewOption = (typeof ARCHIVE_VIEW_OPTIONS)[number]

export const ARCHIVE_VIEW_ICONS: Record<ArchiveViewOption, IconType> = {
  active: Inbox,
  archived: Archive,
  all: Layers,
}

export const ARCHIVE_VIEW_CHIP_CLASSES: Record<ArchiveViewOption, string> = {
  active: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  archived: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  all: 'bg-gray-400/10 text-gray-500 dark:text-gray-400',
}
