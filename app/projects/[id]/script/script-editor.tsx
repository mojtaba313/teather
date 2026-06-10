"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Badge } from "@/src/components/ui/Badge"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Save, ArrowLeft, FileText, Wand2, Lock, Eye, RefreshCw, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { acquireScriptLock, releaseScriptLock, heartbeatScriptLock, persistScript } from "@/src/actions/script"

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
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set([0]))
  const [newCharName, setNewCharName] = useState("")
  const [charList] = useState(characters)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragContent, setDragContent] = useState<{ sceneIdx: number; contentIdx: number } | null>(null)
  const [hasLock, setHasLock] = useState(false)
  const [lockedByName, setLockedByName] = useState("")
  const scriptId = script?.id
  const [lockPending, setLockPending] = useState(canEdit && !!scriptId)
  const [remoteScenes, setRemoteScenes] = useState<ScriptScene[] | null>(null)
  const hasLockRef = useRef(false)
  const scenesRef = useRef(scenes)
  useEffect(() => { scenesRef.current = scenes }, [scenes])
  const [elapsedText, setElapsedText] = useState("")
  const lockAcquiredAtRef = useRef(0)

  function formatElapsed(acquiredAt: number): string {
    const seconds = Math.floor((Date.now() - acquiredAt) / 1000)
    if (seconds < 60) return "کمتر از یک دقیقه"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} دقیقه`
    const hours = Math.floor(minutes / 60)
    return `${hours} ساعت و ${minutes % 60} دقیقه`
  }

  const editable = canEdit && hasLock

  // acquire lock on mount
  useEffect(() => {
    if (!canEdit || !scriptId) return

    let cancelled = false

    acquireScriptLock(scriptId).then((result) => {
      if (cancelled) return
      if (result.locked) {
        hasLockRef.current = true
        setHasLock(true)
        lockAcquiredAtRef.current = Date.now()
        setElapsedText(formatElapsed(lockAcquiredAtRef.current))
      } else {
        setLockedByName(result.lockedBy ?? "")
        if (result.lockedAt) {
          lockAcquiredAtRef.current = new Date(result.lockedAt).getTime()
          setElapsedText(formatElapsed(lockAcquiredAtRef.current))
        }
      }
      setLockPending(false)
    })

    return () => {
      cancelled = true
      if (hasLockRef.current && scriptId) {
        releaseScriptLock(scriptId)
      }
    }
  }, [canEdit, scriptId])

  // elapsed time ticker
  useEffect(() => {
    if (!lockAcquiredAtRef.current) return
    const interval = setInterval(() => {
      setElapsedText(formatElapsed(lockAcquiredAtRef.current))
    }, 1_000)
    return () => clearInterval(interval)
  }, [hasLock, lockedByName])

  // heartbeat
  useEffect(() => {
    if (!hasLock || !scriptId) return
    const interval = setInterval(() => {
      heartbeatScriptLock(scriptId)
    }, 20_000)
    return () => clearInterval(interval)
  }, [hasLock, scriptId])

  // auto-save debounce
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!hasLock || !scriptId) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      await persistScript(scriptId, { scenes: scenesRef.current })
      setSaving(false)
    }, 5_000)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [scenes, hasLock, scriptId])

  // polling for read-only viewers
  useEffect(() => {
    if (hasLock || !canEdit || lockPending) return

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
        // If the lock is now free, re-attempt acquisition
        if (!data.lockedBy) {
          if (scriptId) {
            const result = await acquireScriptLock(scriptId)
            if (result.locked) {
              hasLockRef.current = true
              setHasLock(true)
              setLockedByName("")
              setRemoteScenes(null)
              lockAcquiredAtRef.current = Date.now()
              setElapsedText(formatElapsed(lockAcquiredAtRef.current))
            } else {
              setLockedByName(result.lockedBy ?? "")
              if (result.lockedAt) {
                lockAcquiredAtRef.current = new Date(result.lockedAt).getTime()
                setElapsedText(formatElapsed(lockAcquiredAtRef.current))
              }
            }
          }
        } else if (data.lockedBy.name) {
          setLockedByName(data.lockedBy.name)
          if (data.lockedAt) {
            lockAcquiredAtRef.current = new Date(data.lockedAt).getTime()
            setElapsedText(formatElapsed(lockAcquiredAtRef.current))
          }
        }
      } catch {
        // ignore
      }
    }

    const interval = setInterval(poll, 5_000)
    return () => clearInterval(interval)
  }, [hasLock, canEdit, lockPending, projectId, scriptId])

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
    await persistScript(scriptId, { scenes })
    setSaving(false)
    router.refresh()
  }, [scriptId, scenes, router])

  const handleEndEditing = useCallback(async () => {
    if (!scriptId) return
    await persistScript(scriptId, { scenes })
    hasLockRef.current = false
    setHasLock(false)
    lockAcquiredAtRef.current = 0
    setElapsedText("")
    await releaseScriptLock(scriptId)
    router.back()
  }, [scriptId, scenes, router])

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
            {lockPending && canEdit && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--muted)] border-t-transparent" />
            )}
          </div>
          <div className="flex gap-2">
            {editable && (
              <Button onClick={handleManualSave} disabled={saving} variant="outline" size="sm" className="gap-2">
                {saving ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "در حال ذخیره..." : "ذخیره"}
              </Button>
            )}
            {editable && (
              <Button onClick={addScene} variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                صحنه جدید
              </Button>
            )}
            {editable && (
              <Button onClick={handleEndEditing} variant="outline" size="sm" className="gap-2 text-[var(--red-text)] border-[var(--red-text)]/30 hover:bg-[var(--red-bg)]">
                <LogOut className="h-4 w-4" />
                پایان ویرایش
              </Button>
            )}
          </div>
        </div>

        {canEdit && !lockPending && !hasLock && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--amber-border)] bg-[var(--amber-bg)] px-4 py-3 text-sm">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              <strong>{lockedByName}</strong> در حال ویرایش فیلمنامه است ({elapsedText}). شما در حالت فقط‌خواندن هستید.
            </span>
          </div>
        )}

        {editable && (
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
        )}

        {remoteScenes && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
            <Eye className="h-3 w-3" />
            در حال نمایش آخرین تغییرات
          </div>
        )}
      </div>

      {!hasLock && editable === false && canEdit === false && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--amber-border)] bg-[var(--amber-bg)] px-4 py-3 text-sm">
          <Eye className="h-4 w-4 shrink-0" />
          <span>شما دسترسی ویرایش فیلمنامه را ندارید</span>
        </div>
      )}

      {editable && (
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
      )}

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
    </div>
  )
}
