/// <reference types="vite/client" />
import type { ApiProjectControl } from '../../shared/types'

declare global {
  interface Window {
    api: ApiProjectControl
  }
}
export {}
