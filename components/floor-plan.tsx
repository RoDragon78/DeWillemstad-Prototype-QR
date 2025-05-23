"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Trash2 } from "lucide-react"

// Simplified table positions
const TABLE_POSITIONS = {
  1: { x: 50, y: 50, width: 100, height: 100, shape: "rect" },
  2: { x: 50, y: 170, width: 140, height: 70, shape: "rect" },
  3: { x: 50, y: 260, width: 140, height: 70, shape: "rect" },
  4: { x: 50, y: 350, width: 100, height: 100, shape: "rect" },
  6: { x: 250, y: 400, width: 140, height: 70, shape: "rect" },
  7: { x: 250, y: 220, width: 100, height: 100, shape: "rect" },
  8: { x: 250, y: 120, width: 90, height: 90, shape: "circle" },
  9: { x: 250, y: 20, width: 90, height: 90, shape: "circle" },
  10: { x: 450, y: 20, width: 90, height: 90, shape: "circle" },
  11: { x: 450, y: 120, width: 90, height: 90, shape: "circle" },
  12: { x: 450, y: 220, width: 100, height: 100, shape: "rect" },
  13: { x: 450, y: 400, width: 90, height: 90, shape: "circle" },
  14: { x: 320, y: 500, width: 160, height: 70, shape: "rect" },
  16: { x: 650, y: 450, width: 100, height: 100, shape: "rect" },
  17: { x: 650, y: 350, width: 140, height: 70, shape: "rect" },
  18: { x: 650, y: 260, width: 140, height: 70, shape: "rect" },
  19: { x: 650, y: 170, width: 140, height: 70, shape: "rect" },
  20: { x: 650, y: 50, width: 100, height: 100, shape: "rect" },
}

