"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface TableAssignment {
  table_number: number
  cabins: string[]
  nationality: string
  booking_number: string
}

interface Guest {
  id: string
  cruise_id: string
  cabin_number: string
  booking_number: string
  nationality: string
  table_nr?: number
  name: string
}

interface FloorPlanProps {
  tableCapacities: Record<number, number>
  tableAssignments: TableAssignment[]
  guests: Guest[]
}

// Table positions based on the floor plan image - removed tables 5 and 15
const TABLE_POSITIONS: Record<
  number,
  { x: number; y: number; width: number; height: number; shape: "rect" | "circle" }
> = {
  20: { x: 650, y: 60, width: 80, height: 80, shape: "rect" },
  19: { x: 650, y: 150, width: 120, height: 60, shape: "rect" },
  18: { x: 650, y: 240, width: 120, height: 60, shape: "rect" },
  17: { x: 650, y: 330, width: 120, height: 60, shape: "rect" },
  16: { x: 650, y: 450, width: 80, height: 80, shape: "rect" },
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

export function FloorPlan({ tableCapacities, tableAssignments, guests }: FloorPlanProps) {
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Get assignments for a specific table
  const getTableAssignments = (tableNumber: number) => {
    return tableAssignments.filter((a) => a.table_number === tableNumber)
  }

  // Get occupancy percentage for a table
  const getTableOccupancy = (tableNumber: number) => {
    const capacity = tableCapacities[tableNumber] || 0
    const assignedGuests = guests.filter((g) => g.table_nr === tableNumber).length
    return capacity > 0 ? (assignedGuests / capacity) * 100 : 0
  }

  // Get color based on occupancy
  const getTableColor = (tableNumber: number) => {
    const occupancy = getTableOccupancy(tableNumber)

    if (occupancy === 0) return "rgb(219, 234, 254)" // Empty - light blue
    if (occupancy < 50) return "rgb(220, 252, 231)" // Under 50% - light green
    if (occupancy < 100) return "rgb(254, 240, 138)" // 50-99% - light yellow
    return "rgb(254, 226, 226)" // 100% - light red
  }

  // Get border color based on occupancy
  const getTableBorderColor = (tableNumber: number) => {
    const occupancy = getTableOccupancy(tableNumber)

    if (occupancy === 0) return "rgb(59, 130, 246)" // Empty - blue
    if (occupancy < 50) return "rgb(22, 163, 74)" // Under 50% - green
    if (occupancy < 100) return "rgb(202, 138, 4)" // 50-99% - yellow
    return "rgb(220, 38, 38)" // 100% - red
  }

  // Handle table click
  const handleTableClick = (tableNumber: number) => {
    setSelectedTable(tableNumber)
    setDialogOpen(true)
  }

  return (
    <div className="relative w-full" style={{ height: "550px" }}>
      {/* Table information dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedTable && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Table {selectedTable}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <span className="font-medium">Capacity:</span>
                  <span>{tableCapacities[selectedTable]} guests</span>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <span className="font-medium">Occupancy:</span>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(getTableOccupancy(selectedTable), 100)}%`,
                          backgroundColor: getTableBorderColor(selectedTable),
                        }}
                      />
                    </div>
                    <span>{Math.round(getTableOccupancy(selectedTable))}%</span>
                  </div>
                </div>

                <div className="mt-2">
                  <h4 className="font-medium mb-2">Assigned Cabins:</h4>
                  {getTableAssignments(selectedTable).length > 0 ? (
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1 text-left">Cabin</th>
                            <th className="px-2 py-1 text-left">Guests</th>
                            <th className="px-2 py-1 text-left">Nationality</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {getTableAssignments(selectedTable).map((assignment, idx) => {
                            // Get guests for this assignment
                            const assignmentGuests = guests.filter(
                              (g) =>
                                g.table_nr === selectedTable &&
                                assignment.cabins.includes(g.cabin_number) &&
                                g.nationality === assignment.nationality,
                            )

                            return (
                              <tr key={idx}>
                                <td className="px-2 py-1">{assignment.cabins.join(", ")}</td>
                                <td className="px-2 py-1">{assignmentGuests.map((g) => g.name).join(", ")}</td>
                                <td className="px-2 py-1">{assignment.nationality}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">No cabins assigned to this table.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <div className="absolute top-2 left-2 bg-white p-2 rounded-md shadow-sm border text-xs">
        <div className="font-medium mb-1">Occupancy:</div>
        <div className="flex items-center gap-1 mb-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Empty</span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <div className="w-3 h-3 rounded-full bg-green-600"></div>
          <span>&lt;50%</span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
          <span>50-99%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-600"></div>
          <span>100%</span>
        </div>
      </div>

      {/* Floor plan */}
      <svg width="100%" height="100%" viewBox="0 0 750 550" className="border rounded">
        {/* Background */}
        <rect x="0" y="0" width="750" height="550" fill="white" />

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
              fill={getTableColor(tableNum)}
              stroke={getTableBorderColor(tableNum)}
              strokeWidth={isSelected ? 3 : 2}
              onClick={() => handleTableClick(tableNum)}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          ) : (
            <circle
              key={tableNumber}
              cx={position.x + position.width / 2}
              cy={position.y + position.height / 2}
              r={position.width / 2}
              fill={getTableColor(tableNum)}
              stroke={getTableBorderColor(tableNum)}
              strokeWidth={isSelected ? 3 : 2}
              onClick={() => handleTableClick(tableNum)}
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
