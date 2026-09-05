import { ChevronRight, Waypoints } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label, Textarea } from "@/components/ui/field"
import { Modal } from "@/components/ui/modal"
import { ProgressRing } from "@/components/ui/progress-ring"
import { usePageHeader } from "@/lib/page-header"
import { useStore } from "@/lib/store"

function RoadmapOverview() {
  const navigate = useNavigate()
  const { state, roadmapProgress, addRoadmap } = useStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  usePageHeader(["Smartmap", "Interactive Roadmap Canvas"], {
    label: "New Roadmap",
    onClick: () => setModalOpen(true),
  })

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    setError("")
    try {
      const roadmap = await addRoadmap(name.trim(), description.trim())
      setModalOpen(false)
      setName("")
      setDescription("")
      navigate(`/roadmap/${roadmap.id}`)
    } catch {
      setError("Couldn't create the roadmap. Try again.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Card className="flex items-center justify-between p-5">
        <div>
          <h1 className="text-sm font-semibold text-ink-strong">All Roadmaps</h1>
          <p className="text-[12px] text-ink-muted">
            {state.roadmaps.length} active pipelines · click one to open its node canvas
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          New Roadmap
        </Button>
      </Card>

      {state.roadmaps.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <Waypoints className="size-8 text-ink-muted" strokeWidth={1.5} />
          <p className="text-[13px] text-ink-muted">
            No roadmaps yet. Create your first one to start building a node pipeline.
          </p>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            New Roadmap
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.roadmaps.map((r) => {
            const { completed, total } = roadmapProgress(r.id)
            const pct = total ? Math.round((completed / total) * 100) : 0
            return (
              <Card
                key={r.id}
                className="group cursor-pointer p-5 transition-colors hover:border-ink-muted/30"
                onClick={() => navigate(`/roadmap/${r.id}`)}
              >
                <div className="flex items-start gap-3">
                  <ProgressRing percent={pct} size={48} strokeWidth={4}>
                    <span className="text-[11px] font-bold text-ink-strong">{pct}%</span>
                  </ProgressRing>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[14px] font-semibold text-ink-strong">
                      {r.name}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-muted">
                      {r.description || "No description."}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-ink-muted">
                  <span>
                    {completed}/{total} nodes completed
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-sage-text" style={{ width: `${pct}%` }} />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Roadmap"
        description="Give your pipeline a name and a short description."
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label>Roadmap Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ethical Hacking Fundamentals"
              autoFocus
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this roadmap for?"
              rows={3}
            />
          </div>
          {error && <p className="text-[12.5px] text-coral-text">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={!name.trim() || creating}>
              {creating ? "Creating..." : "Create Roadmap"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export { RoadmapOverview }
