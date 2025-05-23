"use client"
import { useDrag } from "react-dnd"
import { User } from "lucide-react"

interface DraggableGuestProps {
  guest: {
    id: string
    guest_name: string
    cabin_nr: string
    nationality?: string
    table_nr?: number
  }
}

export function DraggableGuest({ guest }: DraggableGuestProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "GUEST",
    item: { guest },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  return (
    <div
      ref={drag}
      className={`flex items-center p-2 rounded border text-sm cursor-move ${
        isDragging ? "opacity-50 bg-blue-50" : "bg-white hover:bg-gray-50"
      }`}
    >
      <User className="h-3 w-3 mr-1 text-gray-400" />
      <span className="font-medium">{guest.guest_name || "Unknown"}</span>
      {guest.nationality && <span className="ml-1 text-xs text-gray-500">({guest.nationality})</span>}
    </div>
  )
}
