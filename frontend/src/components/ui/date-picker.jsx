import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePicker({ date, setDate, placeholder = "Pick a date" }) {
  // Handle string dates coming from backend (ISO strings)
  const selectedDate = date ? new Date(date) : undefined;

  const handleSelect = (d) => {
     // Convert Date object back to ISO string (YYYY-MM-DD) for the parent form
     if (d) {
        // Adjust for timezone offset to avoid "day before" bug
        const offset = d.getTimezoneOffset()
        const adjustedDate = new Date(d.getTime() - (offset*60*1000))
        setDate(adjustedDate.toISOString().split('T')[0]);
     } else {
        setDate('');
     }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}