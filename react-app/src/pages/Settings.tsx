import { AlertTriangle, Bell, Database, Download, Upload, User } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/field"
import { Modal } from "@/components/ui/modal"
import { Toggle } from "@/components/ui/toggle"
import { BackupError, parseBackup } from "@/lib/backup"
import { usePageHeader } from "@/lib/page-header"
import { type AppState, useStore } from "@/lib/store"

function Settings() {
  usePageHeader(["Smartmap", "Settings"])
  const { state, isGuest, updateProfile, updateSettings, resetProgress, importState } = useStore()

  const [displayName, setDisplayName] = useState(state.profile.displayName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [importError, setImportError] = useState("")
  const [importNotice, setImportNotice] = useState("")
  const [pendingImport, setPendingImport] = useState<{ data: AppState; fileName: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Local input starts blank until the real profile finishes loading.
  useEffect(() => {
    setDisplayName(state.profile.displayName)
  }, [state.profile.displayName])

  // The slider moves locally and saves once it settles, instead of writing
  // on every step of a drag.
  const [fontScale, setFontScale] = useState(state.settings.fontScale)
  useEffect(() => setFontScale(state.settings.fontScale), [state.settings.fontScale])
  useEffect(() => {
    if (fontScale === state.settings.fontScale) return
    const timer = window.setTimeout(() => void updateSettings({ fontScale }), 300)
    return () => window.clearTimeout(timer)
  }, [fontScale, state.settings.fontScale, updateSettings])

  const dataBytes = new Blob([JSON.stringify(state)]).size
  const dataKb = (dataBytes / 1024).toFixed(1)

  const handleSaveProfile = async () => {
    setSaving(true)
    setProfileError("")
    try {
      await updateProfile({ displayName: displayName.trim(), email: state.profile.email })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1500)
    } catch {
      setProfileError("Couldn't save your profile. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "smartmap-export.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => fileInputRef.current?.click()

  // Validate first, then confirm: import replaces everything.
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError("")
    setImportNotice("")
    const reader = new FileReader()
    reader.onload = () => {
      try {
        setPendingImport({ data: parseBackup(String(reader.result)), fileName: file.name })
      } catch (err) {
        setImportError(err instanceof BackupError ? err.message : "Couldn't read that file.")
      }
    }
    reader.onerror = () => setImportError("Couldn't read that file.")
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleConfirmImport = async () => {
    if (!pendingImport) return
    setImporting(true)
    try {
      await importState(pendingImport.data)
      const { roadmaps, tasks } = pendingImport.data
      setImportNotice(
        `Imported ${roadmaps.length} roadmap${roadmaps.length === 1 ? "" : "s"} and ${tasks.length} task${
          tasks.length === 1 ? "" : "s"
        }.`,
      )
      setPendingImport(null)
    } catch {
      setImportError("The import failed partway. Your previous data is still there; try again.")
      setPendingImport(null)
    } finally {
      setImporting(false)
    }
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

  const fontLabel = `${fontScale}%${fontScale < 97 ? " · Small" : fontScale > 108 ? " · Large" : ""}`

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2">
              <User className="size-4 text-ink-muted" />
              <h2 className="text-sm font-semibold text-ink-strong">Profile Settings</h2>
            </div>
            {isGuest && (
              <p className="rounded-lg bg-surface-muted px-3 py-2 text-[12.5px] text-ink-muted">
                You're using Smartmap as a guest, so everything is saved in this browser only.{" "}
                <Link to="/login" className="font-medium text-ink underline underline-offset-2">
                  Sign in or create an account
                </Link>{" "}
                to keep it. What you've made here comes with you.
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="settings-display-name">Display Name</Label>
                <Input id="settings-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              {!isGuest && (
                <div>
                  <Label htmlFor="settings-email">Sign-in email</Label>
                  <Input id="settings-email" value={state.profile.email} type="email" readOnly disabled />
                </div>
              )}
            </div>
            {profileError && <p className="text-[12px] text-coral-text">{profileError}</p>}
            <Button
              size="sm"
              className="self-start"
              onClick={handleSaveProfile}
              disabled={saving || !displayName.trim() || displayName.trim() === state.profile.displayName}
            >
              {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
            </Button>
          </Card>

          <Card className="flex flex-col gap-5 p-5">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-ink-muted" aria-hidden />
              <h2 className="text-sm font-semibold text-ink-strong">Notifications</h2>
            </div>
            {[
              {
                key: "achievementAlerts" as const,
                label: "Achievement Alerts",
                hint: "Show a notification when you unlock an achievement",
              },
              {
                key: "soundEffects" as const,
                label: "Sound Effects",
                hint: "Play a chime with achievement alerts",
              },
            ].map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-4">
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

          <Card className="flex flex-col gap-5 p-5">
            <h2 className="text-sm font-semibold text-ink-strong">Appearance</h2>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="settings-font-size" className="mb-0">
                  Font Size
                </Label>
                <span className="text-[12px] text-ink-muted">{fontLabel}</span>
              </div>
              <input
                id="settings-font-size"
                type="range"
                min={90}
                max={120}
                step={5}
                value={fontScale}
                onChange={(e) => setFontScale(Number(e.target.value))}
                className="w-full accent-[#0c0c0d]"
              />
            </div>

            {[
              { key: "reducedMotion" as const, label: "Reduced Motion", hint: "Disable card/hover animations" },
              { key: "compactDensity" as const, label: "Compact Density", hint: "Tighter spacing throughout the app" },
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
            {importError && (
              <p role="alert" className="text-[12px] text-coral-text">
                {importError}
              </p>
            )}
            {importNotice && <p className="text-[12px] text-sage-text">{importNotice}</p>}
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
        open={!!pendingImport}
        onClose={() => setPendingImport(null)}
        title="Replace your data?"
        description={
          pendingImport
            ? `"${pendingImport.fileName}" has ${pendingImport.data.roadmaps.length} roadmap${
                pendingImport.data.roadmaps.length === 1 ? "" : "s"
              } and ${pendingImport.data.tasks.length} task${
                pendingImport.data.tasks.length === 1 ? "" : "s"
              }. Importing replaces every roadmap and task you have now. Achievements you've unlocked are kept.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setPendingImport(null)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirmImport} disabled={importing}>
            {importing ? "Importing..." : "Replace and Import"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset All Progress"
        description={
          isGuest
            ? "This permanently deletes every roadmap and task saved in this browser. This cannot be undone. Achievements you've unlocked are kept."
            : "This permanently deletes every roadmap and task in your account. This cannot be undone. Achievements you've unlocked are kept."
        }
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
