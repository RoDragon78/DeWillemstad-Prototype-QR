"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Users, AlertCircle, CheckCircle, X } from "lucide-react"

// Updated table positions with capacity-appropriate sizes and better spacing
const TABLE_POSITIONS = {
  // Row 1 - Top row (4, 4, 4, 4)
  1: { x: 50, y: 30, width: 80, height: 60, shape: "rect" }, // 4-person
  9: { x: 180, y: 30, width: 80, height: 60, shape: "rect" }, // 4-person
  10: { x: 310, y: 30, width: 80, height: 60, shape: "rect" }, // 4-person
  20: { x: 440, y: 30, width: 80, height: 60, shape: "rect" }, // 4-person

  // Row 2 (6, 4, 4, 6)
  2: { x: 50, y: 120, width: 120, height: 60, shape: "rect" }, // 6-person
  8: { x: 200, y: 120, width: 80, height: 60, shape: "rect" }, // 4-person
  11: { x: 310, y: 120, width: 80, height: 60, shape: "rect" }, // 4-person
  19: { x: 420, y: 120, width: 120, height: 60, shape: "rect" }, // 6-person

  // Row 3 (6, 4, 4, 6)
  3: { x: 50, y: 210, width: 120, height: 60, shape: "rect" }, // 6-person
  7: { x: 200, y: 210, width: 80, height: 60, shape: "rect" }, // 4-person
  12: { x: 310, y: 210, width: 80, height: 60, shape: "rect" }, // 4-person
  18: { x: 420, y: 210, width: 120, height: 60, shape: "rect" }, // 6-person

  // Row 4 (4, 6, 4, 6)
  4: { x: 50, y: 300, width: 80, height: 60, shape: "rect" }, // 4-person
  6: { x: 160, y: 300, width: 120, height: 60, shape: "rect" }, // 6-person
  13: { x: 310, y: 300, width: 80, height: 60, shape: "rect" }, // 4-person
  17: { x: 420, y: 300, width: 120, height: 60, shape: "rect" }, // 6-person

  // Row 5 - Bottom row (14, 15, 16)
  14: { x: 130, y: 390, width: 140, height: 80, shape: "rect" }, // 8-person (first)
  15: { x: 300, y: 390, width: 120, height: 60, shape: "rect" }, // 6-person (middle)
  16: { x: 450, y: 390, width: 80, height: 60, shape: "rect" }, // 4-person (last)
}

// Updated table capacity configuration - table 14 is the only 8-person table
const TABLE_CAPACITIES = {
  1: 4,
  2: 6,
  3: 6,
  4: 4,
  6: 6,
  7: 4,
  8: 4,
  9: 4,
  10: 4,
  11: 4,
  12: 4,
  13: 4,
  14: 8, // Only 8-person table
  15: 6,
  16: 4,
  17: 6,
  18: 6,
  19: 6,
  20: 4,
}

