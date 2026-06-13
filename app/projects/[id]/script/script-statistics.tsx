"use client"

import { useMemo, useState } from "react"
import { Button } from "@/src/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { BarChart3, X, MessageSquare, FileText, Users, Layers, Hash } from "lucide-react"
import { Portal } from "@/src/components/ui/Portal"

interface Character {
  id: string
  name: string
}

interface Scene {
  orderIndex: number
  title: string
  content: { type: string; characterId?: string; characterName?: string; text: string }[]
}

interface ScriptStatisticsProps {
  scenes: Scene[]
  characters: Character[]
}

export function ScriptStatistics({ scenes, characters }: ScriptStatisticsProps) {
  const [open, setOpen] = useState(false)

  const stats = useMemo(() => {
    let totalDialogues = 0
    let totalDescriptions = 0
    const charCounts: Record<string, { dialogues: number; words: number }> = {}
    const sceneStats: { title: string; dialogues: number; descriptions: number }[] = []

    for (const char of characters) {
      charCounts[char.id] = { dialogues: 0, words: 0 }
    }

    for (const scene of scenes) {
      let ds = 0
      let desc = 0
      for (const item of scene.content) {
        if (item.type === "dialogue") {
          ds++
          totalDialogues++
          if (item.characterId && charCounts[item.characterId]) {
            charCounts[item.characterId].dialogues++
            charCounts[item.characterId].words += item.text.split(/\s+/).filter(Boolean).length
          }
        } else {
          desc++
          totalDescriptions++
        }
      }
      sceneStats.push({ title: scene.title, dialogues: ds, descriptions: desc })
    }

    const charStats = Object.entries(charCounts)
      .filter(([_, v]) => v.dialogues > 0 || v.words > 0)
      .map(([id, v]) => {
        const char = characters.find((c) => c.id === id)
        return { id, name: char?.name ?? "نامشخص", ...v }
      })
      .sort((a, b) => b.dialogues - a.dialogues)

    const maxDialogueChar = charStats[0] ?? null
    const maxWordChar = [...charStats].sort((a, b) => b.words - a.words)[0] ?? null
    const avgDialoguesPerScene = scenes.length ? (totalDialogues / scenes.length).toFixed(1) : "0"

    return {
      totalScenes: scenes.length,
      totalDialogues,
      totalDescriptions,
      charStats,
      maxDialogueChar,
      maxWordChar,
      avgDialoguesPerScene,
      sceneStats,
    }
  }, [scenes, characters])

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="gap-2">
        <BarChart3 className="h-4 w-4" />
        آمار
      </Button>

      {open && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--badge-bg)]">
                  <BarChart3 className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <h2 className="text-lg font-bold">آمار فیلمنامه</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard icon={Layers} label="صحنه‌ها" value={stats.totalScenes} />
              <StatCard icon={MessageSquare} label="دیالوگ‌ها" value={stats.totalDialogues} />
              <StatCard icon={FileText} label="توضیحات" value={stats.totalDescriptions} />
              <StatCard icon={Hash} label="میانگین دیالوگ" value={stats.avgDialoguesPerScene} />
            </div>

            {/* Per-character stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-[var(--muted)]" />
                  آمار شخصیت‌ها
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {stats.charStats.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[var(--muted)]">
                    هیچ دیالوگی یافت نشد
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--card-border)]">
                          <th className="px-4 py-2 text-right font-medium text-[var(--muted)]">شخصیت</th>
                          <th className="px-4 py-2 text-center font-medium text-[var(--muted)]">دیالوگ</th>
                          <th className="px-4 py-2 text-center font-medium text-[var(--muted)]">کلمه</th>
                          <th className="px-4 py-2 text-center font-medium text-[var(--muted)]">میانگین کلمه</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.charStats.map((char, i) => (
                          <tr key={char.id} className={`border-b border-[var(--card-border)]/50 transition-colors hover:bg-[var(--badge-bg)] ${i === 0 ? "bg-[var(--accent-light)]" : ""}`}>
                            <td className="px-4 py-2 font-medium">{char.name}</td>
                            <td className="px-4 py-2 text-center">{char.dialogues}</td>
                            <td className="px-4 py-2 text-center">{char.words}</td>
                            <td className="px-4 py-2 text-center">{char.dialogues ? Math.round(char.words / char.dialogues) : 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {stats.maxDialogueChar && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                <span className="rounded-lg border border-[var(--card-border)] bg-[var(--badge-bg)] px-2 py-1">
                  بیشترین دیالوگ: <strong className="text-[var(--foreground)]">{stats.maxDialogueChar.name}</strong> ({stats.maxDialogueChar.dialogues} دیالوگ)
                </span>
                {stats.maxWordChar && (
                  <span className="rounded-lg border border-[var(--card-border)] bg-[var(--badge-bg)] px-2 py-1">
                    بیشترین کلمه: <strong className="text-[var(--foreground)]">{stats.maxWordChar.name}</strong> ({stats.maxWordChar.words} کلمه)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        </Portal>
      )}
    </>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 text-center">
      <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--badge-bg)]">
        <Icon className="h-4 w-4 text-[var(--accent)]" />
      </div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-[var(--muted)]">{label}</p>
    </div>
  )
}
