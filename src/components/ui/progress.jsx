"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Progress({ className, value, ...props }) {
  const percent = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full bg-primary transition-[width]"
        style={{ width: `${percent}%` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
