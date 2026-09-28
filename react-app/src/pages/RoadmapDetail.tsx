import {
  BellRing,
  BrainCircuit,
  CheckCircle2,
  Circle,
  Pencil,
  Plus,
  SplitSquareHorizontal,
  Trash2,
  Webhook,
} from "lucide-react"
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import type { NodeCardProps } from "@/components/dashboard/NodeCard"
import { RoadmapCanvas } from "@/components/dashboard/RoadmapCanvas"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label, Textarea } from "@/components/ui/field"
import { Modal } from "@/components/ui/modal"
import { ProgressRing } from "@/components/ui/progress-ring"
import { StatusPill } from "@/components/ui/status-pill"
import { usePageHeader } from "@/lib/page-header"
import { type Task, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const STAGE_ICONS = [Webhook, BrainCircuit, SplitSquareHorizontal, BellRing]

type Dialog =
  | { kind: "add-task" }
  | { kind: "add-subtask"; parent: Task }
  | { kind: "edit-task"; task: Task }
  | { kind: "delete-task"; task: Task }
  | { kind: "edit-roadmap" }
  | { kind: "delete-roadmap" }

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
    >
      {children}
    </button>
  )
}

function DialogActions({
  onCancel,
  submitLabel,
  busyLabel,
  busy,
  disabled,
  destructive,
}: {
  onCancel: () => void
  submitLabel: string
  busyLabel: string
  busy: boolean
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button
        type="submit"
        size="sm"
        disabled={disabled || busy}
        className={destructive ? "bg-coral-text hover:bg-coral-text/90" : undefined}
      >
        {busy ? busyLabel : submitLabel}
      </Button>
    </div>
  )
}

function RoadmapDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const {
    state,
    rootTasks,
    subtasks,
    roadmapProgress,
    isRoadmapComplete,
    toggleTask,
    addTask,
    updateTask,
    deleteTask,
    updateTaskDueDate,
    updateRoadmap,
    deleteRoadmap,
  } = useStore()

  const roadmap = state.roadmaps.find((r) => r.id === id)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [title, setTitle] = useState("")
  const [xp, setXp] = useState(20)
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [savingDueDate, setSavingDueDate] = useState(false)

  // ?task=<id> (from search or the dashboard) selects that task's stage; a
  // subtask selects its parent.
  const linkedTaskId = searchParams.get("task")
  useEffect(() => {
    if (!linkedTaskId) return
    const task = state.tasks.find((t) => t.id === linkedTaskId && t.roadmapId === id)
    if (task) setSelectedTaskId(task.parentTaskId ?? task.id)
  }, [linkedTaskId, id, state.tasks])

  const selectStage = (taskId: string) => {
    setSelectedTaskId(taskId)
    if (linkedTaskId) setSearchParams({}, { replace: true })
  }

  const openDialog = (next: Dialog) => {
    setError("")
    if (next.kind === "add-task") {
      setTitle("")
      setXp(20)
    } else if (next.kind === "add-subtask") {
      setTitle("")
      setXp(10)
    } else if (next.kind === "edit-task") {
      setTitle(next.task.title)
      setXp(next.task.xp)
    } else if (next.kind === "edit-roadmap" && roadmap) {
      setTitle(roadmap.name)
      setDescription(roadmap.description)
    }
    setDialog(next)
  }
  const closeDialog = () => setDialog(null)

  usePageHeader(["Smartmap", "Roadmaps", roadmap?.name ?? "Not Found"], {
    label: "Add Task",
    onClick: () => openDialog({ kind: "add-task" }),
  })

  const roots = useMemo(() => (roadmap ? rootTasks(roadmap.id) : []), [roadmap, rootTasks])
  const { completed, total } = roadmap ? roadmapProgress(roadmap.id) : { completed: 0, total: 0 }
  const pct = total ? Math.round((completed / total) * 100) : 0
  const selectedTask = roots.find((t) => t.id === selectedTaskId) ?? null
  const selectedSubtasks = selectedTask ? subtasks(selectedTask.id) : []

  if (!roadmap) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <p className="text-[13px] text-ink-muted">This roadmap doesn't exist or was deleted.</p>
        <Button size="sm" onClick={() => navigate("/roadmap")}>
          Back to all roadmaps
        </Button>
      </Card>
    )
  }

  const stages: NodeCardProps[] = roots.map((task, i) => {
    const subs = subtasks(task.id)
    const doneSubs = subs.filter((s) => s.done).length
    const progress = subs.length ? Math.round((doneSubs / subs.length) * 100) : task.done ? 100 : 0
    return {
      stage: `Stage ${i + 1}`,
      title: task.title,
      description: subs.length
        ? `${doneSubs}/${subs.length} subtasks done`
        : task.done
          ? "Done"
          : "Not started",
      icon: STAGE_ICONS[i % STAGE_ICONS.length],
      tone: task.done ? "sage" : "amber",
      statusLabel: task.done ? "Done" : `+${task.xp} XP`,
      progress,
      onClick: () => selectStage(task.id),
    }
  })

  // Runs a dialog's action, keeping it open with a message if it fails.
  const submit = (action: () => Promise<void>) => async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await action()
      closeDialog()
    } catch {
      setError("Couldn't save that. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  const xpValue = Number.isFinite(xp) ? Math.max(0, Math.round(xp)) : 0

  const handleDueDateChange = async (taskId: string, value: string) => {
    setSavingDueDate(true)
    try {
      await updateTaskDueDate(taskId, value || null)
    } finally {
      setSavingDueDate(false)
    }
  }

  const titleAndXpFields = (prefix: string, titleLabel: string) => (
    <>
      <div>
        <Label htmlFor={`${prefix}-title`}>{titleLabel}</Label>
        <Input id={`${prefix}-title`} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div>
        <Label htmlFor={`${prefix}-xp`}>XP Reward</Label>
        <Input
          id={`${prefix}-xp`}
          type="number"
          min={0}
          value={xp}
          onChange={(e) => setXp(Number(e.target.value))}
        />
      </div>
    </>
  )

  const errorLine = error && (
    <p role="alert" className="text-[12.5px] text-coral-text">
      {error}
    </p>
  )

  return (
    <>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-sm font-semibold text-ink-strong">{roadmap.name}</h1>
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-muted">
              {total} task{total === 1 ? "" : "s"}
            </span>
            {isRoadmapComplete(roadmap.id) && (
              <StatusPill tone="sage" dot={false}>
                Completed
              </StatusPill>
            )}
          </div>
          {roadmap.description && (
            <p className="mt-0.5 text-[12.5px] text-ink-muted">{roadmap.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openDialog({ kind: "add-task" })}>
            <Plus className="size-3.5" />
            Add Task
          </Button>
          <Button variant="outline" size="sm" onClick={() => openDialog({ kind: "edit-roadmap" })}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => openDialog({ kind: "delete-roadmap" })}>
            <Trash2 className="size-3.5" />
            Delete
          </Button>
          <Link to="/roadmap" className="text-[12.5px] font-medium text-ink-muted hover:text-ink">
            All Roadmaps
          </Link>
        </div>
      </Card>

      <RoadmapCanvas
        subtitle={`${stages.length} stage${stages.length === 1 ? "" : "s"} · select one to see its subtasks`}
        stages={stages}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-2 p-6">
          <ProgressRing percent={pct} size={96} strokeWidth={7} toneClassName="stroke-sage-text">
            <span className="text-lg font-bold text-ink-strong">{pct}%</span>
          </ProgressRing>
          <p className="text-[12.5px] text-ink-muted">
            {completed}/{total} tasks done
          </p>
        </Card>

        <Card className="flex flex-col gap-3 p-5 lg:col-span-2">
          {!selectedTask ? (
            <div className="flex h-full min-h-32 items-center justify-center text-[13px] text-ink-muted">
              {stages.length ? "Select a stage above to see its subtasks." : "Add a task to get started."}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-semibold text-ink-strong">{selectedTask.title}</h2>
                  <p className="text-[12px] text-ink-muted">
                    +{selectedTask.xp} XP · {selectedTask.done ? "Completed" : "Pending"}
                    {selectedSubtasks.length > 0 &&
                      ` · marking it ${selectedTask.done ? "undone" : "done"} applies to its subtasks`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton
                    label={`Edit "${selectedTask.title}"`}
                    onClick={() => openDialog({ kind: "edit-task", task: selectedTask })}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </IconButton>
                  <IconButton
                    label={`Delete "${selectedTask.title}"`}
                    onClick={() => openDialog({ kind: "delete-task", task: selectedTask })}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </IconButton>
                  <Button
                    size="sm"
                    variant={selectedTask.done ? "outline" : "primary"}
                    onClick={() => toggleTask(selectedTask.id)}
                  >
                    {selectedTask.done ? "Mark Undone" : "Mark Done"}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="task-due-date" className="mb-0 shrink-0">
                  Due Date
                </Label>
                <Input
                  id="task-due-date"
                  type="date"
                  className="w-auto"
                  value={selectedTask.dueDate ?? ""}
                  disabled={savingDueDate}
                  onChange={(e) => handleDueDateChange(selectedTask.id, e.target.value)}
                />
                {selectedTask.dueDate && (
                  <button
                    type="button"
                    className="text-[11.5px] font-medium text-ink-muted hover:text-ink"
                    onClick={() => handleDueDateChange(selectedTask.id, "")}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1">
                {selectedSubtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-1 rounded-lg border border-line/70 pr-1 hover:bg-surface-muted/60"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTask(sub.id)}
                      aria-pressed={sub.done}
                      className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left"
                    >
                      {sub.done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-sage-text" aria-hidden />
                      ) : (
                        <Circle className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} aria-hidden />
                      )}
                      <span
                        className={cn(
                          "flex-1 truncate text-[13px]",
                          sub.done ? "text-ink-muted line-through" : "text-ink",
                        )}
                      >
                        {sub.title}
                      </span>
                      <span className="text-[11px] text-ink-muted">+{sub.xp} XP</span>
                    </button>
                    <IconButton
                      label={`Edit "${sub.title}"`}
                      onClick={() => openDialog({ kind: "edit-task", task: sub })}
                    >
                      <Pencil className="size-3.5" aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`Delete "${sub.title}"`}
                      onClick={() => openDialog({ kind: "delete-task", task: sub })}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </IconButton>
                  </div>
                ))}
              </div>

              <Button
                variant="subtle"
                size="sm"
                className="self-start"
                onClick={() => openDialog({ kind: "add-subtask", parent: selectedTask })}
              >
                <Plus className="size-3.5" />
                Add Subtask
              </Button>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={dialog?.kind === "add-task"}
        onClose={closeDialog}
        title="Add Task"
        description="Add a new stage to this roadmap."
      >
        <form className="flex flex-col gap-4" onSubmit={submit(() => addTask(roadmap.id, title.trim(), xpValue))}>
          {titleAndXpFields("add-task", "Task Title")}
          {errorLine}
          <DialogActions
            onCancel={closeDialog}
            submitLabel="Add Task"
            busyLabel="Adding..."
            busy={saving}
            disabled={!title.trim()}
          />
        </form>
      </Modal>

      <Modal
        open={dialog?.kind === "add-subtask"}
        onClose={closeDialog}
        title="Add Subtask"
        description={dialog?.kind === "add-subtask" ? `Under "${dialog.parent.title}"` : undefined}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={submit(async () => {
            if (dialog?.kind !== "add-subtask") return
            await addTask(roadmap.id, title.trim(), xpValue, dialog.parent.id)
          })}
        >
          {titleAndXpFields("add-subtask", "Subtask Title")}
          {errorLine}
          <DialogActions
            onCancel={closeDialog}
            submitLabel="Add Subtask"
            busyLabel="Adding..."
            busy={saving}
            disabled={!title.trim()}
          />
        </form>
      </Modal>

      <Modal
        open={dialog?.kind === "edit-task"}
        onClose={closeDialog}
        title={dialog?.kind === "edit-task" && dialog.task.parentTaskId ? "Edit Subtask" : "Edit Task"}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={submit(async () => {
            if (dialog?.kind !== "edit-task") return
            await updateTask(dialog.task.id, { title: title.trim(), xp: xpValue })
          })}
        >
          {titleAndXpFields("edit-task", "Title")}
          {errorLine}
          <DialogActions
            onCancel={closeDialog}
            submitLabel="Save Changes"
            busyLabel="Saving..."
            busy={saving}
            disabled={!title.trim()}
          />
        </form>
      </Modal>

      <Modal
        open={dialog?.kind === "delete-task"}
        onClose={closeDialog}
        title={dialog?.kind === "delete-task" && dialog.task.parentTaskId ? "Delete Subtask" : "Delete Task"}
        description={
          dialog?.kind === "delete-task"
            ? (() => {
                const count = subtasks(dialog.task.id).length
                return `"${dialog.task.title}"${
                  count ? ` and its ${count} subtask${count === 1 ? "" : "s"}` : ""
                } will be permanently deleted. Achievements you've unlocked are kept.`
              })()
            : undefined
        }
      >
        <form
          onSubmit={submit(async () => {
            if (dialog?.kind !== "delete-task") return
            await deleteTask(dialog.task.id)
            if (dialog.task.id === selectedTaskId) setSelectedTaskId(null)
          })}
        >
          {errorLine}
          <DialogActions
            onCancel={closeDialog}
            submitLabel="Delete"
            busyLabel="Deleting..."
            busy={saving}
            destructive
          />
        </form>
      </Modal>

      <Modal open={dialog?.kind === "edit-roadmap"} onClose={closeDialog} title="Edit Roadmap">
        <form
          className="flex flex-col gap-4"
          onSubmit={submit(() => updateRoadmap(roadmap.id, title.trim(), description.trim()))}
        >
          <div>
            <Label htmlFor="edit-roadmap-name">Roadmap Name</Label>
            <Input id="edit-roadmap-name" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label htmlFor="edit-roadmap-description">Description</Label>
            <Textarea
              id="edit-roadmap-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {errorLine}
          <DialogActions
            onCancel={closeDialog}
            submitLabel="Save Changes"
            busyLabel="Saving..."
            busy={saving}
            disabled={!title.trim()}
          />
        </form>
      </Modal>

      <Modal
        open={dialog?.kind === "delete-roadmap"}
        onClose={closeDialog}
        title="Delete Roadmap"
        description="This permanently deletes the roadmap and every task under it. This cannot be undone. Achievements you've unlocked are kept."
      >
        <form
          onSubmit={submit(async () => {
            await deleteRoadmap(roadmap.id)
            navigate("/roadmap")
          })}
        >
          {errorLine}
          <DialogActions
            onCancel={closeDialog}
            submitLabel="Delete Permanently"
            busyLabel="Deleting..."
            busy={saving}
            destructive
          />
        </form>
      </Modal>
    </>
  )
}

export { RoadmapDetail }
