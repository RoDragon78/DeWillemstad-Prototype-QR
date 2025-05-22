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

// Reorganized table positions in clear columns with larger sizes
const TABLE_POSITIONS: Record<
  number,
  { x: number; y: number; width: number; height: number; shape: "rect" | "circle" }
> = {
  // Left column (tables 1-4)
  1: { x: 50, y: 50, width: 100, height: 100, shape: "rect" },
  2: { x: 50, y: 170, width: 140, height: 70, shape: "rect" },
  3: { x: 50, y: 260, width: 140, height: 70, shape: "rect" },
  4: { x: 50, y: 350, width: 100, height: 100, shape: "rect" },

  // Middle-left column (tables 6-9)
  6: { x: 250, y: 400, width: 140, height: 70, shape: "rect" },
  7: { x: 250, y: 300, width: 100, height: 100, shape: "rect" },
  8: { x: 250, y: 170, width: 90, height: 90, shape: "circle" },
  9: { x: 250, y: 50, width: 90, height: 90, shape: "circle" },

  // Middle-right column (tables 10-13)
  10: { x: 450, y: 50, width: 90, height: 90, shape: "circle" },
  11: { x: 450, y: 170, width: 90, height: 90, shape: "circle" },
  12: { x: 450, y: 300, width: 100, height: 100, shape: "rect" },
  13: { x: 450, y: 400, width: 90, height: 90, shape: "circle" },

  // Bottom center (table 14)
  14: { x: 320, y: 500, width: 160, height: 70, shape: "rect" },

  // Right column (tables 16-20)
  16: { x: 650, y: 450, width: 100, height: 100, shape: "rect" },
  17: { x: 650, y: 350, width: 140, height: 70, shape: "rect" },
  18: { x: 650, y: 260, width: 140, height: 70, shape: "rect" },
  19: { x: 650, y: 170, width: 140, height: 70, shape: "rect" },
  20: { x: 650, y: 50, width: 100, height: 100, shape: "rect" },
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

  // Get color based on occupancy - new color scheme
  const getTableColor = (tableNumber: number) => {
    const occupancy = getTableOccupancy(tableNumber)

    if (occupancy === 0) return "rgb(243, 244, 246)" // Empty - light gray
    if (occupancy <= 50) return "rgb(220, 252, 231)" // Low - light green
    if (occupancy <= 90) return "rgb(254, 240, 138)" // Medium - light amber
    if (occupancy < 100) return "rgb(254, 215, 170)" // High - light orange
    return "rgb(254, 226, 226)" // Full - light red
  }

  // Get border color based on occupancy - new color scheme
  const getTableBorderColor = (tableNumber: number) => {
    const occupancy = getTableOccupancy(tableNumber)

    if (occupancy === 0) return "rgb(59, 130, 246)" // Empty - blue
    if (occupancy <= 50) return "rgb(22, 163, 74)" // Low - green
    if (occupancy <= 90) return "rgb(202, 138, 4)" // Medium - amber
    if (occupancy < 100) return "rgb(234, 88, 12)" // High - orange
    return "rgb(220, 38, 38)" // Full - red
  }

  // Handle table click
  const handleTableClick = (tableNumber: number) => {
    setSelectedTable(tableNumber)
    setDialogOpen(true)
  }

  return (
    <div className="relative w-full" style={{ height: "600px" }}>
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
              fontSize="16"
              className="select-none"
            >
              {tableNumber}
            </text>
          </g>
        ))}

        {/* Occupancy legend - moved to bottom left under table 4 */}
        <g transform="translate(50, 480)">
          <text x="0" y="0" fontWeight="medium" fontSize="12">
            Occupancy:
          </text>

          <circle cx="10" cy="20" r="6" fill="rgb(243, 244, 246)" stroke="rgb(59, 130, 246)" strokeWidth="2" />
          <text x="25" y="24" fontSize="12">
            Empty
          </text>

          <circle cx="10" cy="45" r="6" fill="rgb(220, 252, 231)" stroke="rgb(22, 163, 74)" strokeWidth="2" />
          <text x="25" y="49" fontSize="12">
            1-50%
          </text>

          <circle cx="10" cy="70" r="6" fill="rgb(254, 240, 138)" stroke="rgb(202, 138, 4)" strokeWidth="2" />
          <text x="25" y="74" fontSize="12">
            51-90%
          </text>

          <circle cx="80" cy="20" r="6" fill="rgb(254, 215, 170)" stroke="rgb(234, 88, 12)" strokeWidth="2" />
          <text x="95" y="24" fontSize="12">
            91-99%
          </text>

          <circle cx="80" cy="45" r="6" fill="rgb(254, 226, 226)" stroke="rgb(220, 38, 38)" strokeWidth="2" />
          <text x="95" y="49" fontSize="12">
            100%
          </text>
        </g>
      </svg>
    </div>
  )
}