export function FloorPlan({ tableCapacities, tableAssignments, guests, onTableUpdate }) {
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableGuests, setTableGuests] = useState([])
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [removingGuest, setRemovingGuest] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const supabase = createClientComponentClient()

  // Get table color based on occupancy
  const getTableColor = (tableNumber) => {
    const capacity = tableCapacities[tableNumber] || 0
    const currentGuests = guests.filter((guest) => guest.table_nr === tableNumber).length
    const occupancyRate = capacity > 0 ? currentGuests / capacity : 0

    if (currentGuests === 0) return "rgb(229, 231, 235)" // Empty - gray
    if (occupancyRate <= 0.25) return "rgb(191, 219, 254)" // 1-25% - light blue
    if (occupancyRate <= 0.5) return "rgb(147, 197, 253)" // 26-50% - medium light blue
    if (occupancyRate <= 0.75) return "rgb(96, 165, 250)" // 51-75% - medium blue
    if (occupancyRate < 1) return "rgb(59, 130, 246)" // 76-99% - blue
    return "rgb(37, 99, 235)" // 100% - dark blue
  }

  // Get occupancy text for display
  const getOccupancyText = (tableNumber) => {
    const capacity = tableCapacities[tableNumber] || 0
    const currentGuests = guests.filter((guest) => guest.table_nr === tableNumber).length
    return `${currentGuests}/${capacity}`
  }

  // Handle table click to show guests
  const handleTableClick = async (tableNumber) => {
    try {
      setSelectedTable(tableNumber)

      const { data, error } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("table_nr", tableNumber)
        .order("cabin_nr", { ascending: true })

      if (error) {
        console.error("Error fetching table guests:", error)
        throw error
      }

      setTableGuests(data || [])
      setShowTableDialog(true)
    } catch (error) {
      console.error("Error fetching table guests:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to fetch table guests. Please try again.",
      })
    }
  }

  // Remove individual guest from table
  const removeGuestFromTable = async (guestId, guestName) => {
    try {
      setRemovingGuest(true)

      const { error } = await supabase.from("guest_manifest").update({ table_nr: null }).eq("id", guestId)

      if (error) {
        console.error("Error removing guest:", error)
        throw error
      }

      // Refresh table guests
      const { data, error: fetchError } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("table_nr", selectedTable)
        .order("cabin_nr", { ascending: true })

      if (fetchError) {
        console.error("Error fetching updated table guests:", fetchError)
        throw fetchError
      }

      setTableGuests(data || [])

      // Trigger parent update
      if (onTableUpdate) {
        onTableUpdate()
      }

      setStatusMessage({
        type: "success",
        message: `${guestName} has been removed from Table ${selectedTable}.`,
      })
    } catch (error) {
      console.error("Error removing guest:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to remove guest. Please try again.",
      })
    } finally {
      setRemovingGuest(false)
    }
  }

  // Render tables with occupancy display
  const renderTables = () => {
    const tables = []
    const tableNumbers = Object.keys(TABLE_POSITIONS)

    for (let i = 0; i < tableNumbers.length; i++) {
      const tableNumber = tableNumbers[i]
      const position = TABLE_POSITIONS[tableNumber]
      const tableNum = Number.parseInt(tableNumber, 10)
      const occupancyText = getOccupancyText(tableNum)

      // Render table shape
      if (position.shape === "rect") {
        tables.push(
          <rect
            key={tableNumber}
            x={position.x}
            y={position.y}
            width={position.width}
            height={position.height}
            rx={10}
            ry={10}
            fill={getTableColor(tableNum)}
            stroke="rgb(75, 85, 99)"
            strokeWidth={2}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleTableClick(tableNum)}
          />,
        )
      } else {
        tables.push(
          <circle
            key={tableNumber}
            cx={position.x + position.width / 2}
            cy={position.y + position.height / 2}
            r={position.width / 2}
            fill={getTableColor(tableNum)}
            stroke="rgb(75, 85, 99)"
            strokeWidth={2}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleTableClick(tableNum)}
          />,
        )
      }

      // Add table number
      tables.push(
        <text
          key={`table-${tableNumber}`}
          x={position.x + position.width / 2}
          y={position.y + position.height / 2 - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontWeight="bold"
          fontSize="16"
          className="select-none pointer-events-none"
        >
          {tableNumber}
        </text>,
      )

      // Add occupancy text
      tables.push(
        <text
          key={`occupancy-${tableNumber}`}
          x={position.x + position.width / 2}
          y={position.y + position.height / 2 + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontWeight="medium"
          fontSize="12"
          className="select-none pointer-events-none"
        >
          {occupancyText}
        </text>,
      )
    }

    return tables
  }

  // Render compact occupancy legend
  const renderOccupancyLegend = () => {
    const legendItems = [
      { label: "Empty", color: "rgb(229, 231, 235)" },
      { label: "1-25%", color: "rgb(191, 219, 254)" },
      { label: "26-50%", color: "rgb(147, 197, 253)" },
      { label: "51-75%", color: "rgb(96, 165, 250)" },
      { label: "76-99%", color: "rgb(59, 130, 246)" },
      { label: "100%", color: "rgb(37, 99, 235)" },
    ]

    return (
      <g transform="translate(20, 480)">
        <text x="0" y="0" fontWeight="medium" fontSize="11" fill="rgb(75, 85, 99)">
          Occupancy:
        </text>
        {legendItems.map((item, index) => {
          const yPos = 15 + Math.floor(index / 2) * 20
          const xPos = (index % 2) * 80

          return (
            <g key={item.label} transform={`translate(${xPos}, ${yPos})`}>
              <circle cx="6" cy="0" r="5" fill={item.color} stroke="rgb(75, 85, 99)" strokeWidth="1" />
              <text x="16" y="3" fontSize="10" fill="rgb(75, 85, 99)">
                {item.label}
              </text>
            </g>
          )
        })}
      </g>
    )
  }

  return (
    <div className="space-y-4">
      {statusMessage && (
        <Alert
          className={`${
            statusMessage.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={statusMessage.type === "success" ? "text-green-700" : "text-red-700"}>
            {statusMessage.message}
          </AlertDescription>
          <Button variant="ghost" size="sm" className="ml-auto h-8 w-8 p-0" onClick={() => setStatusMessage(null)}>
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      <div className="border rounded-lg overflow-hidden">
        <svg width="100%" height="580" viewBox="0 0 650 580" className="bg-white">
          <rect x="0" y="0" width="650" height="580" fill="white" />
          {renderTables()}
          {renderOccupancyLegend()}
        </svg>
      </div>

      {/* Table Guests Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Table {selectedTable} Guests</span>
              <span className="text-sm font-normal text-gray-500">
                {tableGuests.length}/{tableCapacities[selectedTable] || 0} seats
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {tableGuests.length > 0 ? (
              <div className="space-y-2">
                {tableGuests.map((guest) => (
                  <div key={guest.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-medium">{guest.guest_name}</div>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>Cabin {guest.cabin_nr}</span>
                          {guest.nationality && (
                            <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-xs">{guest.nationality}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeGuestFromTable(guest.id, guest.guest_name)}
                      disabled={removingGuest}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No guests assigned to this table</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
