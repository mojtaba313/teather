import { getAuth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"

type ScriptContentItem =
  | { type: "dialogue"; characterId: string; characterName: string; text: string; lineOrder: number }
  | { type: "description"; text: string }

interface ScriptScene {
  orderIndex: number
  title: string
  setting: string
  timeOfDay: string
  summary: string
  content: ScriptContentItem[]
}

import { PrintToolbar } from "./print-toolbar"

export const dynamic = "force-dynamic"

export default async function PrintScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuth()
  if (!session?.user?.id) redirect("/login")
  const { id } = await params

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: id } },
  })
  if (!member) notFound()

  const project = await prisma.project.findUnique({
    where: { id },
    include: { script: true },
  })
  if (!project || !project.script) notFound()

  const rawJson = project.script.contentJson as { scenes?: Record<string, unknown>[] } | null
  const scenes: ScriptScene[] = rawJson?.scenes
    ? rawJson.scenes.map((s) => ({
        orderIndex: (s.orderIndex as number) ?? 0,
        title: (s.title as string) ?? "",
        setting: (s.setting as string) ?? "",
        timeOfDay: (s.timeOfDay as string) ?? "",
        summary: (s.summary as string) ?? "",
        content: (s.content as ScriptContentItem[]) || [],
      }))
    : []

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 1.2cm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-page { width: 100% !important; padding: 0 !important; }
          .scene-break { page-break-before: always; }
          .dialogue-text { max-width: none !important; padding: 0.1rem 2rem !important; }
          .description { max-width: none !important; }
        }

        .print-page {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding: 1.5rem 2rem;
          direction: rtl;
          background: #fafafa;
          min-height: 100vh;
          font-family: "Vazirmatn", system-ui, sans-serif;
        }

        .no-print {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
          background: #0f172a;
          border-radius: 12px;
        }

        .cover-page {
          text-align: center;
          padding: 4rem 0 3rem;
        }

        .cover-page h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
        }

        .cover-page .meta {
          color: #64748b;
          font-size: 0.9rem;
        }

        .cover-page .sep {
          width: 60px;
          height: 3px;
          background: #14b8a6;
          margin: 1.25rem auto;
          border-radius: 2px;
        }

        .scene {
          margin-top: 2rem;
          padding-top: 1rem;
        }

        .scene-number {
          font-size: 0.75rem;
          color: #94a3b8;
          text-align: center;
          margin-bottom: 0.25rem;
        }

        .scene-heading {
          font-size: 1.25rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #14b8a6;
        }

        .scene-meta {
          text-align: center;
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 1rem;
        }

        .scene-summary {
          font-size: 0.85rem;
          color: #475569;
          font-style: italic;
          margin-bottom: 1.25rem;
          padding: 0.75rem 1rem;
          background: #f1f5f9;
          border-radius: 6px;
          border-right: 3px solid #14b8a6;
          line-height: 1.8;
        }

        .description {
          font-size: 0.85rem;
          color: #64748b;
          font-style: italic;
          margin: 0.75rem 0;
          padding-right: 1.5rem;
          border-right: 2px solid #e2e8f0;
          line-height: 1.8;
        }

        .dialogue-block { margin: 0.75rem 0; }

        .dialogue-char {
          text-align: center;
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 0.1rem;
        }

        .dialogue-text {
          font-size: 0.9rem;
          max-width: 70%;
          margin: 0 auto;
          padding: 0.1rem 1.5rem;
          line-height: 1.9;
        }

        .page-footer {
          text-align: center;
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 3rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e2e8f0;
        }
      `}</style>

      <div className="print-page">
        <PrintToolbar projectId={id} />

        {/* Cover */}
        <div className="cover-page">
          <div className="sep" />
          <h1>{project.title}</h1>
          <p className="meta">فیلمنامه کامل</p>
          <p className="meta" style={{ marginTop: 8 }}>{scenes.length} صحنه</p>
        </div>

        {/* Scenes */}
        {scenes.map((scene, i) => (
          <div key={i} className={`scene ${i > 0 ? "scene-break" : ""}`}>
            <div className="scene-number">صحنه {i + 1}</div>
            <div className="scene-heading">{scene.title}</div>

            {(scene.setting || scene.timeOfDay) && (
              <div className="scene-meta">
                {[scene.setting, scene.timeOfDay].filter(Boolean).join(" — ")}
              </div>
            )}

            {scene.summary && (
              <div className="scene-summary">{scene.summary}</div>
            )}

            {scene.content.map((item, ci) =>
              item.type === "description" ? (
                <div key={ci} className="description">{item.text}</div>
              ) : (
                <div key={ci} className="dialogue-block">
                  <div className="dialogue-char">{item.characterName}</div>
                  <div className="dialogue-text">{item.text}</div>
                </div>
              )
            )}
          </div>
        ))}

        <div className="page-footer">{project.title} — فیلمنامه</div>
      </div>
    </>
  )
}
