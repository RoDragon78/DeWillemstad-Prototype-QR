"use client"

import { useState } from "react"

interface TableAssignment {
  table_number: number
  cabins: string[]
  nationality: string
  booking_number: string
}

interface FloorPlanProps {
  tableCapacities: Record<number, number>
  tableAssignments: TableAssignment[]
}

// Table positions based on the floor plan image - removed tables 5 and 15
const TABLE_POSITIONS: Record<
  number,
  { x: number; y: number; width: number; height: number; shape: "rect" | "circle" }
> = {
  20: { x: 700, y: 60, width: 80, height: 80, shape: "rect" },
  19: { x: 700, y: 150, width: 120, height: 60, shape: "rect" },
  18: { x: 700, y: 240, width: 120, height: 60, shape: "rect" },
  17: { x: 700, y: 330, width: 120, height: 60, shape: "rect" },
  16: { x: 700, y: 450, width: 80, height: 80, shape: "rect" },
  14: { x: 320, y: 480, width: 160, height: 60, shape: "rect" },
  13: { x: 450, y: 380, width: 70, height: 70, shape: "circle" },
  12: { x: 450, y: 280, width: 80, height: 80, shape: "rect" },
  11: { x: 450, y: 170, width: 70, height: 70, shape: "circle" },
  10: { x: 450, y: 60, width: 70, height: 70, shape: "circle" },
  9: { x: 250, y: 60, width: 70, height: 70, shape: "circle" },
  8: { x: 250, y: 170, width: 70, height: 70, shape: "circle" },
  7: { x: 280, y: 300, width: 80, height: 80, shape: "rect" },
  6: { x: 280, y: 400, width: 120, height: 60, shape: "rect" },
  4: { x: 60, y: 320, width: 80, height: 80, shape: "rect" },
  3: { x: 60, y: 220, width: 120, height: 60, shape: "rect" },
  2: { x: 60, y: 150, width: 120, height: 60, shape: "rect" },
  1: { x: 60, y: 60, width: 80, height: 80, shape: "rect" },
}

export function FloorPlan({ tableCapacities, tableAssignments }: FloorPlanProps) {
  const [selectedTable, setSelectedTable] = useState<number | null>(null)

  // Get assignments for a specific table
  const getTableAssignments = (tableNumber: number) => {
    return tableAssignments.filter((a) => a.table_number === tableNumber)
  }

  return (
    <div className="relative w-full" style={{ height: "600px" }}>
      {/* Table information panel */}
      {selectedTable && (
        <div className="absolute right-4 top-4 z-10 w-64 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <h3 className="font-bold text-lg mb-2">Table {selectedTable}</h3>
          <p className="text-sm mb-1">Capacity: {tableCapacities[selectedTable]} guests</p>

          {getTableAssignments(selectedTable).length > 0 ? (
            <div className="mt-3">
              <h4 className="font-medium text-sm mb-1">Assigned Cabins:</h4>
              <ul className="text-sm space-y-1">
                {getTableAssignments(selectedTable).map((assignment, idx) => (
                  <li key={idx} className="border-b pb-1 last:border-0">
                    <span className="font-medium">{assignment.nationality}</span>: {assignment.cabins.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-2">No cabins assigned to this table.</p>
          )}

          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            onClick={() => setSelectedTable(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Floor plan */}
      <svg width="100%" height="100%" viewBox="0 0 800 600" className="border rounded">
        {/* Background */}
        <rect x="0" y="0" width="800" height="600" fill="white" />

        {/* Tables */}
        {Object.entries(TABLE_POSITIONS).map(([tableNumber, position]) => {
          const tableNum = Number.parseInt(tableNumber)
          const isSelected = selectedTable === tableNum

          return position.shape === "rect" ? (
            <rect
              key={tableNumber}
              x={position.x}
              y={position.y}
              width={position.width}
              height={position.height}
              rx={10}
              ry={10}
              fill="rgb(219, 234, 254)" // Always use light blue
              stroke={isSelected ? "rgb(37, 99, 235)" : "rgb(107, 114, 128)"}
              strokeWidth={isSelected ? 3 : 1}
              onClick={() => setSelectedTable(tableNum)}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          ) : (
            <circle
              key={tableNumber}
              cx={position.x + position.width / 2}
              cy={position.y + position.height / 2}
              r={position.width / 2}
              fill="rgb(219, 234, 254)" // Always use light blue
              stroke={isSelected ? "rgb(37, 99, 235)" : "rgb(107, 114, 128)"}
              strokeWidth={isSelected ? 3 : 1}
              onClick={() => setSelectedTable(tableNum)}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          )
        })}

        {/* Table labels */}
        {Object.entries(TABLE_POSITIONS).map(([tableNumber, position]) => (
          <g key={`label-${tableNumber}`}>
            <text
              x={position.x + position.width / 2}
              y={position.y + position.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgb(17, 24, 39)"
              fontWeight="bold"
              fontSize="14"
              className="select-none"
            >
              {tableNumber}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
