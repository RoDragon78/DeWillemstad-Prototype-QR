"use client"

import type React from "react"

import { useDrop } from "react-dnd"
import { useState } from "react"

interface DroppableTableProps {
  tableNumber: number
  capacity: number
  currentOccupancy: number
  onDrop: (guestId: string, tableNumber: number) => Promise<void>
  children: React.ReactNode
}

export function DroppableTable({ tableNumber, capacity, currentOccupancy, onDrop, children }: DroppableTableProps) {
  const [isOver, setIsOver] = useState(false)
  const [canDrop, setCanDrop] = useState(true)

  const [{ isOverCurrent }, drop] = useDrop(
    () => ({
      accept: "GUEST",
      drop: async (item: { guest: { id: string } }) => {
        await onDrop(item.guest.id, tableNumber)
      },
      canDrop: (item, monitor) => {
        // Check if table has capacity
        return currentOccupancy < capacity
      },
      collect: (monitor) => ({
        isOverCurrent: !!monitor.isOver(),
      }),
      hover: (item, monitor) => {
        setIsOver(monitor.isOver())
        setCanDrop(currentOccupancy < capacity)
      },
    }),
    [tableNumber, capacity, currentOccupancy, onDrop],
  )

  return (
    <div
      ref={drop}
      className={`relative ${isOverCurrent ? (canDrop ? "ring-2 ring-green-400" : "ring-2 ring-red-400") : ""}`}
    >
      {isOverCurrent && (
        <div
          className={`absolute inset-0 bg-opacity-20 z-10 pointer-events-none ${
            canDrop ? "bg-green-200" : "bg-red-200"
          }`}
        >
          {!canDrop && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">Table full</div>
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
