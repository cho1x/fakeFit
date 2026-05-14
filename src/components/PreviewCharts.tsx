import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPace } from "@/lib/activity"
import type { ActivityPreview } from "@/types/activity"

type PreviewChartsProps = {
  preview: ActivityPreview | null
}

export function PreviewCharts({ preview }: PreviewChartsProps) {
  const data =
    preview?.samples.map((sample) => {
      const safeSpeed = sample.speed > 0 ? sample.speed : 0.01

      return {
        minute: Number((sample.timeSec / 60).toFixed(1)),
        pace: Number((1000 / safeSpeed / 60).toFixed(2)),
        heartRate: sample.heartRate,
        distanceKm: Number((sample.distance / 1000).toFixed(2)),
        paceLabel: formatPace(sample.speed),
      }
    }) ?? []

  return (
    <div className="grid min-h-0 gap-3 lg:grid-cols-2">
      <Card className="min-h-[180px]" size="sm">
        <CardHeader className="pb-2">
          <CardTitle>配速预览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[132px]">
            {data.length ? (
              <ResponsiveContainer height="100%" width="100%">
                <LineChart
                  data={data}
                  margin={{ bottom: 4, left: -18, right: 10, top: 6 }}
                >
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="minute"
                    fontSize={11}
                    tickLine={false}
                    unit="m"
                  />
                  <YAxis
                    domain={["dataMin - 0.2", "dataMax + 0.2"]}
                    fontSize={11}
                    reversed
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(_, __, item) => [
                      item.payload.paceLabel,
                      "配速",
                    ]}
                    labelFormatter={(label) => `时间 ${label} 分钟`}
                  />
                  <Line
                    dataKey="pace"
                    dot={false}
                    isAnimationActive={false}
                    stroke="var(--primary)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                暂无预览
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-[180px]" size="sm">
        <CardHeader className="pb-2">
          <CardTitle>心率预览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[132px]">
            {data.length ? (
              <ResponsiveContainer height="100%" width="100%">
                <LineChart
                  data={data}
                  margin={{ bottom: 4, left: -14, right: 10, top: 6 }}
                >
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="minute"
                    fontSize={11}
                    tickLine={false}
                    unit="m"
                  />
                  <YAxis fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(value) => [`${value} bpm`, "心率"]}
                    labelFormatter={(label) => `时间 ${label} 分钟`}
                  />
                  <Line
                    dataKey="heartRate"
                    dot={false}
                    isAnimationActive={false}
                    stroke="var(--destructive)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                暂无预览
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
