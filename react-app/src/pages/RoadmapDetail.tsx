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
import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import type { NodeCardProps } from "@/components/dashboard/NodeCard"
import { RoadmapCanvas } from "@/components/dashboard/RoadmapCanvas"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label, Textarea } from "@/components/ui/field"
import { Modal } from "@/components/ui/modal"
import { ProgressRing } from "@/components/ui/progress-ring"
import { usePageHeader } from "@/lib/page-header"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const STAGE_ICONS = [Webhook, BrainCircuit, SplitSquareHorizontal, BellRing]

function RoadmapDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    state,
    rootTasks,
    subtasks,
    roadmapProgress,
    toggleTask,
    addTask,
    updateRoadmap,
    deleteRoadmap,
  } = useStore()

  const roadmap = state.roadmaps.find((r) => r.id === id)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [addSubOpen, setAddSubOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [taskTitle, setTaskTitle] = useState("")
  const [taskXp, setTaskXp] = useState(20)
  const [subTitle, setSubTitle] = useState("")
  const [subXp, setSubXp] = useState(10)
  const [editName, setEditName] = useState(roadmap?.name ?? "")
  const [editDescription, setEditDescription] = useState(roadmap?.description ?? "")
  const [saving, setSaving] = useState(false)

  usePageHeader(["RoadmapOS", "Interactive Roadmap Canvas", roadmap?.name ?? "Not Found"], {
    label: "Add Task",
    onClick: () => setAddTaskOpen(true),
  })

  const roots = useMemo(() => (roadmap ? rootTasks(roadmap.id) : []), [roadmap, rootTasks])
  const { completed, total } = roadmap
    ? roadmapProgress(roadmap.id)
    : { completed: 0, total: 0 }
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
    const confidence = subs.length ? Math.round((doneSubs / subs.length) * 100) : task.done ? 100 : 0
    return {
      stage: `Stage ${i + 1}`,
      title: task.title,
      description: subs.length
        ? `${doneSubs}/${subs.length} sub-steps complete`
        : task.done
          ? "Stage complete"
          : "Awaiting execution",
      icon: STAGE_ICONS[i % STAGE_ICONS.length],
      tone: task.done ? "sage" : "amber",
      statusLabel: task.done ? "Active" : `+${task.xp} XP`,
      confidence,
      onClick: () => setSelectedTaskId(task.id),
    }
  })

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return
    setSaving(true)
    try {
      await addTask(roadmap.id, taskTitle.trim(), taskXp || 0)
      setTaskTitle("")
      setTaskXp(20)
      setAddTaskOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleAddSubtask = async () => {
    if (!subTitle.trim() || !selectedTask) return
    setSaving(true)
    try {
      await addTask(roadmap.id, subTitle.trim(), subXp || 0, selectedTask.id)
      setSubTitle("")
      setSubXp(10)
      setAddSubOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleEditSave = async () => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      await updateRoadmap(roadmap.id, editName.trim(), editDescription.trim())
      setEditOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await deleteRoadmap(roadmap.id)
      setDeleteOpen(false)
      navigate("/roadmap")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-ink-strong">{roadmap.name}</h1>
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-muted">
              {total} nodes
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">{roadmap.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddTaskOpen(true)}>
            <Plus className="size-3.5" />
            Add Task
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditName(roadmap.name)
              setEditDescription(roadmap.description)
              setEditOpen(true)
            }}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-3.5" />
            Delete
          </Button>
          <Link
            to="/roadmap"
            className="text-[12.5px] font-medium text-ink-muted hover:text-ink"
          >
            All Roadmaps
          </Link>
        </div>
      </Card>

      <RoadmapCanvas
        subtitle={`Live pipeline · ${stages.length} linked stages`}
        stages={stages}
        healthy={pct >= 50 || total === 0}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-2 p-6">
          <ProgressRing percent={pct} size={96} strokeWidth={7} toneClassName="stroke-sage-text">
            <span className="text-lg font-bold text-ink-strong">{pct}%</span>
          </ProgressRing>
          <p className="text-[12.5px] text-ink-muted">
            {completed}/{total} nodes completed
          </p>
        </Card>

        <Card className="flex flex-col gap-3 p-5 lg:col-span-2">
          {!selectedTask ? (
            <div className="flex h-full min-h-32 items-center justify-center text-[13px] text-ink-muted">
              Select a node above to inspect it.
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[14px] font-semibold text-ink-strong">
                    {selectedTask.title}
                  </h2>
                  <p className="text-[12px] text-ink-muted">
                    +{selectedTask.xp} XP · {selectedTask.done ? "Completed" : "Pending"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={selectedTask.done ? "outline" : "primary"}
                  onClick={() => toggleTask(selectedTask.id)}
                >
                  {selectedTask.done ? "Mark Undone" : "Mark Done"}
                </Button>
              </div>

              <div className="flex flex-col gap-1">
                {selectedSubtasks.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => toggleTask(sub.id)}
                    className="flex items-center gap-2.5 rounded-lg border border-line/70 px-3 py-2 text-left hover:bg-surface-muted/60"
                  >
                    {sub.done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-sage-text" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
                    )}
                    <span
                      className={cn(
                        "flex-1 text-[13px]",
                        sub.done ? "text-ink-muted line-through" : "text-ink",
                      )}
                    >
                      {sub.title}
                    </span>
                    <span className="text-[11px] text-ink-muted">+{sub.xp} XP</span>
                  </button>
                ))}
              </div>

              <Button
                variant="subtle"
                size="sm"
                className="self-start"
                onClick={() => setAddSubOpen(true)}
              >
                <Plus className="size-3.5" />
                Add Subtask
              </Button>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        title="Add Task"
        description="Add a new stage node to this roadmap."
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label>Task Title</Label>
            <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>XP Reward</Label>
            <Input
              type="number"
              value={taskXp}
              onChange={(e) => setTaskXp(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setAddTaskOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddTask} disabled={!taskTitle.trim() || saving}>
              {saving ? "Adding..." : "Add Task"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={addSubOpen}
        onClose={() => setAddSubOpen(false)}
        title="Add Subtask"
        description={selectedTask ? `Under "${selectedTask.title}"` : undefined}
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label>Subtask Title</Label>
            <Input value={subTitle} onChange={(e) => setSubTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>XP Reward</Label>
            <Input type="number" value={subXp} onChange={(e) => setSubXp(Number(e.target.value))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setAddSubOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddSubtask} disabled={!subTitle.trim() || saving}>
              {saving ? "Adding..." : "Add Subtask"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Roadmap">
        <div className="flex flex-col gap-4">
          <div>
            <Label>Roadmap Name</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleEditSave} disabled={!editName.trim() || saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Roadmap"
        description="This permanently deletes the roadmap and every task under it. This cannot be undone."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-coral-text hover:bg-coral-text/90"
            onClick={handleDelete}
            disabled={saving}
          >
            {saving ? "Deleting..." : "Delete Permanently"}
          </Button>
        </div>
      </Modal>
    </>
  )
}

export { RoadmapDetail }
