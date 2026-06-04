"use client"

import { useState } from "react"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Badge } from "@/src/components/ui/Badge"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react"
import { useRouter } from "next/navigation"

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
  script: { id: string; contentJson: any } | null
  characters: Character[]
  canEdit: boolean
}

export function ScriptEditor({ projectId, script, characters, canEdit }: ScriptEditorProps) {
  const router = useRouter()
  const [scenes, setScenes] = useState<ScriptScene[]>(() => {
    if (script?.contentJson?.scenes) {
      return script.contentJson.scenes.map((s: any) => ({
        ...s,
        content: s.content || (s.dialogues || []).map((d: any, i: number) => ({ ...d, type: "dialogue" as const, lineOrder: d.lineOrder ?? i })),
      }))
    }
    return []
  })
  const [saving, setSaving] = useState(false)
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set([0]))
  const [newCharName, setNewCharName] = useState("")
  const [charList] = useState(characters)

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

  function updateScene(idx: number, field: string, value: any) {
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

  function updateContent(sceneIdx: number, contentIdx: number, field: string, value: any) {
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

  async function saveScript() {
    setSaving(true)
    await fetch(`/api/projects/${projectId}/script`, {
      method: "PUT",
      body: JSON.stringify({ contentJson: { scenes } }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">فیلمنامه</h1>
        {canEdit && (
          <div className="flex gap-2">
            <Button onClick={saveScript} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره"}</Button>
            <Button onClick={addScene} variant="outline"><Plus className="ml-1 h-4 w-4" />صحنه جدید</Button>
          </div>
        )}
      </div>

      {canEdit && (
        <Card>
          <CardHeader><CardTitle className="text-sm">ایجاد شخصیت جدید</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={newCharName} onChange={(e) => setNewCharName(e.target.value)} placeholder="نام شخصیت" />
              <Button onClick={addCharacter} size="sm" variant="outline"><Plus className="ml-1 h-4 w-4" />افزودن</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {scenes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-neutral-500">هنوز هیچ صحنه‌ای اضافه نشده است</CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {scenes.map((scene, si) => (
          <Card key={si}>
            <CardHeader className="cursor-pointer" onClick={() => toggleScene(si)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {canEdit && <GripVertical className="h-4 w-4 cursor-grab text-neutral-300" />}
                  {expandedScenes.has(si) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <CardTitle className="text-base">
                    {canEdit ? (
                      <Input
                        value={scene.title}
                        onChange={(e) => updateScene(si, "title", e.target.value)}
                        className="h-7 border-0 p-0 text-base font-semibold focus-visible:ring-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      scene.title
                    )}
                  </CardTitle>
                </div>
                {canEdit && (
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeScene(si) }}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            </CardHeader>
            {expandedScenes.has(si) && (
              <CardContent className="space-y-4">
                {canEdit && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-500">موقعیت</label>
                      <Input value={scene.setting} onChange={(e) => updateScene(si, "setting", e.target.value)} placeholder="موقعیت صحنه" />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500">زمان</label>
                      <Input value={scene.timeOfDay} onChange={(e) => updateScene(si, "timeOfDay", e.target.value)} placeholder="صبح / شب / ..." />
                    </div>
                  </div>
                )}
                {!canEdit && (scene.setting || scene.timeOfDay) && (
                  <p className="text-sm text-neutral-500">{[scene.setting, scene.timeOfDay].filter(Boolean).join(" - ")}</p>
                )}
                <div>
                  <label className="text-xs text-neutral-500">خلاصه</label>
                  {canEdit ? (
                    <textarea
                      value={scene.summary}
                      onChange={(e) => updateScene(si, "summary", e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm"
                      placeholder="خلاصه صحنه"
                    />
                  ) : (
                    scene.summary && <p className="mt-1 text-sm">{scene.summary}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">محتوای صحنه</h4>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button onClick={() => addDialogue(si)} size="sm" variant="ghost"><Plus className="ml-1 h-3 w-3" />دیالوگ</Button>
                        <Button onClick={() => addDescription(si)} size="sm" variant="ghost"><Plus className="ml-1 h-3 w-3" />توضیح</Button>
                      </div>
                    )}
                  </div>
                  {scene.content.map((item, ci) => (
                    <div key={ci} className={`flex items-start gap-2 rounded-md border p-2 ${item.type === "description" ? "bg-amber-50 border-amber-200" : ""}`}>
                      {canEdit ? (
                        item.type === "dialogue" ? (
                          <>
                            <select
                              value={item.characterId}
                              onChange={(e) => updateContent(si, ci, "characterId", e.target.value)}
                              className="w-28 rounded border border-neutral-300 bg-white px-2 py-1 text-sm"
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
                              className="flex-1 rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm"
                              placeholder="متن دیالوگ"
                            />
                          </>
                        ) : (
                          <textarea
                            value={item.text}
                            onChange={(e) => updateContent(si, ci, "text", e.target.value)}
                            rows={2}
                            className="flex-1 rounded border border-amber-300 bg-transparent px-2 py-1 text-sm italic"
                            placeholder="توضیح صحنه (حرکت بازیگر، نور، صدا و...)"
                          />
                        )
                      ) : item.type === "dialogue" ? (
                        <>
                          <Badge className="w-20 shrink-0 justify-center">{item.characterName}</Badge>
                          <p className="text-sm">{item.text}</p>
                        </>
                      ) : (
                        <p className="text-sm italic text-amber-700">{item.text}</p>
                      )}
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => removeContent(si, ci)}>
                          <Trash2 className="h-3 w-3 text-red-500" />
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
