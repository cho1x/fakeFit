import { buildActivityPreview, toSemicircles } from "@/lib/activity"
import type { ActivityInput } from "@/types/activity"

export async function generateFitFile(input: ActivityInput) {
  const { Encoder, Profile } = await import("@garmin/fitsdk")
  const preview = buildActivityPreview(input, { withLapNoise: true })
  const encoder = new Encoder()

  encoder.onMesg(Profile.MesgNum.FILE_ID, {
    manufacturer: "development",
    product: 1,
    timeCreated: input.startTime,
    type: "activity",
  })

  encoder.onMesg(Profile.MesgNum.DEVICE_INFO, {
    timestamp: input.startTime,
    manufacturer: "development",
    product: 1,
    serialNumber: 1,
  })

  const sessionEnd = new Date(
    input.startTime.getTime() + preview.totalDurationSec * 1000
  )
  const avgSpeed = preview.totalDistanceMeters / preview.totalDurationSec

  encoder.onMesg(Profile.MesgNum.SESSION, {
    timestamp: sessionEnd,
    startTime: input.startTime,
    totalElapsedTime: preview.totalDurationSec,
    totalTimerTime: preview.totalDurationSec,
    totalDistance: preview.totalDistanceMeters,
    sport: "running",
    subSport: "generic",
    avgSpeed,
  })

  encoder.onMesg(Profile.MesgNum.ACTIVITY, {
    timestamp: sessionEnd,
    totalTimerTime: preview.totalDurationSec,
    numSessions: 1,
    type: "manual",
  })

  for (const sample of preview.samples) {
    encoder.onMesg(Profile.MesgNum.RECORD, {
      timestamp: new Date(input.startTime.getTime() + sample.timeSec * 1000),
      positionLat: toSemicircles(sample.lat),
      positionLong: toSemicircles(sample.lng),
      distance: sample.distance,
      speed: sample.speed,
      heartRate: sample.heartRate,
    })
  }

  const bytes = Uint8Array.from(encoder.close())

  return {
    preview,
    blob: new Blob([bytes], { type: "application/vnd.ant.fit" }),
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
