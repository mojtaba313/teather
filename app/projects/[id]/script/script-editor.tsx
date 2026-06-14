"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Badge } from "@/src/components/ui/Badge"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Save, ArrowLeft, FileText, Wand2, Lock, Eye, RefreshCw, LogOut, AlertTriangle, Printer, Edit3, XCircle, MapPin, Sun } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { acquireScriptLock, releaseScriptLock, heartbeatScriptLock, persistScript, endEditingSession } from "@/src/actions/script"
import { ScriptStatistics } from "./script-statistics"
import { CharacterGraph } from "./character-graph"
import { Portal } from "@/src/components/ui/Portal"

interface Character {
  id: string
  name: string
}

interface ScriptScene {
  orderIndex: number
  title: string
  setting: string
  timeOfDay: string
  summary: string
  content: ScriptContentItem[]
}

interface ScriptDialogue {
  type: "dialogue"
  characterId: string
  characterName: string
  text: string
  lineOrder: number
}

interface ScriptDescription {
  type: "description"
  text: string
}

type ScriptContentItem = ScriptDialogue | ScriptDescription

interface ScriptEditorProps {
  projectId: string
  script: { id: string; contentJson: unknown } | null
  characters: Character[]
  canEdit: boolean
}

export function ScriptEditor({ projectId, script, characters, canEdit }: ScriptEditorProps) {
  const router = useRouter()
  const [scenes, setScenes] = useState<ScriptScene[]>(() => {
    const json = script?.contentJson as Record<string, unknown> | null
    const rawScenes = json?.scenes as Array<Record<string, unknown>> | undefined
    if (rawScenes) {
      return rawScenes.map((s) => ({
        ...s,
        orderIndex: s.orderIndex as number,
        title: s.title as string,
        setting: (s.setting as string) ?? "",
        timeOfDay: (s.timeOfDay as string) ?? "",
        summary: (s.summary as string) ?? "",
        content: (s.content as ScriptContentItem[]) || ((s.dialogues as Array<Record<string, unknown>>) || []).map((d, i) => ({
          type: "dialogue" as const,
          characterId: d.characterId as string,
          characterName: d.characterName as string,
          text: d.text as string,
          lineOrder: (d.lineOrder as number) ?? i,
        })),
      }))
    }
    return []
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set([0]))
  const [newCharName, setNewCharName] = useState("")
  const [charList] = useState(characters)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragContent, setDragContent] = useState<{ sceneIdx: number; contentIdx: number } | null>(null)
  const [hasLock, setHasLock] = useState(false)
  const [lockedByName, setLockedByName] = useState("")
  const scriptId = script?.id
  const [lockPending, setLockPending] = useState(false)
  const [remoteScenes, setRemoteScenes] = useState<ScriptScene[] | null>(null)
  const hasLockRef = useRef(false)
  const scenesRef = useRef(scenes)
  useEffect(() => { scenesRef.current = scenes }, [scenes])
  const [elapsedText, setElapsedText] = useState("")
  const lockAcquiredAtRef = useRef(0)
  const [showExitModal, setShowExitModal] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pushedHistoryRef = useRef(false)
  const [mode, setMode] = useState<"view" | "edit">("view")

  function formatElapsed(acquiredAt: number): string {
    const seconds = Math.floor((Date.now() - acquiredAt) / 1000)
    if (seconds < 60) return "کمتر از یک دقیقه"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} دقیقه`
    const hours = Math.floor(minutes / 60)
    return `${hours} ساعت و ${minutes % 60} دقیقه`
  }

  const editable = canEdit && hasLock && mode === "edit"

  // Lock acquisition — only called explicitly via handleStartEditing
  const handleStartEditing = useCallback(async () => {
    if (!scriptId) return
    setLockPending(true)
    try {
      const result = await acquireScriptLock(scriptId)
      if (result.locked) {
        hasLockRef.current = true
        setHasLock(true)
        setMode("edit")
        lockAcquiredAtRef.current = Date.now()
        setElapsedText(formatElapsed(lockAcquiredAtRef.current))
      } else {
        setLockedByName(result.lockedBy ?? "")
        if (result.lockedAt) {
          lockAcquiredAtRef.current = new Date(result.lockedAt).getTime()
          setElapsedText(formatElapsed(lockAcquiredAtRef.current))
        }
      }
    } catch {
      setSaveError("خطا در دریافت قفل ویرایش")
    }
    setLockPending(false)
  }, [scriptId])

  // elapsed time ticker
  useEffect(() => {
    if (!lockAcquiredAtRef.current) return
    const interval = setInterval(() => {
      setElapsedText(formatElapsed(lockAcquiredAtRef.current))
    }, 1_000)
    return () => clearInterval(interval)
  }, [hasLock, lockedByName])

  // heartbeat — only in edit mode
  useEffect(() => {
    if (!hasLock || !scriptId || mode !== "edit") return
    const interval = setInterval(() => {
      heartbeatScriptLock(scriptId)
    }, 20_000)
    return () => clearInterval(interval)
  }, [hasLock, scriptId, mode])

  // auto-save debounce — only in edit mode, with error handling
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!hasLock || !scriptId || mode !== "edit") return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        await persistScript(scriptId, { scenes: scenesRef.current })
        setSaveError(null)
      } catch {
        setSaveError("ذخیره خودکار انجام نشد")
      }
      setSaving(false)
    }, 5_000)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [scenes, hasLock, scriptId, mode])

  // polling for read-only viewers — only in view mode
  useEffect(() => {
    if (mode !== "view" || hasLock || !canEdit || lockPending) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/script`)
        if (!res.ok) return
        const data = await res.json()
        if (data.contentJson?.scenes) {
          setRemoteScenes((data.contentJson.scenes as Array<Record<string, unknown>>).map((s) => ({
            ...s,
            orderIndex: s.orderIndex as number,
            title: s.title as string,
            setting: (s.setting as string) ?? "",
            timeOfDay: (s.timeOfDay as string) ?? "",
            summary: (s.summary as string) ?? "",
            content: (s.content as ScriptContentItem[]) || [],
          })))
        }
        if (!data.lockedBy) {
          setLockedByName("")
          lockAcquiredAtRef.current = 0
          setElapsedText("")
        } else if (data.lockedBy.name) {
          setLockedByName(data.lockedBy.name)
          if (data.lockedAt) {
            lockAcquiredAtRef.current = new Date(data.lockedAt).getTime()
            setElapsedText(formatElapsed(lockAcquiredAtRef.current))
          }
        }
      } catch {
        // ignore poll errors
      }
    }

    const interval = setInterval(poll, 5_000)
    return () => clearInterval(interval)
  }, [hasLock, canEdit, lockPending, projectId, scriptId, mode])

  // beforeunload — only in edit mode
  useEffect(() => {
    if (!hasLock || mode !== "edit") return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [hasLock, mode])

  // popstate — only in edit mode
  useEffect(() => {
    if (!hasLock || mode !== "edit") return
    if (!pushedHistoryRef.current) {
      window.history.pushState(null, "", window.location.href)
      pushedHistoryRef.current = true
    }
    const handler = () => {
      setShowExitModal(true)
      window.history.pushState(null, "", window.location.href)
    }
    window.addEventListener("popstate", handler)
    return () => window.removeEventListener("popstate", handler)
  }, [hasLock, mode])

  // Link click interceptor — only in edit mode
  useEffect(() => {
    if (!hasLock || mode !== "edit" || !containerRef.current) return
    const container = containerRef.current
    const handler = (e: MouseEvent) => {
      const anchor = e.target instanceof Element ? e.target.closest("a") : null
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return
      e.preventDefault()
      setPendingHref(href)
      setShowExitModal(true)
    }
    container.addEventListener("click", handler)
    return () => container.removeEventListener("click", handler)
  }, [hasLock, mode])

  // cleanup lock on unmount
  useEffect(() => {
    return () => {
      if (hasLockRef.current && scriptId) {
        releaseScriptLock(scriptId)
      }
    }
  }, [scriptId])

  // Auto-dismiss save errors
  useEffect(() => {
    if (!saveError) return
    const t = setTimeout(() => setSaveError(null), 6_000)
    return () => clearTimeout(t)
  }, [saveError])

  const displayScenes = remoteScenes ?? scenes

  function toggleScene(idx: number) {
    setExpandedScenes((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function addScene() {
    setScenes((prev) => [
      ...prev,
      { orderIndex: prev.length, title: `صحنه ${prev.length + 1}`, setting: "", timeOfDay: "", summary: "", content: [] },
    ])
    setExpandedScenes((prev) => new Set([...prev, scenes.length]))
  }

  function removeScene(idx: number) {
    setScenes((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, orderIndex: i })))
  }

  function moveScene(from: number, to: number) {
    if (from === to) return
    setScenes((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next.map((s, i) => ({ ...s, orderIndex: i }))
    })
  }

  function moveContent(sceneIdx: number, from: number, to: number) {
    if (from === to) return
    setScenes((prev) =>
      prev.map((s, i) => {
        if (i !== sceneIdx) return s
        const next = [...s.content]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return {
          ...s,
          content: next.map((item, j) =>
            item.type === "dialogue" ? { ...item, lineOrder: next.filter((c) => c.type === "dialogue" && next.indexOf(c) <= j).length - 1 } : item
          ),
        }
      })
    )
  }

  function updateScene(idx: number, field: string, value: unknown) {
    setScenes((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)))
  }

  function addDialogue(sceneIdx: number) {
    setScenes((prev) =>
      prev.map((s, i) =>
        i === sceneIdx
          ? {
            ...s,
            content: [
              ...s.content,
              { type: "dialogue" as const, characterId: charList[0]?.id || "", characterName: charList[0]?.name || "", text: "", lineOrder: s.content.filter((c) => c.type === "dialogue").length },
            ],
          }
          : s
      )
    )
  }

  function addDescription(sceneIdx: number) {
    setScenes((prev) =>
      prev.map((s, i) =>
        i === sceneIdx
          ? { ...s, content: [...s.content, { type: "description" as const, text: "" }] }
          : s
      )
    )
  }

  function updateContent(sceneIdx: number, contentIdx: number, field: string, value: unknown) {
    setScenes((prev) =>
      prev.map((s, i) =>
        i === sceneIdx
          ? {
            ...s,
            content: s.content.map((item, j) => {
              if (j !== contentIdx) return item
              if (item.type === "dialogue") {
                const updated = { ...item, [field]: value }
                if (field === "characterId") {
                  updated.characterName = charList.find((c) => c.id === value)?.name || ""
                }
                return updated
              }
              return { ...item, [field]: value }
            }),
          }
          : s
      )
    )
  }

  function removeContent(sceneIdx: number, contentIdx: number) {
    setScenes((prev) =>
      prev.map((s, i) =>
        i === sceneIdx
          ? {
            ...s,
            content: s.content.filter((_, j) => j !== contentIdx).map((item, j) => {
              if (item.type !== "dialogue") return item
              const dialogueIndex = s.content.filter((c, k) => c.type === "dialogue" && k < j).length
              return { ...item, lineOrder: dialogueIndex }
            }),
          }
          : s
      )
    )
  }

  async function addCharacter() {
    if (!newCharName.trim()) return
    const res = await fetch(`/api/projects/${projectId}/characters`, {
      method: "POST",
      body: JSON.stringify({ name: newCharName }),
    })
    if (res.ok) {
      setNewCharName("")
      router.refresh()
    }
  }

  const handleManualSave = useCallback(async () => {
    if (!scriptId) return
    setSaving(true)
    try {
      await persistScript(scriptId, { scenes })
      setSaveError(null)
      router.refresh()
    } catch {
      setSaveError("خطا در ذخیره فیلمنامه")
    }
    setSaving(false)
  }, [scriptId, scenes, router])

  const handleEndEditing = useCallback(async () => {
    if (!scriptId) return
    try {
      await endEditingSession(scriptId, { scenes })
    } catch {
      // best-effort
    }
    hasLockRef.current = false
    setHasLock(false)
    setMode("view")
    lockAcquiredAtRef.current = 0
    setElapsedText("")
    pushedHistoryRef.current = false
  }, [scriptId, scenes])

  const handleExitConfirmed = useCallback(async () => {
    if (!scriptId) return
    try {
      await endEditingSession(scriptId, { scenes })
    } catch {
      // best-effort
    }
    hasLockRef.current = false
    setHasLock(false)
    lockAcquiredAtRef.current = 0
    setElapsedText("")
    setShowExitModal(false)
    pushedHistoryRef.current = false
    if (pendingHref) {
      window.location.href = pendingHref
    } else {
      router.push(`/projects/${projectId}`)
    }
  }, [scriptId, scenes, router, pendingHref, projectId])

  const handleExitWithoutEnding = useCallback(() => {
    setShowExitModal(false)
    pushedHistoryRef.current = false
    hasLockRef.current = false
    setHasLock(false)
    if (pendingHref) {
      window.location.href = pendingHref
    } else {
      router.push(`/projects/${projectId}`)
    }
  }, [router, pendingHref, projectId])

  const handleDismissExit = useCallback(() => {
    setShowExitModal(false)
    setPendingHref(null)
  }, [])

  // ── View Mode (My Roles styling) ──────────────────────────
  if (mode === "view") {
    return (
      <div className="space-y-6 md:space-y-8">
        <div className="animate-fade-in">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            بازگشت به پروژه
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">فیلمنامه</h1>
              <span className="text-xs text-[var(--muted-foreground)]">{scenes.length} صحنه</span>
            </div>
            <div className="flex gap-2">
              <Link href={`/projects/${projectId}/script/print`} target="_blank">
                <Button variant="outline" size="sm" className="gap-2">
                  <Printer className="h-4 w-4" />
                  PDF
                </Button>
              </Link>
              <ScriptStatistics scenes={scenes} characters={characters} />
              <CharacterGraph scenes={scenes} characters={characters} />
              {canEdit && (
                <Button onClick={handleStartEditing} disabled={lockPending} size="sm" className="gap-2">
                  {lockPending ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Edit3 className="h-4 w-4" />
                  )}
                  {lockPending ? "در حال دریافت..." : "ویرایش فیلمنامه"}
                </Button>
              )}
            </div>
          </div>

          {canEdit && lockedByName && !hasLock && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--amber-border)] bg-[var(--amber-bg)] px-4 py-3 text-sm">
              <Lock className="h-4 w-4 shrink-0" />
              <span>
                <strong>{lockedByName}</strong> در حال ویرایش فیلمنامه است ({elapsedText}). شما در حالت فقط‌خواندن هستید.
              </span>
            </div>
          )}

          {!canEdit && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--amber-border)] bg-[var(--amber-bg)] px-4 py-3 text-sm">
              <Eye className="h-4 w-4 shrink-0" />
              <span>شما دسترسی ویرایش فیلمنامه را ندارید — حالت نمایش</span>
            </div>
          )}
        </div>

        {displayScenes.length === 0 ? (
          <Card className="animate-fade-in-2">
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--badge-bg)]">
                  <FileText className="h-7 w-7 text-[var(--muted)]" />
                </div>
                <p className="text-[var(--muted)]">هنوز هیچ صحنه‌ای اضافه نشده است</p>
                {canEdit && (
                  <Button onClick={handleStartEditing} variant="outline" size="sm" className="mt-2">
                    <Edit3 className="h-4 w-4 ml-1" />
                    افزودن اولین صحنه
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {displayScenes.map((scene, i) => (
              <div key={i} className="space-y-4 animate-fade-in">
                {/* Scene header — divider line with centered title */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--card-border)]" />
                  </div>
                  <div className="relative flex justify-center">
                    <div className="bg-[var(--bg-base)] px-4">
                      <h3 className="text-base font-bold text-[var(--accent)]">{scene.title}</h3>
                    </div>
                  </div>
                </div>

                {/* Scene details card */}
                {(scene.setting || scene.timeOfDay || scene.summary) && (
                  <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]/50 p-4 space-y-2">
                    {scene.setting && (
                      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                        <span>{scene.setting}</span>
                      </div>
                    )}
                    {scene.timeOfDay && (
                      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <Sun className="h-3.5 w-3.5 shrink-0 text-[var(--amber-text)]" />
                        <span>{scene.timeOfDay}</span>
                      </div>
                    )}
                    {scene.summary && (
                      <p className="text-sm text-[var(--muted)] leading-relaxed pr-5 border-r-2 border-[var(--accent)]/20">
                        {scene.summary}
                      </p>
                    )}
                  </div>
                )}

                {/* Scene content */}
                <div className="space-y-3">
                  {scene.content.map((item, ci) =>
                    item.type === "description" ? (
                      <div key={ci} className="relative pr-4 mr-2 border-r-2 border-[var(--card-border)]">
                        <p className="text-sm text-[var(--muted)] italic leading-relaxed">{item.text}</p>
                      </div>
                    ) : (
                      <Card key={ci} className="transition-all duration-200">
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--badge-bg)] text-xs font-mono text-[var(--muted)]">
                              {item.lineOrder + 1}
                            </span>
                            <Badge variant="outline">{item.characterName}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-relaxed">{item.text}</p>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Edit Mode ────────────────────────────────────────────
  return (
    <div ref={containerRef} className="space-y-6 md:space-y-8">
      <div className="animate-fade-in">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          بازگشت به پروژه
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">فیلمنامه</h1>
            <span className="rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs px-2.5 py-0.5 font-medium">
              ویرایش
            </span>
          </div>
          <div className="flex gap-2">
            <Link href={`/projects/${projectId}/script/print`} target="_blank">
              <Button variant="outline" size="sm" className="gap-2">
                <Printer className="h-4 w-4" />
                PDF
              </Button>
            </Link>
            <ScriptStatistics scenes={scenes} characters={characters} />
            <CharacterGraph scenes={scenes} characters={characters} />
            <Button onClick={handleManualSave} disabled={saving} variant="outline" size="sm" className="gap-2">
              {saving ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "در حال ذخیره..." : "ذخیره"}
            </Button>
            <Button onClick={addScene} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              صحنه جدید
            </Button>
            <Button onClick={handleEndEditing} variant="outline" size="sm" className="gap-2 text-[var(--red-text)] border-[var(--red-text)]/30 hover:bg-[var(--red-bg)]">
              <LogOut className="h-4 w-4" />
              پایان ویرایش
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <RefreshCw className={`h-3 w-3 ${saving ? "animate-spin" : ""}`} />
            {saving ? "در حال ذخیره..." : "ذخیره خودکار فعال"}
          </div>
          <span className="text-xs text-[var(--muted)]">|</span>
          <span className="text-xs text-[var(--muted)]">
            {elapsedText} در حال ویرایش
          </span>
        </div>

        {saveError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--red-text)]/30 bg-[var(--red-bg)] px-4 py-2.5 text-sm text-[var(--red-text)]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{saveError}</span>
            <button onClick={() => setSaveError(null)} className="shrink-0">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <Card className="animate-fade-in-1">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-[var(--muted)]" />
            ایجاد شخصیت جدید
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
              placeholder="نام شخصیت"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCharacter())}
            />
            <Button onClick={addCharacter} size="sm" variant="outline" className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              افزودن
            </Button>
          </div>
        </CardContent>
      </Card>

      {displayScenes.length === 0 && (
        <Card className="animate-fade-in-2">
          <CardContent className="py-12 md:py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--badge-bg)]">
                <FileText className="h-7 w-7 text-[var(--muted)]" />
              </div>
              <p className="text-[var(--muted)]">هنوز هیچ صحنه‌ای اضافه نشده است</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {displayScenes.map((scene, si) => (
          <Card
            key={si}
            draggable={editable}
            onDragStart={() => editable && setDragIdx(si)}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.opacity = "0.5" }}
            onDragLeave={(e) => { e.currentTarget.style.opacity = "1" }}
            onDrop={(e) => {
              e.currentTarget.style.opacity = "1"
              if (dragIdx !== null && dragIdx !== si) {
                moveScene(dragIdx, si)
              }
              setDragIdx(null)
            }}
            className={`transition-all duration-200 animate-fade-in-${Math.min(si + 2, 8)}`}
          >
            <CardHeader className="cursor-pointer" onClick={() => toggleScene(si)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {editable && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--muted-foreground)]" />}
                  <div className="flex items-center gap-2 min-w-0">
                    {expandedScenes.has(si) ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                    )}
                    <CardTitle className="text-base truncate">
                      {editable ? (
                        <Input
                          value={scene.title}
                          onChange={(e) => updateScene(si, "title", e.target.value)}
                          className="h-7 border-0 p-0 text-base font-semibold focus-visible:ring-0 bg-transparent"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        scene.title
                      )}
                    </CardTitle>
                    <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                      {scene.content.length} آیتم
                    </span>
                  </div>
                </div>
                {editable && (
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeScene(si) }}>
                    <Trash2 className="h-4 w-4 text-[var(--red-text)]" />
                  </Button>
                )}
              </div>
            </CardHeader>
            {expandedScenes.has(si) && (
              <CardContent className="space-y-4">
                {editable && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted)] mb-1">موقعیت</label>
                      <Input
                        value={scene.setting}
                        onChange={(e) => updateScene(si, "setting", e.target.value)}
                        placeholder="موقعیت صحنه"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted)] mb-1">زمان</label>
                      <Input
                        value={scene.timeOfDay}
                        onChange={(e) => updateScene(si, "timeOfDay", e.target.value)}
                        placeholder="صبح / شب / ..."
                      />
                    </div>
                  </div>
                )}
                {!editable && (scene.setting || scene.timeOfDay) && (
                  <p className="text-sm text-[var(--muted)]">
                    {[scene.setting, scene.timeOfDay].filter(Boolean).join(" - ")}
                  </p>
                )}
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">خلاصه</label>
                  {editable ? (
                    <textarea
                      value={scene.summary}
                      onChange={(e) => updateScene(si, "summary", e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm shadow-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-[var(--input-focus-border)]"
                      placeholder="خلاصه صحنه"
                    />
                  ) : (
                    scene.summary && <p className="mt-1 text-sm">{scene.summary}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">محتوای صحنه</h4>
                    {editable && (
                      <div className="flex gap-1">
                        <Button onClick={() => addDialogue(si)} size="sm" variant="ghost" className="gap-1">
                          <Plus className="h-3 w-3" />
                          دیالوگ
                        </Button>
                        <Button onClick={() => addDescription(si)} size="sm" variant="ghost" className="gap-1">
                          <Plus className="h-3 w-3" />
                          توضیح
                        </Button>
                      </div>
                    )}
                  </div>
                  {scene.content.map((item, ci) => (
                    <div
                      key={ci}
                      draggable={editable}
                      onDragStart={() => editable && setDragContent({ sceneIdx: si, contentIdx: ci })}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.opacity = "0.4" }}
                      onDragLeave={(e) => { e.currentTarget.style.opacity = "1" }}
                      onDrop={(e) => {
                        e.currentTarget.style.opacity = "1"
                        if (dragContent && dragContent.sceneIdx === si && dragContent.contentIdx !== ci) {
                          moveContent(si, dragContent.contentIdx, ci)
                        }
                        setDragContent(null)
                      }}
                      className={`flex items-start gap-2 rounded-xl border p-3 transition-all duration-200 ${item.type === "description"
                          ? "border-[var(--amber-border)] bg-[var(--amber-bg)]"
                          : "border-[var(--card-border)] bg-[var(--card-bg)]"
                        } ${editable ? "cursor-grab" : ""}`}
                    >
                      {editable && (
                        <GripVertical className="mt-1.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                      )}
                      {editable ? (
                        item.type === "dialogue" ? (
                          <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
                            <select
                              value={item.characterId}
                              onChange={(e) => updateContent(si, ci, "characterId", e.target.value)}
                              className="w-full sm:w-28 rounded-lg border border-[var(--input-border)] bg-[var(--select-bg)] px-2 py-1.5 text-sm shadow-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                            >
                              <option value="">انتخاب...</option>
                              {charList.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <textarea
                              value={item.text}
                              onChange={(e) => updateContent(si, ci, "text", e.target.value)}
                              rows={1}
                              className="w-full sm:flex-1 min-h-[38px] rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm shadow-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-[var(--input-focus-border)]"
                              placeholder="متن دیالوگ"
                            />
                          </div>
                        ) : (
                          <textarea
                            value={item.text}
                            onChange={(e) => updateContent(si, ci, "text", e.target.value)}
                            rows={2}
                            className="flex-1 min-w-0 rounded-lg border border-[var(--amber-border)] bg-[var(--amber-bg)] px-3 py-1.5 text-sm italic shadow-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-900/10 dark:focus:ring-amber-700/20 focus:border-amber-300 dark:focus:border-amber-700"
                            placeholder="توضیح صحنه (حرکت بازیگر، نور، صدا و...)"
                          />
                        )
                      ) : item.type === "dialogue" ? (
                        <>
                          <Badge className="w-20 shrink-0 justify-center">{item.characterName}</Badge>
                          <p className="text-sm">{item.text}</p>
                        </>
                      ) : (
                        <p className="text-sm italic text-[var(--amber-text)]">{item.text}</p>
                      )}
                      {editable && (
                        <Button variant="ghost" size="sm" onClick={() => removeContent(si, ci)}>
                          <Trash2 className="h-3 w-3 text-[var(--red-text)]" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {showExitModal && (
        <Portal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--amber-bg)]">
                <AlertTriangle className="h-5 w-5 text-[var(--amber-text)]" />
              </div>
              <h2 className="text-lg font-bold">خروج از صفحه فیلمنامه</h2>
            </div>
            <p className="mb-6 text-sm text-[var(--muted)]">
              شما در حال ویرایش فیلمنامه هستید. لطفاً قبل از خروج ویرایش را پایان دهید تا دیگران بتوانند فیلمنامه را ویرایش کنند.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleExitConfirmed} className="w-full gap-2">
                <LogOut className="h-4 w-4" />
                پایان ویرایش و خروج
              </Button>
              <Button onClick={handleExitWithoutEnding} variant="outline" className="w-full gap-2">
                خروج بدون پایان ویرایش
              </Button>
              <Button onClick={handleDismissExit} variant="ghost" className="w-full gap-2">
                ادامه ویرایش
              </Button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  )
}
