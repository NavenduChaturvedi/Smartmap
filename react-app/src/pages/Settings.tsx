import { AlertTriangle, Bell, Database, Download, Upload, User } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/field"
import { Modal } from "@/components/ui/modal"
import { Toggle } from "@/components/ui/toggle"
import { usePageHeader } from "@/lib/page-header"
import { type AppState, useStore } from "@/lib/store"

function Settings() {
  usePageHeader(["Smartmap", "Settings"])
  const { state, updateProfile, updateSettings, resetProgress, importState } = useStore()

  const [displayName, setDisplayName] = useState(state.profile.displayName)
  const [email, setEmail] = useState(state.profile.email)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [importError, setImportError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Local inputs start blank until the real profile finishes loading.
  useEffect(() => {
    setDisplayName(state.profile.displayName)
    setEmail(state.profile.email)
  }, [state.profile.displayName, state.profile.email])

  const dataBytes = new Blob([JSON.stringify(state)]).size
  const dataKb = (dataBytes / 1024).toFixed(1)

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await updateProfile({ displayName: displayName.trim(), email: email.trim() })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1500)
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "roadmapos-export.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError("")
    const reader = new FileReader()
    reader.onload = () => {
      void (async () => {
        try {
          const data = JSON.parse(String(reader.result)) as AppState
          await importState(data)
        } catch {
          setImportError("Couldn't import that file — check it's a valid export.")
        }
      })()
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      await resetProgress()
      setResetOpen(false)
    } finally {
      setResetting(false)
    }
  }

  const fontLabel = state.settings.fontScale < 97 ? "Small" : state.settings.fontScale > 108 ? "Large" : "Medium"

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2">
              <User className="size-4 text-ink-muted" />
              <h2 className="text-sm font-semibold text-ink-strong">Profile Settings</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Display Name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              </div>
            </div>
            <Button size="sm" className="self-start" onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
            </Button>
          </Card>

          <Card className="flex flex-col gap-5 p-5">
            <h2 className="text-sm font-semibold text-ink-strong">Appearance</h2>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="mb-0">Font Size</Label>
                <span className="text-[12px] text-ink-muted">{fontLabel}</span>
              </div>
              <input
                type="range"
                min={90}
                max={120}
                value={state.settings.fontScale}
                onChange={(e) => void updateSettings({ fontScale: Number(e.target.value) })}
                className="w-full accent-[#0c0c0d]"
              />
            </div>

            {[
              { key: "soundEffects" as const, label: "Sound Effects", hint: "Play a chime on task completion" },
              { key: "reducedMotion" as const, label: "Reduced Motion", hint: "Disable card/hover animations" },
              { key: "compactDensity" as const, label: "Compact Density", hint: "Tighter spacing across tables and lists" },
            ].map((row) => (
              <div key={row.key} className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-ink">{row.label}</p>
                  <p className="text-[11.5px] text-ink-muted">{row.hint}</p>
                </div>
                <Toggle
                  checked={state.settings[row.key]}
                  onChange={(value) => void updateSettings({ [row.key]: value })}
                  label={row.label}
                />
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-ink-muted" />
              <h2 className="text-sm font-semibold text-ink-strong">Notifications</h2>
            </div>
            <div className="flex flex-col divide-y divide-line">
              {[
                { label: "Daily Reminder", value: "08:00 AM" },
                { label: "Streak Warning", value: "Enabled" },
                { label: "Achievement Alerts", value: "Global" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 text-[13px]">
                  <span className="text-ink">{row.label}</span>
                  <span className="text-ink-muted">{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-ink-muted" />
              <h2 className="text-sm font-semibold text-ink-strong">Data Management</h2>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-3.5" />
              Export Your Data
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportClick}>
              <Upload className="size-3.5" />
              Import Backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            {importError && <p className="text-[12px] text-coral-text">{importError}</p>}
            <p className="text-[11.5px] text-ink-muted">Current data size: {dataKb} KB</p>
            <Button
              size="sm"
              className="bg-coral-text hover:bg-coral-text/90"
              onClick={() => setResetOpen(true)}
            >
              <AlertTriangle className="size-3.5" />
              Reset All Progress
            </Button>
          </Card>

          <Card className="flex flex-col gap-2 p-5">
            <h2 className="text-sm font-semibold text-ink-strong">About System</h2>
            <p className="text-[12px] text-ink-muted">Version v1.0.0</p>
            <p className="text-[12px] text-ink-muted">Smartmap · Roadmap Command Center</p>
          </Card>
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset All Progress"
        description="This permanently deletes every roadmap and task in your account. This cannot be undone."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-coral-text hover:bg-coral-text/90"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? "Resetting..." : "Reset Everything"}
          </Button>
        </div>
      </Modal>
    </>
  )
}

export { Settings }
