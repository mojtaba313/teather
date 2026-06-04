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
  dialogues: ScriptDialogue[]
}

interface ScriptDialogue {
  characterId: string
  characterName: string
  text: string
  lineOrder: number
}

interface ScriptEditorProps {
  projectId: string
  script: { id: string; contentJson: any } | null
  characters: Character[]
  canEdit: boolean
}

export function ScriptEditor({ projectId, script, characters, canEdit }: ScriptEditorProps) {
  const router = useRouter()
  const [scenes, setScenes] = useState<ScriptScene[]>(() => {
    if (script?.contentJson?.scenes) return script.contentJson.scenes
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
      { orderIndex: prev.length, title: `صحنه ${prev.length + 1}`, setting: "", timeOfDay: "", summary: "", dialogues: [] },
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
              dialogues: [
                ...s.dialogues,
                { characterId: charList[0]?.id || "", characterName: charList[0]?.name || "", text: "", lineOrder: s.dialogues.length },
              ],
            }
          : s
      )
    )
  }

  function updateDialogue(sceneIdx: number, dialogueIdx: number, field: string, value: any) {
    setScenes((prev) =>
      prev.map((s, i) =>
        i === sceneIdx
          ? {
              ...s,
              dialogues: s.dialogues.map((d, j) =>
                j === dialogueIdx
                  ? {
                      ...d,
                      [field]: value,
                      ...(field === "characterId"
                        ? { characterName: charList.find((c) => c.id === value)?.name || "" }
                        : {}),
                    }
                  : d
              ),
            }
          : s
      )
    )
  }

  function removeDialogue(sceneIdx: number, dialogueIdx: number) {
    setScenes((prev) =>
      prev.map((s, i) =>
        i === sceneIdx
          ? { ...s, dialogues: s.dialogues.filter((_, j) => j !== dialogueIdx).map((d, j) => ({ ...d, lineOrder: j })) }
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
                    <h4 className="text-sm font-medium">دیالوگ‌ها</h4>
                    {canEdit && <Button onClick={() => addDialogue(si)} size="sm" variant="ghost"><Plus className="ml-1 h-3 w-3" />افزودن</Button>}
                  </div>
                  {scene.dialogues.map((dialogue, di) => (
                    <div key={di} className="flex items-start gap-2 rounded-md border p-2">
                      {canEdit ? (
                        <>
                          <select
                            value={dialogue.characterId}
                            onChange={(e) => updateDialogue(si, di, "characterId", e.target.value)}
                            className="w-28 rounded border border-neutral-300 bg-white px-2 py-1 text-sm"
                          >
                            <option value="">انتخاب...</option>
                            {charList.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <textarea
                            value={dialogue.text}
                            onChange={(e) => updateDialogue(si, di, "text", e.target.value)}
                            rows={1}
                            className="flex-1 rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm"
                            placeholder="متن دیالوگ"
                          />
                          <Button variant="ghost" size="sm" onClick={() => removeDialogue(si, di)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge className="w-20 shrink-0 justify-center">{dialogue.characterName}</Badge>
                          <p className="text-sm">{dialogue.text}</p>
                        </>
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
