"use client"

import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext({ variant: "default", size: "default" })

function ToggleGroup({ className, variant, size, children, ...props }) {
  return (
    <ToggleGroupPrimitive.Root data-slot="toggle-group" className={cn("flex items-center", className)} {...props}>
      <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({ className, variant, size, ...props }) {
  const context = React.useContext(ToggleGroupContext)
  return <ToggleGroupPrimitive.Item data-slot="toggle-group-item" className={cn(toggleVariants({ variant: variant || context.variant, size: size || context.size }), className)} {...props}/>
}

export { ToggleGroup, ToggleGroupItem }
