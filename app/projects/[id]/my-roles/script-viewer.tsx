"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Badge } from "@/src/components/ui/Badge"
import { Search, CheckCircle2, Circle, StickyNote, Save, Sun, MapPin } from "lucide-react"
import { toggleMemorized, saveDialogueNote } from "@/src/actions/dialogue-notes"
import type { ScriptScene, ScriptContentItem, NoteMap } from "./page"

export function ScriptViewer({
  scenes,
  myCharacterIds,
  projectId,
  noteMap,
  totalDialogues,
}: {
  scenes: ScriptScene[]
  myCharacterIds: string[]
  projectId: string
  noteMap: NoteMap
  totalDialogues: number
}) {
  const [filter, setFilter] = useState<"all" | "mine" | "unmemorized">("all")
  const [search, setSearch] = useState("")
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const memorizedCount = Array.from(Object.values(noteMap)).filter((n) => n.memorized).length

  const isMine = useCallback((charId: string) => myCharacterIds.includes(charId), [myCharacterIds])

  // Build flat list for filtering/search
  type FlatItem = { scene: ScriptScene; item: ScriptContentItem; key: string }
  const allItems = useMemo(() => {
    const result: FlatItem[] = []
    for (const scene of scenes) {
      for (const item of scene.content) {
        const key =
          item.type === "dialogue"
            ? `${scene.orderIndex}-${item.lineOrder}-${item.characterId}`
            : `${scene.orderIndex}-desc-${item.text.slice(0, 20)}`
        result.push({ scene, item, key })
      }
    }
    return result
  }, [scenes])

  const filteredItems = useMemo(() => {
    return allItems.filter(({ scene, item, key }) => {
      if (item.type !== "dialogue") return filter === "all"
      if (filter === "mine" && !isMine(item.characterId)) return false
      if (filter === "unmemorized") {
        if (!isMine(item.characterId)) return false
        if (noteMap[key]?.memorized) return false
      }
      if (search) {
        const q = search.toLowerCase()
        const matches =
          item.text.toLowerCase().includes(q) ||
          item.characterName.toLowerCase().includes(q) ||
          scene.title.toLowerCase().includes(q)
        if (!matches) return false
      }
      return true
    })
  }, [allItems, filter, search, noteMap, isMine])

  // Group filtered items by scene for rendering
  const groupedByScene = useMemo(() => {
    const groups: Record<number, { scene: ScriptScene; items: FlatItem[] }> = {}
    for (const flat of filteredItems) {
      if (!groups[flat.scene.orderIndex]) {
        groups[flat.scene.orderIndex] = { scene: flat.scene, items: [] }
      }
      groups[flat.scene.orderIndex].items.push(flat)
    }
    return Object.values(groups).sort((a, b) => a.scene.orderIndex - b.scene.orderIndex)
  }, [filteredItems])

  async function handleToggle(key: string) {
    await toggleMemorized(key, projectId)
  }

  async function handleSaveNote(key: string) {
    setSaving((prev) => ({ ...prev, [key]: true }))
    await saveDialogueNote(key, noteDrafts[key] ?? "", projectId)
    setSaving((prev) => ({ ...prev, [key]: false }))
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  const toggleNote = (key: string, currentNotes: string | null) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
        if (!(key in noteDrafts)) {
          setNoteDrafts((d) => ({ ...d, [key]: currentNotes ?? "" }))
        }
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">فیلمنامه کامل</h2>
          <Badge variant={memorizedCount === totalDialogues && totalDialogues > 0 ? "success" : "outline"}>
            {memorizedCount}/{totalDialogues} حفظ شده
          </Badge>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              placeholder="جستجو در فیلمنامه..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          همه
        </Button>
        <Button variant={filter === "mine" ? "default" : "outline"} size="sm" onClick={() => setFilter("mine")}>
          فقط دیالوگ‌های من
        </Button>
        <Button variant={filter === "unmemorized" ? "default" : "outline"} size="sm" onClick={() => setFilter("unmemorized")}>
          حفظ نشده‌ها
        </Button>
      </div>

      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-[var(--muted)]">
            {search ? "نتیجه‌ای یافت نشد" : filter === "unmemorized" ? "همه دیالوگ‌ها حفظ شده‌اند!" : "نتیجه‌ای یافت نشد"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedByScene.map(({ scene, items }) => (
            <div key={scene.orderIndex} className="space-y-4">
              {/* Scene header */}
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

              {/* Scene details */}
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
                {items.map(({ item, key }) => {
                  if (item.type === "description") {
                    return (
                      <div key={key} className="relative pr-4 mr-2 border-r-2 border-[var(--card-border)]">
                        <p className="text-sm text-[var(--muted)] italic leading-relaxed">{item.text}</p>
                      </div>
                    )
                  }

                  const mine = isMine(item.characterId)
                  const note = noteMap[key]
                  const memorized = note?.memorized ?? false
                  const noteText = note?.notes ?? null
                  const isNoteOpen = expandedNotes.has(key)

                  return (
                    <Card
                      key={key}
                      className={`transition-all duration-200 ${
                        mine
                          ? "ring-1 ring-[var(--accent)]/30 bg-[var(--accent-light)]"
                          : ""
                      }`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--badge-bg)] text-xs font-mono text-[var(--muted)]">
                              {item.lineOrder + 1}
                            </span>
                            <Badge variant={mine ? "default" : "outline"}>
                              {item.characterName}
                            </Badge>
                          </div>
                          {mine && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleToggle(key)}
                                className="p-1 rounded-md hover:bg-[var(--badge-bg)] transition-colors"
                                title={memorized ? "علامت حفظ شده را بردار" : "علامت به عنوان حفظ شده"}
                              >
                                {memorized ? (
                                  <CheckCircle2 className="h-5 w-5 text-[var(--green-text)]" />
                                ) : (
                                  <Circle className="h-5 w-5 text-[var(--muted-foreground)]" />
                                )}
                              </button>
                              <button
                                onClick={() => toggleNote(key, noteText)}
                                className={`p-1 rounded-md transition-colors ${
                                  noteText
                                    ? "text-[var(--amber-text)] hover:bg-[var(--amber-bg)]"
                                    : "text-[var(--muted-foreground)] hover:bg-[var(--badge-bg)]"
                                }`}
                                title="یادداشت"
                              >
                                <StickyNote className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed">{item.text}</p>
                        {isNoteOpen && (
                          <div className="mt-3 space-y-2 animate-fade-in">
                            <textarea
                              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2 text-sm resize-none focus:outline-none focus:border-[var(--input-focus-border)] focus:ring-2 focus:ring-[var(--input-focus-ring)] transition-all"
                              rows={3}
                              placeholder="یادداشت خود را بنویسید..."
                              value={noteDrafts[key] ?? noteText ?? ""}
                              onChange={(e) => setNoteDrafts((d) => ({ ...d, [key]: e.target.value }))}
                            />
                            <div className="flex justify-end">
                              <Button size="sm" onClick={() => handleSaveNote(key)} disabled={saving[key]} className="gap-1">
                                <Save className="h-3.5 w-3.5" />
                                {saving[key] ? "در حال ذخیره..." : "ذخیره یادداشت"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
