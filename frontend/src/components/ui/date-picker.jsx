import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function DatePicker({ date, setDate, className, placeholder }) {
  return (
    <div className="relative w-full">
      <Input
        type="date"
        value={date || ''}
        onChange={(e) => setDate(e.target.value)}
        className={cn(
          "w-full block",
          !date && "text-muted-foreground", // Greys out text if empty, similar to placeholder
          className
        )}
      />
    </div>
  )
}