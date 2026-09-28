import { CheckCircle2, Circle, CornerDownLeft, Search, Waypoints } from "lucide-react"
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"

import { NAV_ITEMS } from "@/lib/nav"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface PaletteItem {
  id: string
  group: "Pages" | "Roadmaps" | "Tasks"
  label: string
  hint?: string
  icon: ReactNode
  to: string
}

const MAX_PER_GROUP = 6

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { state } = useStore()
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    setQuery("")
    setActive(0)
    // Focus after the portal mounts.
    const id = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
  }, [open])

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase()
    const matches = (text: string) => !q || text.toLowerCase().includes(q)
    const roadmapName = (id: string) => state.roadmaps.find((r) => r.id === id)?.name ?? ""

    const pages: PaletteItem[] = NAV_ITEMS.filter((n) => matches(n.label)).map((n) => {
      const Icon = n.icon
      return {
        id: `page:${n.to}`,
        group: "Pages",
        label: n.label,
        icon: <Icon className="size-4" aria-hidden />,
        to: n.to,
      }
    })

    const roadmaps: PaletteItem[] = state.roadmaps
      .filter((r) => matches(r.name) || matches(r.description))
      .slice(0, MAX_PER_GROUP)
      .map((r) => ({
        id: `roadmap:${r.id}`,
        group: "Roadmaps",
        label: r.name,
        icon: <Waypoints className="size-4" aria-hidden />,
        to: `/roadmap/${r.id}`,
      }))

    // Tasks only show up once you type, otherwise the list is just noise.
    const tasks: PaletteItem[] = q
      ? state.tasks
          .filter((t) => matches(t.title))
          .slice(0, MAX_PER_GROUP)
          .map((t) => ({
            id: `task:${t.id}`,
            group: "Tasks",
            label: t.title,
            hint: roadmapName(t.roadmapId),
            icon: t.done ? (
              <CheckCircle2 className="size-4 text-sage-text" aria-hidden />
            ) : (
              <Circle className="size-4" aria-hidden />
            ),
            to: `/roadmap/${t.roadmapId}?task=${t.id}`,
          }))
      : []

    return [...pages, ...roadmaps, ...tasks]
  }, [query, state.roadmaps, state.tasks])

  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, items.length - 1)))
  }, [items.length])

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [active])

  if (!open) return null

  const go = (item: PaletteItem | undefined) => {
    if (!item) return
    onClose()
    navigate(item.to)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => (items.length ? (i + 1) % items.length : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      go(items[active])
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }

  let lastGroup: string | null = null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-surface-dark/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            placeholder="Search pages, roadmaps, and tasks"
            aria-label="Search pages, roadmaps, and tasks"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
            className="h-12 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-muted/70"
          />
          <kbd className="rounded-md border border-line bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
            Esc
          </kbd>
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-ink-muted">
            Nothing matches “{query.trim()}”.
          </p>
        ) : (
          <ul ref={listRef} id={listId} role="listbox" className="scrollbar-thin overflow-y-auto p-2">
            {items.map((item, i) => {
              const header = item.group !== lastGroup ? item.group : null
              lastGroup = item.group
              return (
                <li key={item.id} role="presentation">
                  {header && (
                    <p className="px-2 pt-2 pb-1 text-[11px] font-semibold text-ink-muted">{header}</p>
                  )}
                  <div
                    id={`${listId}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(item)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-[13px] text-ink",
                      i === active && "bg-surface-muted",
                    )}
                  >
                    <span className="text-ink-muted">{item.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.hint && (
                      <span className="max-w-[40%] truncate text-[11.5px] text-ink-muted">{item.hint}</span>
                    )}
                    {i === active && <CornerDownLeft className="size-3.5 text-ink-muted" aria-hidden />}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  )
}

export { CommandPalette }
