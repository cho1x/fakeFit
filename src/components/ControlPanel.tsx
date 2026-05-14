import * as React from "react"
import {
  ActivityIcon as Activity,
  ArrowCounterClockwiseIcon as RotateCcw,
  CaretDownIcon as ChevronDownIcon,
  DownloadSimpleIcon as Download,
  GaugeIcon as Gauge,
  PlusIcon as Plus,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { formatPace } from "@/lib/activity"
import type {
  ActivityPreview,
  ActivitySample,
  ExportPlan,
} from "@/types/activity"

type ControlPanelProps = {
  hrRest: number
  hrMax: number
  lapCount: number
  exportPlans: ExportPlan[]
  distanceLabel: string
  message: { text: string; type: "info" | "error" }
  preview: ActivityPreview | null
  liveSample?: ActivitySample
  onHrRestChange: (value: number) => void
  onHrMaxChange: (value: number) => void
  onLapCountChange: (value: number) => void
  onExportCountChange: (value: number) => void
  onExportPlanChange: (id: string, patch: Partial<ExportPlan>) => void
  onPreview: () => void
  onGenerate: () => void
}

function durationLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

function pad2(value: number) {
  return value.toString().padStart(2, "0")
}

function datePartFromLocalValue(value: string) {
  return value.split("T")[0] || ""
}

function timePartFromLocalValue(value: string) {
  const time = value.split("T")[1] || ""
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time
  if (/^\d{2}:\d{2}$/.test(time)) return `${time}:00`

  return "00:00:00"
}

function dateFromLocalDatePart(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined

  return new Date(year, month - 1, day)
}

function formatDatePart(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function formatDateLabel(value: string) {
  const date = dateFromLocalDatePart(datePartFromLocalValue(value))
  if (!date) return "选择日期"

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function combineDateAndTime(
  currentValue: string,
  patch: { date?: Date; time?: string }
) {
  const datePart = patch.date
    ? formatDatePart(patch.date)
    : datePartFromLocalValue(currentValue)
  const timePart = patch.time ?? timePartFromLocalValue(currentValue)

  return `${datePart}T${timePart}`
}

type ExportPlanRowProps = {
  index: number
  plan: ExportPlan
  onExportPlanChange: (id: string, patch: Partial<ExportPlan>) => void
}

function ExportPlanRow({
  index,
  plan,
  onExportPlanChange,
}: ExportPlanRowProps) {
  const [open, setOpen] = React.useState(false)
  const selectedDate = dateFromLocalDatePart(
    datePartFromLocalValue(plan.startTime)
  )

  return (
    <FieldGroup className="grid grid-cols-[2rem_minmax(7rem,1fr)_7rem] items-end gap-2">
      <div className="pb-2 text-xs font-medium text-muted-foreground">
        #{index + 1}
      </div>
      <Field>
        <FieldLabel htmlFor={`date-${plan.id}`}>日期</FieldLabel>
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger asChild>
            <Button
              className={cn(
                "justify-between text-left font-normal",
                !datePartFromLocalValue(plan.startTime) &&
                  "text-muted-foreground"
              )}
              id={`date-${plan.id}`}
              type="button"
              variant="outline"
            >
              <span className="truncate">
                {formatDateLabel(plan.startTime)}
              </span>
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto overflow-hidden p-0">
            <Calendar
              captionLayout="dropdown"
              defaultMonth={selectedDate}
              mode="single"
              onSelect={(date) => {
                if (!date) return
                onExportPlanChange(plan.id, {
                  startTime: combineDateAndTime(plan.startTime, { date }),
                })
                setOpen(false)
              }}
              selected={selectedDate}
            />
          </PopoverContent>
        </Popover>
      </Field>
      <Field>
        <FieldLabel htmlFor={`time-${plan.id}`}>时间</FieldLabel>
        <Input
          className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          id={`time-${plan.id}`}
          onChange={(event) =>
            onExportPlanChange(plan.id, {
              startTime: combineDateAndTime(plan.startTime, {
                time: event.target.value,
              }),
            })
          }
          step="1"
          type="time"
          value={timePartFromLocalValue(plan.startTime)}
        />
      </Field>
    </FieldGroup>
  )
}

export function ControlPanel({
  hrRest,
  hrMax,
  lapCount,
  exportPlans,
  distanceLabel,
  message,
  preview,
  liveSample,
  onHrRestChange,
  onHrMaxChange,
  onLapCountChange,
  onExportCountChange,
  onExportPlanChange,
  onPreview,
  onGenerate,
}: ControlPanelProps) {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r bg-background lg:w-[420px]">
      <div className="border-b px-5 py-4">
        <h1 className="text-lg font-semibold tracking-normal text-foreground">
          FIT 轨迹生成工具
        </h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="grid gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>运动参数</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="hrRest">静息心率</FieldLabel>
                  <Input
                    id="hrRest"
                    max={120}
                    min={30}
                    onChange={(event) =>
                      onHrRestChange(Number(event.target.value))
                    }
                    type="number"
                    value={hrRest}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="hrMax">最大心率</FieldLabel>
                  <Input
                    id="hrMax"
                    max={220}
                    min={100}
                    onChange={(event) =>
                      onHrMaxChange(Number(event.target.value))
                    }
                    type="number"
                    value={hrMax}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="lapCount">圈数</FieldLabel>
                  <Input
                    id="lapCount"
                    min={1}
                    onChange={(event) =>
                      onLapCountChange(Number(event.target.value))
                    }
                    type="number"
                    value={lapCount}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="exportCount">导出份数</FieldLabel>
                  <Input
                    id="exportCount"
                    max={10}
                    min={1}
                    onChange={(event) =>
                      onExportCountChange(Number(event.target.value))
                    }
                    type="number"
                    value={exportPlans.length}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>导出设置</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {exportPlans.map((plan, index) => (
                <ExportPlanRow
                  index={index}
                  key={plan.id}
                  onExportPlanChange={onExportPlanChange}
                  plan={plan}
                />
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-2">
            <Button onClick={onPreview} type="button" variant="secondary">
              <Gauge />
              预览曲线
            </Button>
            <Button onClick={onGenerate} type="button">
              <Download />
              生成 FIT 文件
            </Button>
          </div>

          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10">
            {distanceLabel}
          </div>

          {message.text ? (
            <div
              className={
                message.type === "error"
                  ? "rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive ring-1 ring-destructive/20"
                  : "rounded-lg bg-card px-3 py-2 text-sm text-card-foreground ring-1 ring-foreground/10"
              }
            >
              {message.text}
            </div>
          ) : null}

          {preview ? (
            <div className="grid gap-3 rounded-lg bg-card px-3 py-3 text-sm ring-1 ring-foreground/10">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">总距离</span>
                <strong>
                  {(preview.totalDistanceMeters / 1000).toFixed(2)} 公里
                </strong>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">总时间</span>
                <strong>{durationLabel(preview.totalDurationSec)}</strong>
              </div>
            </div>
          ) : null}

          {liveSample ? (
            <div className="grid gap-2 rounded-lg bg-card px-3 py-3 text-sm ring-1 ring-foreground/10">
              <div className="flex items-center gap-2 font-medium">
                <Activity className="size-4 text-primary" />
                回放
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>{durationLabel(liveSample.timeSec)}</span>
                <span>{formatPace(liveSample.speed)}</span>
                <span>{liveSample.heartRate} bpm</span>
              </div>
            </div>
          ) : (
            <div className="ring-dashed flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-muted-foreground ring-1 ring-foreground/15">
              <RotateCcw className="size-4" />
              生成预览后开始回放
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Plus className="size-3.5" />
            地图点击追加轨迹点，右键或 Ctrl+Z 可撤回，路线会在导出时自动闭合。
          </div>
        </div>
      </div>
    </aside>
  )
}
