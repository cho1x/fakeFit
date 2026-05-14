export type RoutePoint = {
  lat: number
  lng: number
}

export type ActivitySample = RoutePoint & {
  timeSec: number
  distance: number
  speed: number
  heartRate: number
}

export type ActivityPreview = {
  totalDistanceMeters: number
  totalDurationSec: number
  samples: ActivitySample[]
}

export type ActivityInput = {
  startTime: Date
  points: RoutePoint[]
  paceSecondsPerKm: number
  hrRest: number
  hrMax: number
  lapCount: number
}

export type ExportPlan = {
  id: string
  startTime: string
  paceMin: number
  paceSec: number
}
