"use client"

import React, { useEffect, useRef, useState } from "react"

interface VirtualizedGridProps<T> {
  items: T[]
  itemHeight?: number
  buffer?: number
  className?: string
  renderItem: (item: T) => React.ReactElement
}

export function VirtualizedGrid<T>({
  items,
  itemHeight = 200,
  buffer = 3,
  className,
  renderItem,
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [height, setHeight] = useState(600)

  useEffect(() => {
    const el = containerRef.current
    const measure = () => setHeight(el?.clientHeight || Math.min(600, Math.round(window.innerHeight * 0.6)))
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  const visibleCount = Math.ceil(height / itemHeight) + buffer * 2
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
  const endIndex = Math.min(items.length, startIndex + visibleCount)

  const offsetY = startIndex * itemHeight
  const totalHeight = items.length * itemHeight

  const visibleItems = items.slice(startIndex, endIndex)

  return (
    <div ref={containerRef} onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)} className={className || "overflow-auto"} style={{ maxHeight: "60vh" }}>
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ position: "absolute", top: offsetY, left: 0, right: 0 }}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((it) => renderItem(it))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VirtualizedGrid
