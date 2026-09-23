import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatDuration,
  formatDuration2,
  formatFullDate,
  formatNumber,
  formatShortDuration,
  formatTrackDuration,
} from './formatters'

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toEqual('0 Bytes')
    expect(formatBytes(1000)).toEqual('1000 Bytes')
    expect(formatBytes(1024)).toEqual('1 KB')
    expect(formatBytes(1024 * 1024)).toEqual('1 MB')
    expect(formatBytes(1024 ** 3)).toEqual('1 GB')
    expect(formatBytes(1024 ** 4)).toEqual('1 TB')
  })
})

const day = 86400
const hour = 3600
const minute = 60

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(0)).toEqual('00:00')
    expect(formatDuration(59)).toEqual('00:59')
    expect(formatDuration(59.99)).toEqual('01:00')
  })
  it('formats days, hours and minutes', () => {
    expect(formatDuration(hour + minute + 1)).toEqual('01:01:01')
    expect(formatDuration(3 * day + 3 * hour + 7 * minute)).toEqual('3:03:07:00')
    expect(formatDuration(day)).toEqual('1:00:00:00')
    expect(formatDuration(day + minute + 0.6)).toEqual('1:00:01:01')
  })
})

describe('formatTrackDuration', () => {
  it('drops the leading zero on minutes', () => {
    expect(formatTrackDuration(0)).toEqual('0:00')
    expect(formatTrackDuration(128)).toEqual('2:08')
    expect(formatTrackDuration(hour + 2 * minute + 3)).toEqual('1:02:03')
  })
  it('renders a placeholder for unknown lengths', () => {
    expect(formatTrackDuration(undefined)).toEqual('–:––')
    expect(formatTrackDuration(Infinity)).toEqual('–:––')
  })
})

describe('formatShortDuration', () => {
  const toNs = (s: number) => s * 1e9
  it('formats sub-second, seconds, minutes and hours', () => {
    expect(formatShortDuration(toNs(0.5))).toEqual('<1s')
    expect(formatShortDuration(toNs(59))).toEqual('59s')
    expect(formatShortDuration(toNs(90))).toEqual('1m30s')
    expect(formatShortDuration(toNs(3600 + 30 * 60))).toEqual('1h30m')
  })
})

describe('formatDuration2', () => {
  it('handles null, negative and zero', () => {
    expect(formatDuration2(null)).toEqual('0s')
    expect(formatDuration2(-10)).toEqual('0s')
    expect(formatDuration2(0)).toEqual('0s')
  })
  it('formats compound durations', () => {
    expect(formatDuration2(90)).toEqual('1m 30s')
    expect(formatDuration2(3661)).toEqual('1h 1m 1s')
    expect(formatDuration2(59.9)).toEqual('59s')
  })
  it('drops seconds once days are present', () => {
    expect(formatDuration2(86461)).toEqual('1d 1m')
    expect(formatDuration2(176461)).toEqual('2d 1h 1m')
  })
})

describe('formatNumber', () => {
  it('formats numbers with grouping', () => {
    expect(formatNumber(null, 'en-CA')).toEqual('0')
    expect(formatNumber(1234567, 'en-CA')).toEqual('1,234,567')
    expect(formatNumber(-123.45, 'en-CA')).toEqual('-123.45')
  })
})

describe('formatFullDate', () => {
  it('formats partial dates at their own precision', () => {
    expect(formatFullDate('2011', 'en-CA')).toEqual('2011')
    expect(formatFullDate('2011-06', 'en-CA')).toEqual('Jun 2011')
    expect(formatFullDate('1985-01-01', 'en-CA')).toEqual('Jan 1, 1985')
    expect(formatFullDate('199704')).toEqual('')
  })
})
