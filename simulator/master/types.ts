export interface AnalyticsData {
  ip: string
  peerId: string
  message: string
  version: string
  network: string
  channel: string
  os: string
  storage: number
  // latest time (in utc) at which data is pushed
  timestamp: number
  status: string
}