import { useCallback, useEffect, useMemo, useState } from "react"

import { ControlPanel } from "@/components/ControlPanel"
import { PreviewCharts } from "@/components/PreviewCharts"
import { RouteMap } from "@/components/RouteMap"
import {
  buildActivityPreview,
  buildClosedBasePoints,
  computeDistanceMeters,
} from "@/lib/activity"
import { downloadBlob, generateFitFile } from "@/lib/fit"
import type { ActivityPreview, ExportPlan, RoutePoint } from "@/types/activity"

const MAX_EXPORT_COUNT = 10
const ROUTE_POINTS_STORAGE_KEY = "fit-generator:route-points"

function isRoutePoint(value: unknown): value is RoutePoint {
  if (!value || typeof value !== "object") return false

  const point = value as Partial<RoutePoint>

  return (
    typeof point.lat === "number" &&
    Number.isFinite(point.lat) &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lng)
  )
}

function loadStoredRoutePoints() {
  try {
    const raw = localStorage.getItem(ROUTE_POINTS_STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isRoutePoint)
  } catch {
    return []
  }
}

function toLocalInputValue(date: Date) {
  const tzOffset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - tzOffset * 60_000)

  return local.toISOString().slice(0, 16)
}

function addDaysToLocalInputValue(value: string, days: number) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  date.setDate(date.getDate() + days)

  return toLocalInputValue(date)
}

function createExportPlan(
  index: number,
  baseStartTime = toLocalInputValue(new Date())
): ExportPlan {
  const startTime = addDaysToLocalInputValue(baseStartTime, index)

  return {
    id: crypto.randomUUID(),
    startTime,
    paceMin: 6,
    paceSec: 0,
  }
}

function parsePaceSeconds(plan: ExportPlan) {
  const paceMin = Number.isFinite(plan.paceMin) ? plan.paceMin : 0
  const paceSec = Number.isFinite(plan.paceSec) ? plan.paceSec : 0

  return paceMin * 60 + paceSec
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min

  return Math.min(max, Math.max(min, Math.floor(value)))
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false

  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"]')
  )
}

