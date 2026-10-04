import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Dictionary } from '@/src/i18n/dictionaries'
import {
  getTimelineStepStates,
  isTerminalTrackingStatus,
  PARTS_MAIN_STEPS,
  StatusTimeline,
  VEHICLE_MAIN_STEPS,
} from './status-timeline'

const dict = {
  tracking: { closedNotice: 'Closed notice', cancelledNotice: 'Cancelled notice' },
  admin: {
    statuses: {
      request_received: 'Request received', on_treatment: 'On treatment', parts_found: 'Parts found', direct_communication: 'Direct communication',
    },
    detail: { historySection: 'Status history', historyEmpty: 'No history yet' },
  },
} as unknown as Dictionary

describe('tracking timeline status semantics', () => {
  it.each([
    ['request_received', ['current', 'upcoming', 'upcoming', 'upcoming']],
    ['on_treatment', ['done', 'current', 'upcoming', 'upcoming']],
    ['parts_found', ['done', 'done', 'current', 'upcoming']],
    ['direct_communication', ['done', 'done', 'done', 'current']],
  ] as const)('maps parts status %s without changing its meaning', (status, expected) => {
    expect(getTimelineStepStates(status, PARTS_MAIN_STEPS)).toEqual(expected)
  })

  it.each([
    ['request_received', ['current', 'upcoming', 'upcoming', 'upcoming']],
    ['on_treatment', ['done', 'current', 'upcoming', 'upcoming']],
    ['vehicle_found', ['done', 'done', 'current', 'upcoming']],
    ['direct_communication', ['done', 'done', 'done', 'current']],
  ] as const)('maps vehicle status %s without changing its meaning', (status, expected) => {
    expect(getTimelineStepStates(status, VEHICLE_MAIN_STEPS)).toEqual(expected)
  })

  it.each(['closed', 'cancelled'])('keeps %s as a terminal notice rather than a fifth step', (status) => {
    expect(isTerminalTrackingStatus(status)).toBe(true)
    expect(getTimelineStepStates(status, PARTS_MAIN_STEPS)).toEqual(['upcoming', 'upcoming', 'upcoming', 'upcoming'])
  })

  it('renders the explicit no-history state when persisted history is empty', () => {
    const html = renderToStaticMarkup(createElement(StatusTimeline, {
      dict,
      locale: 'en',
      status: 'request_received',
      history: [],
      mainSteps: PARTS_MAIN_STEPS,
    }))

    expect(html).toContain('Status history')
    expect(html).toContain('No history yet')
  })
})
