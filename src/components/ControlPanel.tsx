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
        <div className="flex items-center justify-between gap-2">

          <h1 className="text-lg font-semibold tracking-normal text-foreground">
            FIT 数据生成工具
          </h1>
          <Button
            aria-label="Open GitHub repository"
            asChild
            size="icon"
            title="GitHub"
            type="button"
            className="rounded-full"
            variant="ghost"
          >
            <a
              href="https://github.com/cho1x/fakeFit"
              rel="noreferrer"
              target="_blank"
            >
              <svg width="99" height="96" viewBox="0 0 98 96" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clip-path="url(#clip0_730_27126)">
              <path d="M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z" fill="black"/>
              </g>
              <defs>
              <clipPath id="clip0_730_27126">
              <rect width="98" height="96" fill="white"/>
              </clipPath>
              </defs>
              </svg>
            </a>
          </Button>
        </div>
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
