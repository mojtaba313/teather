"use client"

import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"

export function PrintToolbar({ projectId }: { projectId: string }) {
  return (
    <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "12px 16px", marginBottom: 20, background: "#0f172a", borderRadius: 12 }}>
      <Link href={`/projects/${projectId}/script`} style={{ color: "#94a3b8", textDecoration: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
        <ArrowLeft className="h-4 w-4" />
        بازگشت
      </Link>
      <button
        onClick={() => window.print()}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 8, border: "none", background: "#14b8a6", color: "white", fontFamily: "inherit", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
      >
        <Printer className="h-4 w-4" />
        چاپ / ذخیره PDF
      </button>
      <span style={{ color: "#64748b", fontSize: 12 }}>Ctrl+P</span>
    </div>
  )
}