export function App() {
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>(
    loadStoredRoutePoints
  )
  const [currentLocation, setCurrentLocation] = useState<RoutePoint | null>(
    null
  )
  const [isLocating, setIsLocating] = useState(false)
  const [hrRest, setHrRest] = useState(60)
  const [hrMax, setHrMax] = useState(180)
  const [lapCount, setLapCount] = useState(1)
  const [exportPlans, setExportPlans] = useState<ExportPlan[]>(() => [
    createExportPlan(0),
  ])
  const [preview, setPreview] = useState<ActivityPreview | null>(null)
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const [message, setMessage] = useState<{
    text: string
    type: "info" | "error"
  }>({
    text: "",
    type: "info",
  })

  const addRoutePoint = useCallback((point: RoutePoint) => {
    setRoutePoints((current) => [...current, point])
    setPreview(null)
    setPlaybackIndex(0)
    setMessage({ text: "轨迹点已添加", type: "info" })
  }, [])

  const clearRoute = useCallback(() => {
    setRoutePoints([])
    setPreview(null)
    setPlaybackIndex(0)
    setMessage({ text: "轨迹已清除", type: "info" })
  }, [])

  const undoLastRoutePoint = useCallback(() => {
    setRoutePoints((current) => {
      if (!current.length) {
        setMessage({ text: "没有可撤回的轨迹点", type: "info" })
        return current
      }

      const next = current.slice(0, -1)
      setPreview(null)
      setPlaybackIndex(0)
      setMessage({
        text: next.length
          ? `已撤回 1 个轨迹点，剩余 ${next.length} 个`
          : "已撤回最后一个轨迹点",
        type: "info",
      })

      return next
    })
  }, [])

  const locateCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage({ text: "当前浏览器不支持定位", type: "error" })
      return
    }

    setIsLocating(true)
    setMessage({ text: "正在获取当前位置...", type: "info" })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setCurrentLocation(nextLocation)
        setIsLocating(false)
        setMessage({ text: "已定位到当前位置", type: "info" })
      },
      (error) => {
        setIsLocating(false)
        setMessage({
          text: error.message || "获取当前位置失败，请检查浏览器定位权限",
          type: "error",
        })
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 10_000,
      }
    )
  }, [])

  const updateExportCount = useCallback((value: number) => {
    const count = clampInteger(value, 1, MAX_EXPORT_COUNT)
    setExportPlans((current) => {
      if (count === current.length) return current
      if (count < current.length) return current.slice(0, count)

      const baseStartTime =
        current[0]?.startTime ?? toLocalInputValue(new Date())
      return [
        ...current,
        ...Array.from({ length: count - current.length }, (_, index) =>
          createExportPlan(current.length + index, baseStartTime)
        ),
      ]
    })
  }, [])

  const updateExportPlan = useCallback(
    (id: string, patch: Partial<ExportPlan>) => {
      setExportPlans((current) =>
        current.map((plan) => (plan.id === id ? { ...plan, ...patch } : plan))
      )
    },
    []
  )

  const distanceLabel = useMemo(() => {
    if (routePoints.length < 2) return "总距离约：0 公里"

    const baseMeters = computeDistanceMeters(buildClosedBasePoints(routePoints))
    const totalMeters = baseMeters * Math.max(1, lapCount)
    const baseKm = (baseMeters / 1000).toFixed(2)
    const totalKm = (totalMeters / 1000).toFixed(2)

    return lapCount > 1
      ? `总距离约：${totalKm} 公里（基础闭合路线 ${baseKm} 公里 × ${lapCount} 圈）`
      : `总距离约：${baseKm} 公里`
  }, [lapCount, routePoints])

  const liveSample = preview?.samples[playbackIndex]

  useEffect(() => {
    localStorage.setItem(ROUTE_POINTS_STORAGE_KEY, JSON.stringify(routePoints))
  }, [routePoints])

  useEffect(() => {
    if (!preview?.samples.length) return undefined

    const timer = window.setInterval(() => {
      setPlaybackIndex((current) => {
        if (current >= preview.samples.length - 1) {
          window.clearInterval(timer)
          return current
        }

        return current + 1
      })
    }, 100)

    return () => window.clearInterval(timer)
  }, [preview])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z")
        return
      if (event.shiftKey || isEditableTarget(event.target)) return

      event.preventDefault()
      undoLastRoutePoint()
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [undoLastRoutePoint])

  const buildPreviewFromFirstPlan = useCallback(() => {
    const plan = exportPlans[0]
    const startTime = new Date(plan.startTime)
    const paceSecondsPerKm = parsePaceSeconds(plan)

    if (Number.isNaN(startTime.getTime())) {
      throw new Error("预览使用的开始时间无效")
    }
    if (paceSecondsPerKm <= 0) {
      throw new Error("预览使用的配速无效")
    }

    return buildActivityPreview({
      points: routePoints,
      paceSecondsPerKm,
      hrRest,
      hrMax,
      lapCount,
    })
  }, [exportPlans, hrMax, hrRest, lapCount, routePoints])

  const previewActivity = useCallback(() => {
    try {
      const nextPreview = buildPreviewFromFirstPlan()
      setPreview(nextPreview)
      setPlaybackIndex(0)
      setMessage({
        text: `预览已生成，总距离约 ${(nextPreview.totalDistanceMeters / 1000).toFixed(2)} 公里`,
        type: "info",
      })
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "预览失败",
        type: "error",
      })
    }
  }, [buildPreviewFromFirstPlan])

  const generateFits = useCallback(async () => {
    try {
      if (routePoints.length < 2) {
        throw new Error("请至少在地图上选择两个点形成轨迹")
      }

      setMessage({ text: "正在生成 FIT 文件...", type: "info" })

      for (let index = 0; index < exportPlans.length; index += 1) {
        const plan = exportPlans[index]
        const startTime = new Date(plan.startTime)
        const paceSecondsPerKm = parsePaceSeconds(plan)

        if (Number.isNaN(startTime.getTime())) {
          throw new Error(`第 ${index + 1} 份的开始时间无效`)
        }
        if (paceSecondsPerKm <= 0) {
          throw new Error(`第 ${index + 1} 份的配速无效`)
        }

        const { blob } = await generateFitFile({
          startTime,
          points: routePoints,
          paceSecondsPerKm,
          hrRest,
          hrMax,
          lapCount,
        })

        downloadBlob(
          blob,
          exportPlans.length > 1 ? `run_${index + 1}.fit` : "run.fit"
        )
      }

      setMessage({
        text: `已生成 ${exportPlans.length} 个 FIT 文件并开始下载`,
        type: "info",
      })
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "生成 FIT 文件失败",
        type: "error",
      })
    }
  }, [exportPlans, hrMax, hrRest, lapCount, routePoints])

  return (
    <main className="h-dvh min-h-[720px] bg-background text-foreground lg:min-h-0">
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(420px,1fr)] lg:grid-cols-[420px_minmax(0,1fr)] lg:grid-rows-1">
        <ControlPanel
          distanceLabel={distanceLabel}
          exportPlans={exportPlans}
          hrMax={hrMax}
          hrRest={hrRest}
          lapCount={lapCount}
          liveSample={liveSample}
          message={message}
          onExportCountChange={updateExportCount}
          onExportPlanChange={updateExportPlan}
          onGenerate={generateFits}
          onHrMaxChange={(value) => setHrMax(clampInteger(value, 100, 220))}
          onHrRestChange={(value) => setHrRest(clampInteger(value, 30, 120))}
          onLapCountChange={(value) => setLapCount(clampInteger(value, 1, 999))}
          onPreview={previewActivity}
          preview={preview}
        />

        <div className="grid min-h-0 grid-rows-[minmax(360px,1fr)_auto]">
          <RouteMap
            currentLocation={currentLocation}
            isLocating={isLocating}
            onAddPoint={addRoutePoint}
            onClear={clearRoute}
            onLocate={locateCurrentPosition}
            onUndoLastPoint={undoLastRoutePoint}
            points={routePoints}
            previewPoint={liveSample}
          />
          <section className="border-t bg-background p-3">
            <PreviewCharts preview={preview} />
          </section>
        </div>
      </div>
    </main>
  )
}

export default App
