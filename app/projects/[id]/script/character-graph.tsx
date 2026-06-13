"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { Button } from "@/src/components/ui/Button"
import { X, Share2 } from "lucide-react"
import { Portal } from "@/src/components/ui/Portal"

interface Character {
  id: string
  name: string
}

interface Scene {
  orderIndex: number
  content: { type: string; characterId?: string }[]
}

interface CharacterGraphProps {
  scenes: Scene[]
  characters: Character[]
}

interface Node {
  id: string
  name: string
  x: number
  y: number
  vx: number
  vy: number
}

interface Edge {
  source: number
  target: number
}

const COLORS = [
  "#14b8a6", "#f43f5e", "#8b5cf6", "#f59e0b", "#3b82f6",
  "#10b981", "#ec4899", "#6366f1", "#ef4444", "#06b6d4",
  "#84cc16", "#a855f7", "#eab308", "#0ea5e9", "#22c55e",
]

function forceLayout(nodes: Node[], edges: Edge[], width: number, height: number) {
  const centerX = width / 2
  const centerY = height / 2

  for (const node of nodes) {
    node.x = centerX + (Math.random() - 0.5) * width * 0.5
    node.y = centerY + (Math.random() - 0.5) * height * 0.5
    node.vx = 0
    node.vy = 0
  }

  const iterations = 80
  const repulsion = 80000
  const attraction = 0.005
  const damping = 0.85
  const centerGravity = 0.01

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x
        let dy = nodes[j].y - nodes[i].y
        let dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 1) dist = 1
        const force = repulsion / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        nodes[i].vx -= fx
        nodes[i].vy -= fy
        nodes[j].vx += fx
        nodes[j].vy += fy
      }
    }

    for (const edge of edges) {
      let dx = nodes[edge.target].x - nodes[edge.source].x
      let dy = nodes[edge.target].y - nodes[edge.source].y
      let dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) dist = 1
      const force = dist * attraction
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      nodes[edge.source].vx += fx
      nodes[edge.source].vy += fy
      nodes[edge.target].vx -= fx
      nodes[edge.target].vy -= fy
    }

    for (const node of nodes) {
      node.vx += (centerX - node.x) * centerGravity
      node.vy += (centerY - node.y) * centerGravity
      node.vx *= damping
      node.vy *= damping
      node.x += node.vx
      node.y += node.vy
    }
  }
}

export function CharacterGraph({ scenes, characters }: CharacterGraphProps) {
  const [open, setOpen] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  const { nodes, edges } = useMemo(() => {
    const activeChars = new Set<string>()
    const sceneCharSets = scenes.map((s) => {
      const charIds = new Set(
        s.content.filter((c) => c.type === "dialogue").map((d) => d.characterId!).filter(Boolean)
      )
      for (const id of charIds) activeChars.add(id)
      return charIds
    })

    const charMap = new Map(characters.map((c) => [c.id, c]))
    const nodeList: Node[] = []
    const idToIndex = new Map<string, number>()

    for (const c of characters) {
      if (activeChars.has(c.id)) {
        idToIndex.set(c.id, nodeList.length)
        nodeList.push({ id: c.id, name: c.name, x: 0, y: 0, vx: 0, vy: 0 })
      }
    }

    const edgeList: Edge[] = []
    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const appearTogether = sceneCharSets.some(
          (sc) => sc.has(nodeList[i].id) && sc.has(nodeList[j].id)
        )
        if (appearTogether) {
          edgeList.push({ source: i, target: j })
        }
      }
    }

    return { nodes: nodeList, edges: edgeList }
  }, [scenes, characters])

  const positionedNodes = useMemo(() => {
    const copy = nodes.map((n) => ({ ...n }))
    if (copy.length > 0) {
      forceLayout(copy, edges, 500, 400)
    }
    return copy
  }, [nodes, edges])

  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>()
    const connected = new Set<string>([hoveredNode])
    const hoverIdx = nodes.findIndex((n) => n.id === hoveredNode)
    if (hoverIdx === -1) return connected
    for (const edge of edges) {
      if (edge.source === hoverIdx) connected.add(nodes[edge.target].id)
      if (edge.target === hoverIdx) connected.add(nodes[edge.source].id)
    }
    return connected
  }, [hoveredNode, nodes, edges])

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="gap-2">
        <Share2 className="h-4 w-4" />
        گراف شخصیت‌ها
      </Button>

      {open && (
        <Portal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--badge-bg)]">
                  <Share2 className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <h2 className="text-lg font-bold">گراف ارتباط شخصیت‌ها</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {positionedNodes.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">
                شخصیت‌های فعالی یافت نشد
              </div>
            ) : (
              <div className="relative">
                <svg
                  ref={svgRef}
                  viewBox="0 0 500 400"
                  className="w-full h-auto max-h-[60vh] rounded-xl bg-[var(--badge-bg)]/30"
                >
                  {/* Edges */}
                  {edges.map((edge, i) => {
                    const source = positionedNodes[edge.source]
                    const target = positionedNodes[edge.target]
                    const isHighlighted =
                      !hoveredNode ||
                      (connectedNodes.has(source.id) && connectedNodes.has(target.id))
                    return (
                      <line
                        key={`e-${i}`}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={isHighlighted ? "var(--card-border)" : "var(--badge-bg)"}
                        strokeWidth={isHighlighted ? 1.5 : 0.5}
                        className="transition-all duration-300"
                      />
                    )
                  })}

                  {/* Nodes */}
                  {positionedNodes.map((node, i) => {
                    const isHovered = hoveredNode === node.id
                    const isConnected = connectedNodes.has(node.id)
                    const dimmed = hoveredNode && !isConnected
                    const color = COLORS[i % COLORS.length]
                    return (
                      <g
                        key={node.id}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        className="transition-all duration-300"
                        style={{ cursor: "pointer" }}
                      >
                        {/* Glow for hovered */}
                        {isHovered && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={28}
                            fill="none"
                            stroke={color}
                            strokeWidth={2}
                            opacity={0.3}
                          >
                            <animate
                              attributeName="r"
                              values="28;34;28"
                              dur="2s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.3;0.1;0.3"
                              dur="2s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        )}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isHovered ? 22 : 18}
                          fill={dimmed ? "var(--badge-bg)" : color}
                          stroke={isHovered ? color : "transparent"}
                          strokeWidth={isHovered ? 3 : 0}
                          className="transition-all duration-300"
                          style={{ filter: isHovered ? "brightness(1.1)" : "none" }}
                        />
                        <text
                          x={node.x}
                          y={node.y + 34}
                          textAnchor="middle"
                          className="text-xs transition-all duration-300"
                          fill={dimmed ? "var(--muted-foreground)" : "var(--foreground)"}
                          style={{
                            fontWeight: isHovered ? "bold" : "normal",
                            fontSize: isHovered ? "13px" : "11px",
                          }}
                        >
                          {node.name}
                        </text>
                      </g>
                    )
                  })}
                </svg>
                {hoveredNode && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs text-[var(--muted)] shadow-sm">
                    {nodes.find((n) => n.id === hoveredNode)?.name} —{" "}
                    {connectedNodes.size - 1} ارتباط
                  </div>
                )}
              </div>
            )}

            <p className="mt-3 text-xs text-center text-[var(--muted-foreground)]">
              هر خط نشان‌دهنده حضور دو شخصیت در یک صحنه مشترک است
            </p>
          </div>
        </div>
        </Portal>
      )}
    </>
  )
}
