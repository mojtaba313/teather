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
          .print-wrap { width: 100% !important; padding: 0 !important; }
          .dialogue-card { break-inside: avoid; }
          .scene-break { page-break-before: always; }
        }

        .print-wrap {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding: 1.5rem 2rem;
          direction: rtl;
          background: #fafafa;
          min-height: 100vh;
          font-family: "Vazirmatn", system-ui, sans-serif;
        }

        @media print {
          .print-wrap {
            background: white;
            min-height: auto;
          }
        }

        .no-print {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 16px;
          margin-bottom: 24px;
          background: #0f172a;
          border-radius: 12px;
        }

        /* Cover */
        .cover {
          text-align: center;
          padding: 5rem 0 3rem;
        }
        .cover h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .cover .cover-meta {
          color: #64748b;
          font-size: 0.9rem;
        }
        .cover .cover-line {
          width: 50px;
          height: 3px;
          background: #14b8a6;
          margin: 1rem auto;
          border-radius: 2px;
        }

        /* Scene header — divider with centered title */
        .scene-wrap {
          margin-top: 1rem;
        }
        .scene-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .scene-header::before,
        .scene-header::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }
        .scene-header .scene-title {
          font-weight: 700;
          font-size: 1rem;
          color: #14b8a6;
          white-space: nowrap;
        }

        /* Scene details card */
        .scene-details {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          background: rgba(255, 255, 255, 0.5);
        }
        .detail-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 6px;
        }
        .detail-row:last-child { margin-bottom: 0; }
        .detail-icon {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }
        .scene-summary {
          font-size: 0.85rem;
          color: #64748b;
          padding-right: 1.25rem;
          border-right: 2px solid rgba(20, 184, 166, 0.2);
          line-height: 1.7;
          margin-top: 6px;
        }

        /* Description */
        .description-block {
          position: relative;
          padding-right: 1rem;
          margin-right: 0.5rem;
          border-right: 2px solid #e2e8f0;
          margin-bottom: 12px;
        }
        .description-block p {
          font-size: 0.85rem;
          color: #64748b;
          font-style: italic;
          line-height: 1.7;
        }

        /* Dialogue card */
        .dialogue-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 12px;
          background: white;
          page-break-inside: avoid;
        }
        .dialogue-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .dialogue-line {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: #f1f5f9;
          font-size: 0.75rem;
          font-family: monospace;
          color: #94a3b8;
        }
        .dialogue-char {
          display: inline-block;
          padding: 2px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .dialogue-text {
          font-size: 0.9rem;
          line-height: 1.8;
        }

        /* Footer */
        .print-footer {
          text-align: center;
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 3rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e2e8f0;
        }
      `}</style>

      <div className="print-wrap">
        <PrintToolbar projectId={id} />

        {/* Cover */}
        <div className="cover">
          <div className="cover-line" />
          <h1>{project.title}</h1>
          <p className="cover-meta">فیلمنامه کامل</p>
          <p className="cover-meta" style={{ marginTop: 8 }}>{scenes.length} صحنه</p>
        </div>

        {/* Scenes */}
        {scenes.map((scene, i) => (
          <div key={i} className={`scene-wrap ${i > 0 ? "scene-break" : ""}`}>
            {/* Scene header — divider with centered title */}
            <div className="scene-header">
              <span className="scene-title">{scene.title}</span>
            </div>

            {/* Scene details card */}
            {(scene.setting || scene.timeOfDay || scene.summary) && (
              <div className="scene-details">
                {scene.setting && (
                  <div className="detail-row">
                    <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{scene.setting}</span>
                  </div>
                )}
                {scene.timeOfDay && (
                  <div className="detail-row">
                    <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                    <span>{scene.timeOfDay}</span>
                  </div>
                )}
                {scene.summary && (
                  <div className="scene-summary">{scene.summary}</div>
                )}
              </div>
            )}

            {/* Scene content */}
            {scene.content.map((item, ci) =>
              item.type === "description" ? (
                <div key={ci} className="description-block">
                  <p>{item.text}</p>
                </div>
              ) : (
                <div key={ci} className="dialogue-card">
                  <div className="dialogue-header">
                    <span className="dialogue-line">{item.lineOrder + 1}</span>
                    <span className="dialogue-char">{item.characterName}</span>
                  </div>
                  <div className="dialogue-text">{item.text}</div>
                </div>
              )
            )}
          </div>
        ))}

        <div className="print-footer">{project.title} — فیلمنامه</div>
      </div>
    </>
  )
}
