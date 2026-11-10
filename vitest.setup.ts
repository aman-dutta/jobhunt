import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Import Supabase mocks to set them up globally
import './src/test/mocks/supabase'

// Mock Logo.dev API key to prevent environment warnings
process.env.NEXT_PUBLIC_LOGO_DEV_KEY = 'test-logo-dev-api-key'

// Mock ResizeObserver globally for all tests
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserver

// Mock localStorage if missing or experimental in Node 22+
if (typeof window !== 'undefined') {
  const store: Record<string, string> = {}
  if (typeof global.Storage !== 'undefined') {
    global.Storage.prototype.getItem = vi.fn((key: string) => store[key] ?? null)
    global.Storage.prototype.setItem = vi.fn((key: string, val: string) => {
      store[key] = String(val)
    })
    global.Storage.prototype.removeItem = vi.fn((key: string) => {
      delete store[key]
    })
    global.Storage.prototype.clear = vi.fn(() => {
      for (const k in store) delete store[k]
    })
    global.Storage.prototype.key = vi.fn(() => null)
    Object.defineProperty(window, 'localStorage', {
      value: Object.create(global.Storage.prototype),
      writable: true,
      configurable: true,
    })
  }
}

expect.extend(matchers)

afterEach(() => {
  cleanup()
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear()
  }
  if (typeof document !== 'undefined') {
    document.documentElement.className = ''
  }
  vi.clearAllMocks()
})
