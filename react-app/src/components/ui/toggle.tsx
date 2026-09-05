import { cn } from "@/lib/utils"

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-full transition-colors duration-150",
        checked ? "bg-surface-dark" : "bg-line",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform duration-150",
          checked ? "translate-x-[22px]" : "translate-x-[3px]",
        )}
      />
    </button>
  )
}

export { Toggle }
