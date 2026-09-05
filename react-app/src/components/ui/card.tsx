import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-xl border border-line bg-surface shadow-crisp",
        className,
      )}
      {...props}
    />
  )
}

export { Card }
