import type {
  ActivityInput,
  ActivityPreview,
  ActivitySample,
  RoutePoint,
} from "@/types/activity"

const EARTH_RADIUS_METERS = 6_371_000

function toRad(value: number) {
  return (value * Math.PI) / 180
}

export function toSemicircles(deg: number) {
  return Math.round((deg * 2_147_483_648) / 180)
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_METERS * c
}

export function computeDistanceMeters(points: RoutePoint[]) {
  if (points.length < 2) return 0

  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    total += haversineDistance(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    )
  }

  return total
}

function offsetPointMeters(
  point: RoutePoint,
  offsetLatMeters: number,
  offsetLonMeters: number
) {
  const metersPerDegLat = 111_320
  const metersPerDegLon = 111_320 * Math.cos(toRad(point.lat))

  return {
    lat: point.lat + offsetLatMeters / metersPerDegLat,
    lng: point.lng + offsetLonMeters / metersPerDegLon,
  }
}

export function buildClosedBasePoints(points: RoutePoint[]) {
  if (points.length < 2) return points

  const first = points[0]
  const last = points[points.length - 1]
  const distanceToStart = haversineDistance(
    first.lat,
    first.lng,
    last.lat,
    last.lng
  )

  if (distanceToStart < 5) return points

  return [...points, { lat: first.lat, lng: first.lng }]
}

function buildLapPoints(
  points: RoutePoint[],
  lapCount: number,
  withLapNoise: boolean
) {
  const basePoints = buildClosedBasePoints(points)
  const laps = Math.max(1, Math.floor(lapCount))
  const allPoints: RoutePoint[] = []

  for (let lapIndex = 0; lapIndex < laps; lapIndex += 1) {
    const radiusMeters = 5 + Math.random() * 10
    const angle = Math.random() * Math.PI * 2
    const offsetLatMeters = radiusMeters * Math.cos(angle)
    const offsetLonMeters = radiusMeters * Math.sin(angle)

    for (const point of basePoints) {
      const nextPoint = withLapNoise
        ? offsetPointMeters(point, offsetLatMeters, offsetLonMeters)
        : point

      allPoints.push(nextPoint)
    }
  }

  return allPoints
}

function computeSamples(
  allPoints: RoutePoint[],
  distances: number[],
  totalDist: number,
  paceSecondsPerKm: number,
  hrRest: number,
  hrMax: number
) {
  const totalDistanceKm = totalDist / 1000
  const targetDurationSec = totalDistanceKm * paceSecondsPerKm
  const avgSpeedTarget = totalDist / targetDurationSec
  const baseSpeedFactor = 0.98 + Math.random() * 0.06
  const phase1 = Math.random() * Math.PI * 2
  const phase2 = Math.random() * Math.PI * 2
  const instSpeedRaw = new Array<number>(allPoints.length)
  const hrValues = new Array<number>(allPoints.length)
  let currentHr = hrRest

  for (let i = 0; i < allPoints.length; i += 1) {
    const frac = distances[i] / totalDist
    const longWave = 0.04 * Math.sin(frac * Math.PI * 2 + phase1)
    const shortWave = 0.02 * Math.sin(frac * Math.PI * 6 + phase2)
    const speedRaw =
      avgSpeedTarget * baseSpeedFactor * (1 + longWave + shortWave)
    instSpeedRaw[i] = speedRaw

    const effort = Math.min(1, Math.max(0, speedRaw / (avgSpeedTarget || 1e-6)))
    let intensityBase: number

    if (frac < 0.1) {
      intensityBase = 0.4 + 0.4 * (frac / 0.1)
    } else if (frac < 0.8) {
      const steadyFrac = (frac - 0.1) / 0.7
      intensityBase = 0.8 + 0.05 * Math.sin(steadyFrac * Math.PI * 2)
    } else {
      intensityBase = 0.85 + 0.1 * ((frac - 0.8) / 0.2)
    }

    const intensity = Math.min(
      1,
      Math.max(0, 0.7 * intensityBase + 0.3 * effort)
    )
    const hrTarget = hrRest + (hrMax - hrRest) * intensity
    currentHr += (hrTarget - currentHr) * 0.15
    const hrJitter = (Math.random() - 0.5) * 3
    hrValues[i] = Math.round(
      Math.min(hrMax, Math.max(hrRest, currentHr + hrJitter))
    )
  }

  const segmentDurations = new Array<number>(Math.max(0, allPoints.length - 1))
  let rawDuration = 0

  for (let i = 1; i < allPoints.length; i += 1) {
    const ds = distances[i] - distances[i - 1]
    const speed = instSpeedRaw[i] > 0 ? instSpeedRaw[i] : avgSpeedTarget
    const duration = ds / speed
    segmentDurations[i - 1] = duration
    rawDuration += duration
  }

  const scale = rawDuration > 0 ? targetDurationSec / rawDuration : 1
  const samples: ActivitySample[] = [
    {
      timeSec: 0,
      distance: distances[0],
      speed: instSpeedRaw[0] / scale,
      heartRate: hrValues[0],
      lat: allPoints[0].lat,
      lng: allPoints[0].lng,
    },
  ]

  let timeSec = 0
  for (let i = 1; i < allPoints.length; i += 1) {
    timeSec += segmentDurations[i - 1] * scale
    samples.push({
      timeSec,
      distance: distances[i],
      speed: instSpeedRaw[i] / scale,
      heartRate: hrValues[i],
      lat: allPoints[i].lat,
      lng: allPoints[i].lng,
    })
  }

  return {
    samples,
    totalDurationSec: samples.at(-1)?.timeSec ?? targetDurationSec,
  }
}

export function buildActivityPreview(
  input: Pick<
    ActivityInput,
    "points" | "paceSecondsPerKm" | "hrRest" | "hrMax" | "lapCount"
  >,
  options: { withLapNoise?: boolean } = {}
): ActivityPreview {
  if (input.points.length < 2) {
    throw new Error("请至少在地图上选择两个点形成轨迹")
  }

  const allPoints = buildLapPoints(
    input.points,
    input.lapCount,
    Boolean(options.withLapNoise)
  )
  const distances = [0]
  let totalDistanceMeters = 0

  for (let i = 1; i < allPoints.length; i += 1) {
    totalDistanceMeters += haversineDistance(
      allPoints[i - 1].lat,
      allPoints[i - 1].lng,
      allPoints[i].lat,
      allPoints[i].lng
    )
    distances.push(totalDistanceMeters)
  }

  if (totalDistanceMeters === 0) {
    throw new Error("轨迹距离为 0，请绘制更长的路线")
  }

  const pace = input.paceSecondsPerKm > 0 ? input.paceSecondsPerKm : 360
  const { samples, totalDurationSec } = computeSamples(
    allPoints,
    distances,
    totalDistanceMeters,
    pace,
    input.hrRest,
    input.hrMax
  )

  return {
    totalDistanceMeters,
    totalDurationSec,
    samples,
  }
}

export function formatPace(speedMetersPerSecond: number) {
  const safeSpeed = speedMetersPerSecond > 0 ? speedMetersPerSecond : 0.01
  const secPerKm = 1000 / safeSpeed
  const paceMin = Math.floor(secPerKm / 60)
  const paceSec = Math.round(secPerKm % 60)

  return `${paceMin}'${paceSec.toString().padStart(2, "0")}"/km`
}
