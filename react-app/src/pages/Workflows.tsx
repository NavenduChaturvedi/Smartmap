import { Plus, Sparkles, Trash2, Wand2, Workflow as WorkflowIcon } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label, Textarea } from "@/components/ui/field"
import { StatusPill } from "@/components/ui/status-pill"
import { generateRoadmapPlan, type AiContext, type GeneratedPlan } from "@/lib/ai-generator"
import { usePageHeader } from "@/lib/page-header"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface PhaseRow {
  id: string
  title: string
  xp: number
  label: string
}

function newPhase(): PhaseRow {
  return { id: Math.random().toString(36).slice(2, 8), title: "", xp: 20, label: "" }
}

function Workflows() {
  const navigate = useNavigate()
  const { state, totalXp, addRoadmap, addTasksBulk } = useStore()
  const [mode, setMode] = useState<"manual" | "ai">("manual")

  usePageHeader(["RoadmapOS", "Workflows & Triggers"])

  // Manual builder state
  const [manualName, setManualName] = useState("")
  const [phases, setPhases] = useState<PhaseRow[]>([newPhase()])
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState("")

  const updatePhase = (id: string, patch: Partial<PhaseRow>) =>
    setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const removePhase = (id: string) =>
    setPhases((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev))

  const handleManualLaunch = async () => {
    const validPhases = phases.filter((p) => p.title.trim())
    if (!manualName.trim() || validPhases.length === 0) return
    setLaunching(true)
    setLaunchError("")
    try {
      const roadmap = await addRoadmap(manualName.trim(), "Created with the manual workflow builder.")
      await addTasksBulk(
        roadmap.id,
        validPhases.map((p) => ({
          title: p.label.trim() ? `${p.label.trim()}: ${p.title.trim()}` : p.title.trim(),
          xp: p.xp || 0,
        })),
      )
      navigate(`/roadmap/${roadmap.id}`)
    } catch {
      setLaunchError("Couldn't create the roadmap. Try again.")
      setLaunching(false)
    }
  }

  // AI generator state
  const [prompt, setPrompt] = useState("")
  const [generating, setGenerating] = useState(false)
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [generateError, setGenerateError] = useState("")

  const buildAiContext = (): AiContext => ({
    page: "Workflows & Triggers",
    displayName: state.profile.displayName || "User",
    stats: {
      streak: state.streak,
      totalXp,
      roadmapsActive: state.roadmaps.length,
      pendingTasks: state.tasks.filter((t) => !t.done).length,
    },
    roadmaps: state.roadmaps
      .slice(0, 6)
      .map((r) => ({ id: r.id, name: r.name, description: r.description })),
  })

  const runGenerate = async () => {
    if (!prompt.trim() || generating) return
    setGenerating(true)
    setGenerateError("")
    setPlan(null)
    try {
      const result = await generateRoadmapPlan(prompt.trim(), buildAiContext())
      setPlan(result)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Couldn't generate a roadmap. Try again.")
    } finally {
      setGenerating(false)
    }
  }

  const handleAiLaunch = async () => {
    if (!plan) return
    setLaunching(true)
    setLaunchError("")
    try {
      const roadmap = await addRoadmap(plan.name, plan.description)
      await addTasksBulk(roadmap.id, plan.tasks)
      navigate(`/roadmap/${roadmap.id}`)
    } catch {
      setLaunchError("Couldn't create the roadmap. Try again.")
      setLaunching(false)
    }
  }

  return (
    <>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h1 className="text-sm font-semibold text-ink-strong">Workflows & Triggers</h1>
          <p className="text-[12px] text-ink-muted">
            Build a new roadmap by hand, or describe it and let AI draft the stages.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-1">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              mode === "manual" ? "bg-surface shadow-crisp text-ink-strong" : "text-ink-muted",
            )}
          >
            <WorkflowIcon className="size-3.5" />
            Manual Builder
          </button>
          <button
            type="button"
            onClick={() => setMode("ai")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              mode === "ai" ? "bg-surface shadow-crisp text-ink-strong" : "text-ink-muted",
            )}
          >
            <Sparkles className="size-3.5" />
            AI Generator
          </button>
        </div>
      </Card>

      {mode === "manual" ? (
        <Card className="flex flex-col gap-4 p-5">
          <div>
            <Label>Roadmap Name</Label>
            <Input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="e.g. Ethical Hacking Fundamentals"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Roadmap Phases</Label>
              <Button variant="subtle" size="sm" onClick={() => setPhases((p) => [...p, newPhase()])}>
                <Plus className="size-3.5" />
                Add Phase
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {phases.map((phase, i) => (
                <div
                  key={phase.id}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1fr_140px_100px_auto]"
                >
                  <Input
                    value={phase.title}
                    onChange={(e) => updatePhase(phase.id, { title: e.target.value })}
                    placeholder={`Task ${i + 1} title`}
                  />
                  <Input
                    value={phase.label}
                    onChange={(e) => updatePhase(phase.id, { label: e.target.value })}
                    placeholder="Phase label (optional)"
                  />
                  <Input
                    type="number"
                    value={phase.xp}
                    onChange={(e) => updatePhase(phase.id, { xp: Number(e.target.value) })}
                    placeholder="XP"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePhase(phase.id)}
                    disabled={phases.length === 1}
                    aria-label="Remove phase"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {launchError && <p className="text-[12.5px] text-coral-text">{launchError}</p>}
          <div className="flex justify-end">
            <Button
              onClick={handleManualLaunch}
              disabled={!manualName.trim() || !phases.some((p) => p.title.trim()) || launching}
            >
              {launching ? "Launching..." : "Launch Roadmap"}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="flex flex-col gap-3 p-5">
            <div>
              <Label>Command</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the roadmap you want, e.g. 'Build me a 6-week roadmap to learn ethical hacking fundamentals'"
                rows={8}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void runGenerate()
                }}
              />
            </div>
            <p className="text-[11px] text-ink-muted">
              Uses Gemini via the AI proxy. Complex requests can take up to 30 seconds.
            </p>
            {generateError && <p className="text-[12.5px] text-coral-text">{generateError}</p>}
            <Button
              onClick={() => void runGenerate()}
              disabled={!prompt.trim() || generating}
              className="self-start"
            >
              <Wand2 className="size-3.5" />
              {generating ? "Generating..." : "Run Command"}
            </Button>
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-sm font-semibold text-ink-strong">Generated Plan</h2>
            {generating && (
              <div className="flex h-40 items-center justify-center text-[13px] text-ink-muted">
                Drafting stages…
              </div>
            )}
            {!generating && !plan && !generateError && (
              <div className="flex h-40 items-center justify-center text-center text-[13px] text-ink-muted">
                Run a command to preview the generated roadmap here.
              </div>
            )}
            {!generating && !plan && generateError && (
              <div className="flex h-40 items-center justify-center text-center text-[13px] text-ink-muted">
                No plan yet — fix the error and try again.
              </div>
            )}
            {!generating && plan && (
              <>
                <div className="rounded-lg border border-line bg-surface-muted/50 p-3">
                  <p className="text-[13px] font-semibold text-ink-strong">{plan.name}</p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">{plan.description}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {plan.tasks.map((t) => (
                    <div key={t.title} className="rounded-lg border border-line p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-ink">{t.title}</span>
                        <StatusPill tone="sage">+{t.xp} XP</StatusPill>
                      </div>
                      <div className="mt-2 flex flex-col gap-1">
                        {t.subtasks.map((s) => (
                          <div key={s.title} className="flex items-center justify-between pl-3 text-[12px] text-ink-muted">
                            <span>{s.title}</span>
                            <span>+{s.xp} XP</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {launchError && <p className="text-[12.5px] text-coral-text">{launchError}</p>}
                <Button onClick={handleAiLaunch} className="self-end" disabled={launching}>
                  {launching ? "Launching..." : "Launch Roadmap"}
                </Button>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  )
}

export { Workflows }
