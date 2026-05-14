import { useEffect, useRef } from "react"
import {
  ArrowCounterClockwiseIcon as RotateCcw,
  CrosshairIcon as LocateFixed,
  TrashIcon as Trash2,
} from "@phosphor-icons/react"
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet"

import { Button } from "@/components/ui/button"
import type { ActivitySample, RoutePoint } from "@/types/activity"

type RouteMapProps = {
  points: RoutePoint[]
  previewPoint?: ActivitySample
  currentLocation: RoutePoint | null
  isLocating: boolean
  onAddPoint: (point: RoutePoint) => void
  onUndoLastPoint: () => void
  onClear: () => void
  onLocate: () => void
}

function MapInteractionHandler({
  onAddPoint,
  onUndoLastPoint,
}: Pick<RouteMapProps, "onAddPoint" | "onUndoLastPoint">) {
  useMapEvents({
    click: (event) => {
      onAddPoint({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
    contextmenu: (event) => {
      event.originalEvent.preventDefault()
      onUndoLastPoint()
    },
  })

  return null
}

function LocationFocus({ location }: { location: RoutePoint | null }) {
  const map = useMap()

  useEffect(() => {
    if (!location) return

    map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 16), {
      duration: 0.7,
    })
  }, [location, map])

  return null
}

function InitialRouteFocus({ points }: { points: RoutePoint[] }) {
  const map = useMap()
  const hasFocusedRef = useRef(false)

  useEffect(() => {
    if (hasFocusedRef.current || !points.length) return

    hasFocusedRef.current = true

    if (points.length === 1) {
      const [point] = points
      map.setView([point.lat, point.lng], Math.max(map.getZoom(), 15), {
        animate: false,
      })
      return
    }

    map.fitBounds(
      points.map((point) => [point.lat, point.lng]),
      {
        animate: false,
        maxZoom: 16,
        padding: [32, 32],
      }
    )
  }, [map, points])

  return null
}

export function RouteMap({
  points,
  previewPoint,
  currentLocation,
  isLocating,
  onAddPoint,
  onUndoLastPoint,
  onClear,
  onLocate,
}: RouteMapProps) {
  const hasRoute = points.length > 0

  return (
    <section className="relative h-full min-h-[420px] overflow-hidden bg-muted">
      <MapContainer
        center={[31.2304, 121.4737]}
        className="h-full w-full"
        scrollWheelZoom
        zoom={13}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          maxZoom={19}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapInteractionHandler
          onAddPoint={onAddPoint}
          onUndoLastPoint={onUndoLastPoint}
        />
        <InitialRouteFocus points={points} />
        <LocationFocus location={currentLocation} />
        {points.length > 1 ? (
          <Polyline
            positions={points.map((point) => [point.lat, point.lng])}
            pathOptions={{ color: "var(--destructive)", weight: 4 }}
          />
        ) : null}
        {points.map((point, index) => (
          <CircleMarker
            center={[point.lat, point.lng]}
            key={`${point.lat}-${point.lng}-${index}`}
            pathOptions={{
              color: index === 0 ? "var(--primary)" : "var(--destructive)",
              fillColor: index === 0 ? "var(--primary)" : "var(--destructive)",
              fillOpacity: 0.95,
            }}
            radius={index === 0 ? 6 : 4}
          />
        ))}
        {previewPoint ? (
          <CircleMarker
            center={[previewPoint.lat, previewPoint.lng]}
            pathOptions={{
              color: "var(--ring)",
              fillColor: "var(--ring)",
              fillOpacity: 1,
            }}
            radius={7}
          />
        ) : null}
        {currentLocation ? (
          <CircleMarker
            center={[currentLocation.lat, currentLocation.lng]}
            pathOptions={{
              color: "var(--primary)",
              fillColor: "var(--primary)",
              fillOpacity: 0.85,
            }}
            radius={8}
          />
        ) : null}
      </MapContainer>

      <div className="absolute top-4 right-4 z-[1000] flex gap-2">
        <Button
          aria-label="获取当前定位"
          className="bg-background/95 shadow-md backdrop-blur"
          disabled={isLocating}
          onClick={onLocate}
          title="获取当前定位"
          type="button"
          variant="secondary"
        >
          <LocateFixed />
          <span className="hidden sm:inline">
            {isLocating ? "定位中" : "定位"}
          </span>
        </Button>
        {hasRoute ? (
          <>
            <Button
              aria-label="撤回添加轨迹点"
              className="bg-background/95 shadow-md backdrop-blur"
              onClick={onUndoLastPoint}
              title="撤回添加轨迹点"
              type="button"
              variant="secondary"
            >
              <RotateCcw />
              <span className="hidden sm:inline">撤回</span>
            </Button>
            <Button
              aria-label="清除轨迹"
              className="bg-background/95 shadow-md backdrop-blur"
              onClick={onClear}
              title="清除轨迹"
              type="button"
              variant="secondary"
            >
              <Trash2 />
              <span className="hidden sm:inline">清除</span>
            </Button>
          </>
        ) : null}
      </div>
    </section>
  )
}