export function FloorPlan(props) {
  const tableCapacities = props.tableCapacities || {}
  const tableAssignments = props.tableAssignments || []
  const guests = props.guests || []
  const onTableUpdate = props.onTableUpdate

  const [selectedTable, setSelectedTable] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tableGuests, setTableGuests] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [removingGuest, setRemovingGuest] = useState(false)
  const tableGuestsRef = useRef(null)
  const supabase = createClientComponentClient()

  // Fetch fresh data for the selected table when dialog opens
  useEffect(() => {
    if (selectedTable && dialogOpen) {
      fetchTableGuests(selectedTable)
    }
  }, [selectedTable, dialogOpen])

  // Set up real-time subscription for guest_manifest table
  useEffect(() => {
    const subscription = supabase
      .channel("guest_manifest_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guest_manifest",
        },
        (payload) => {
          console.log("Change received in FloorPlan:", payload)
          // If we have a selected table open, refresh its data
          if (selectedTable && dialogOpen) {
            fetchTableGuests(selectedTable)
          }
          // Notify parent component to refresh all data
          if (onTableUpdate) {
            onTableUpdate()
          }
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, selectedTable, dialogOpen, onTableUpdate])

  // Fetch guests for a specific table directly from Supabase
  const fetchTableGuests = async (tableNumber) => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase.from("guest_manifest").select("*").eq("table_nr", tableNumber)

      if (error) {
        console.error("Error fetching table guests:", error)
        setError("Error fetching table guests: " + error.message)
        return
      }

      console.log("Fetched table guests:", data)
      setTableGuests(data || [])
    } catch (err) {
      console.error("Error in fetchTableGuests:", err)
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Remove a guest from a table
  const removeGuestFromTable = async (guestId) => {
    try {
      setRemovingGuest(true)

      const { error } = await supabase.from("guest_manifest").update({ table_nr: null }).eq("id", guestId)

      if (error) {
        console.error("Error removing guest from table:", error)
        throw error
      }

      // Refresh the table guests
      fetchTableGuests(selectedTable)

      // Scroll back to position after state update
      if (tableGuestsRef.current) {
        setTimeout(() => {
          tableGuestsRef.current.scrollIntoView({ behavior: "auto", block: "nearest" })
        }, 100)
      }

      // Notify parent component to refresh all data
      if (onTableUpdate) {
        onTableUpdate()
      }
    } catch (error) {
      console.error("Error removing guest from table:", error)
      setError("Failed to remove guest from table")
    } finally {
      setRemovingGuest(false)
    }
  }

  // Get assignments for a specific table
  const getTableAssignments = (tableNumber) => {
    // Group guests by cabin and nationality
    const cabinGroups = {}

    for (let i = 0; i < tableGuests.length; i++) {
      const guest = tableGuests[i]
      // Make sure we have valid cabin number
      const cabinKey = guest.cabin_nr || "Unknown"
      const nationalityKey = guest.nationality || "Unknown"
      const key = cabinKey + "_" + nationalityKey

      if (!cabinGroups[key]) {
        cabinGroups[key] = []
      }
      cabinGroups[key].push(guest)
    }

    // Convert to table assignments format
    const result = []
    const keys = Object.keys(cabinGroups)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const guestsForKey = cabinGroups[key]
      const parts = key.split("_")
      const cabin = parts[0]
      const nationality = parts.length > 1 ? parts[1] : "Unknown"

      result.push({
        table_number: tableNumber,
        cabins: [cabin],
        nationality: nationality,
        booking_number: guestsForKey[0] ? guestsForKey[0].booking_number || "" : "",
        guests: guestsForKey,
      })
    }

    return result
  }

  // Get occupancy percentage for a table
  const getTableOccupancy = (tableNumber) => {
    const capacity = tableCapacities[tableNumber] || 0
    let count = 0
    for (let i = 0; i < guests.length; i++) {
      if (guests[i].table_nr === tableNumber) {
        count++
      }
    }
    return capacity > 0 ? (count / capacity) * 100 : 0
  }

  // Get color based on occupancy - blue gradient color scheme
  const getTableColor = (tableNumber) => {
    const occupancy = getTableOccupancy(tableNumber)

    if (occupancy === 0) return "rgb(239, 246, 255)" // Empty - lightest blue
    if (occupancy <= 25) return "rgb(219, 234, 254)" // 1-25% - very light blue
    if (occupancy <= 50) return "rgb(191, 219, 254)" // 26-50% - light blue
    if (occupancy <= 75) return "rgb(147, 197, 253)" // 51-75% - medium blue
    if (occupancy < 100) return "rgb(96, 165, 250)" // 76-99% - blue
    return "rgb(59, 130, 246)" // 100% - darker blue
  }

  // Get border color based on occupancy - blue gradient color scheme
  const getTableBorderColor = (tableNumber) => {
    const occupancy = getTableOccupancy(tableNumber)

    if (occupancy === 0) return "rgb(191, 219, 254)" // Empty - light blue
    if (occupancy <= 25) return "rgb(147, 197, 253)" // 1-25% - medium light blue
    if (occupancy <= 50) return "rgb(96, 165, 250)" // 26-50% - medium blue
    if (occupancy <= 75) return "rgb(59, 130, 246)" // 51-75% - blue
    if (occupancy < 100) return "rgb(37, 99, 235)" // 76-99% - medium dark blue
    return "rgb(29, 78, 216)" // 100% - dark blue
  }

  // Handle table click
  const handleTableClick = (tableNumber) => {
    setSelectedTable(tableNumber)
    setDialogOpen(true)
  }

  // Render table assignments
  const renderTableAssignments = () => {
    if (!selectedTable) return null

    const assignments = getTableAssignments(selectedTable)
    const rows = []

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i]

      for (let j = 0; j < assignment.guests.length; j++) {
        const guest = assignment.guests[j]
        rows.push(
          <tr key={guest.id}>
            <td className="px-2 py-1">{guest.cabin_nr}</td>
            <td className="px-2 py-1">{guest.guest_name}</td>
            <td className="px-2 py-1">{guest.nationality || "Unknown"}</td>
            <td className="px-2 py-1">
              <button
                onClick={() => removeGuestFromTable(guest.id)}
                disabled={removingGuest}
                className="text-red-500 hover:text-red-700 p-1"
                title="Remove guest from table"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </td>
          </tr>,
        )
      }
    }

    return rows
  }

  // Render table shapes
  const renderTables = () => {
    const tables = []
    const tableNumbers = Object.keys(TABLE_POSITIONS)

    for (let i = 0; i < tableNumbers.length; i++) {
      const tableNumber = tableNumbers[i]
      const position = TABLE_POSITIONS[tableNumber]
      const tableNum = Number.parseInt(tableNumber, 10)
      const isSelected = selectedTable === tableNum

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
            stroke={getTableBorderColor(tableNum)}
            strokeWidth={isSelected ? 3 : 2}
            onClick={() => handleTableClick(tableNum)}
            className="cursor-pointer hover:opacity-80 transition-opacity"
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
            stroke={getTableBorderColor(tableNum)}
            strokeWidth={isSelected ? 3 : 2}
            onClick={() => handleTableClick(tableNum)}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          />,
        )
      }
    }

    return tables
  }

  // Render table labels
  const renderTableLabels = () => {
    const labels = []
    const tableNumbers = Object.keys(TABLE_POSITIONS)

    for (let i = 0; i < tableNumbers.length; i++) {
      const tableNumber = tableNumbers[i]
      const position = TABLE_POSITIONS[tableNumber]

      labels.push(
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
        </g>,
      )
    }

    return labels
  }

  return (
    <div className="relative w-full" style={{ height: "600px" }}>
      {/* Table information dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
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
                  <h4 className="font-medium mb-2">Assigned Guests:</h4>
                  {isLoading ? (
                    <p className="text-gray-500">Loading...</p>
                  ) : error ? (
                    <p className="text-red-500">{error}</p>
                  ) : tableGuests.length > 0 ? (
                    <div ref={tableGuestsRef} className="max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1 text-left">Cabin</th>
                            <th className="px-2 py-1 text-left">Guest</th>
                            <th className="px-2 py-1 text-left">Nationality</th>
                            <th className="px-2 py-1 text-left w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">{renderTableAssignments()}</tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">No guests assigned to this table.</p>
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
        {renderTables()}

        {/* Table labels */}
        {renderTableLabels()}

        {/* Occupancy legend - blue gradient */}
        <g transform="translate(50, 480)">
          <text x="0" y="0" fontWeight="medium" fontSize="12">
            Occupancy:
          </text>

          <circle cx="10" cy="20" r="6" fill="rgb(239, 246, 255)" stroke="rgb(191, 219, 254)" strokeWidth="2" />
          <text x="25" y="24" fontSize="12">
            Empty
          </text>

          <circle cx="10" cy="45" r="6" fill="rgb(219, 234, 254)" stroke="rgb(147, 197, 253)" strokeWidth="2" />
          <text x="25" y="49" fontSize="12">
            1-25%
          </text>

          <circle cx="10" cy="70" r="6" fill="rgb(191, 219, 254)" stroke="rgb(96, 165, 250)" strokeWidth="2" />
          <text x="25" y="74" fontSize="12">
            26-50%
          </text>

          <circle cx="80" cy="20" r="6" fill="rgb(147, 197, 253)" stroke="rgb(59, 130, 246)" strokeWidth="2" />
          <text x="95" y="24" fontSize="12">
            51-75%
          </text>

          <circle cx="80" cy="45" r="6" fill="rgb(96, 165, 250)" stroke="rgb(37, 99, 235)" strokeWidth="2" />
          <text x="95" y="49" fontSize="12">
            76-99%
          </text>

          <circle cx="80" cy="70" r="6" fill="rgb(59, 130, 246)" stroke="rgb(29, 78, 216)" strokeWidth="2" />
          <text x="95" y="74" fontSize="12">
            100%
          </text>
        </g>
      </svg>
    </div>
  )
}
