"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { clientStorage } from "@/utils/client-storage"

// Add the missing imports at the top of the file
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { FloorPlan } from "@/components/floor-plan"
import { DailyFloorPlan } from "@/components/daily-floor-plan"
import { GuestList } from "@/components/guest-list"
import { UnassignedGuests } from "@/components/unassigned-guests"
import { AlertCircle, CheckCircle, X, LogOut, Users, Calendar, Home, Trash2 } from "lucide-react"

// Updated table capacity configuration - added table 15
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
  14: 6,
  15: 6, // New table 15
  16: 4,
  17: 6,
  18: 6,
  19: 6,
  20: 4,
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const tableGuestsRef = useRef(null)
  const scrollPositionRef = useRef(0)
  const lastActionRef = useRef(null)

  // State
  const [loading, setLoading] = useState(true)
  const [assigningTables, setAssigningTables] = useState(false)
  const [tableAssignments, setTableAssignments] = useState([])
  const [guests, setGuests] = useState([])
  const [statusMessage, setStatusMessage] = useState(null)

  // Form state for adding a cabin manually
  const [newTableNumber, setNewTableNumber] = useState("")
  const [newCabinNumber, setNewCabinNumber] = useState("")

  // Add state for cabin suggestions
  const [cabinSuggestions, setCabinSuggestions] = useState([])
  const [cabinSearchOpen, setCabinSearchOpen] = useState(false)
  const [selectedCabinGuests, setSelectedCabinGuests] = useState([])

  // Add state for table guest preview
  const [tableGuestPreview, setTableGuestPreview] = useState([])
  const [showTablePreview, setShowTablePreview] = useState(false)
  const [removingGuest, setRemovingGuest] = useState(false)

  // Add state for confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [cabinToReassign, setCabinToReassign] = useState(null)
  const [currentTableNumber, setCurrentTableNumber] = useState(null)

  // Add state for dialog scroll positions
  const [dialogScrollPositions, setDialogScrollPositions] = useState({})

  // Add a more robust storeScrollPosition function
  const storeScrollPosition = () => {
    if (typeof window !== "undefined") {
      scrollPositionRef.current = window.scrollY

      // Store dialog scroll positions
      if (tableGuestsRef.current) {
        setDialogScrollPositions((prev) => ({
          ...prev,
          tableGuests: tableGuestsRef.current.scrollTop,
        }))
      }
    }
  }

  // Add a more robust restoreScrollPosition function
  const restoreScrollPosition = () => {
    if (typeof window !== "undefined" && scrollPositionRef.current !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current)

        // Restore dialog scroll positions
        if (tableGuestsRef.current && dialogScrollPositions.tableGuests !== undefined) {
          setTimeout(() => {
            if (tableGuestsRef.current) {
              tableGuestsRef.current.scrollTop = dialogScrollPositions.tableGuests
            }
          }, 100)
        }
      })
    }
  }

  // Calculate statistics
  const calculateStatistics = () => {
    const totalGuests = guests.length
    const assignedGuests = guests.filter((guest) => guest.table_nr !== null).length
    const unassignedGuests = totalGuests - assignedGuests

    // Get unique tables that have guests
    const usedTables = new Set(guests.filter((guest) => guest.table_nr !== null).map((guest) => guest.table_nr))
    const tablesUsed = usedTables.size

    // Calculate unassigned tables (tables that exist but have no guests)
    const totalTables = Object.keys(TABLE_CAPACITIES).length
    const unassignedTables = totalTables - tablesUsed

    // Calculate booking groups (unique booking numbers)
    const bookingGroups = new Set(guests.map((guest) => guest.booking_number).filter(Boolean)).size

    return {
      totalGuests,
      assignedGuests,
      unassignedGuests,
      tablesUsed,
      unassignedTables,
      bookingGroups,
    }
  }

  // Automatic table assignment algorithm
  const assignTablesAutomatically = async () => {
    try {
      setAssigningTables(true)
      storeScrollPosition()
      setStatusMessage(null)

      // Group guests by booking number and nationality
      const bookingGroups = {}

      guests.forEach((guest) => {
        const key = `${guest.booking_number || "unknown"}_${guest.nationality || "unknown"}`
        if (!bookingGroups[key]) {
          bookingGroups[key] = []
        }
        bookingGroups[key].push(guest)
      })

      // Sort groups by size (larger groups first)
      const sortedGroups = Object.values(bookingGroups).sort((a, b) => b.length - a.length)

      // Track table occupancy
      const tableOccupancy = {}
      Object.keys(TABLE_CAPACITIES).forEach((tableNum) => {
        tableOccupancy[tableNum] = 0
      })

      // Assign groups to tables
      const assignments = []

      for (const group of sortedGroups) {
        const groupSize = group.length

        // Find the best table for this group
        let bestTable = null
        let bestScore = -1

        for (const tableNum of Object.keys(TABLE_CAPACITIES)) {
          const capacity = TABLE_CAPACITIES[tableNum]
          const currentOccupancy = tableOccupancy[tableNum]
          const availableSpace = capacity - currentOccupancy

          // Skip if table can't fit the group
          if (availableSpace < groupSize) continue

          // Calculate score (prefer tables that will be more full after assignment)
          const newOccupancy = currentOccupancy + groupSize
          const utilizationScore = newOccupancy / capacity

          if (utilizationScore > bestScore) {
            bestScore = utilizationScore
            bestTable = tableNum
          }
        }

        if (bestTable) {
          // Assign this group to the best table
          for (const guest of group) {
            assignments.push({
              guestId: guest.id,
              tableNumber: Number.parseInt(bestTable),
            })
          }
          tableOccupancy[bestTable] += groupSize
        }
      }

      // Execute the assignments
      for (const assignment of assignments) {
        const { error } = await supabase
          .from("guest_manifest")
          .update({ table_nr: assignment.tableNumber })
          .eq("id", assignment.guestId)

        if (error) {
          console.error("Error assigning guest:", error)
          throw error
        }
      }

      // Refresh data
      await fetchGuests()
      restoreScrollPosition()

      setStatusMessage({
        type: "success",
        message: `Successfully assigned ${assignments.length} guests to tables automatically.`,
      })
    } catch (error) {
      console.error("Error in automatic assignment:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to assign tables automatically. Please try again.",
      })
    } finally {
      setAssigningTables(false)
    }
  }

  // Clear all table assignments
  const clearAllAssignments = async () => {
    try {
      setAssigningTables(true)
      storeScrollPosition()
      setStatusMessage(null)

      const { error } = await supabase.from("guest_manifest").update({ table_nr: null }).not("table_nr", "is", null)

      if (error) {
        console.error("Error clearing assignments:", error)
        throw error
      }

      // Refresh data
      await fetchGuests()
      restoreScrollPosition()

      setStatusMessage({
        type: "success",
        message: "All table assignments have been cleared successfully.",
      })
    } catch (error) {
      console.error("Error clearing assignments:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to clear table assignments. Please try again.",
      })
    } finally {
      setAssigningTables(false)
    }
  }

  const statistics = calculateStatistics()

  // Check authentication and fetch data
  useEffect(() => {
    const isAuthenticated = clientStorage.getLocalItem("isAdminAuthenticated") === "true"
    if (!isAuthenticated) {
      router.push("/admin/login")
    } else {
      fetchGuests()
    }
  }, [])

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
          console.log("Change received in Dashboard:", payload)
          storeScrollPosition()
          fetchGuests().then(() => {
            restoreScrollPosition()
          })
        },
      )
      .subscribe()

    // Return cleanup function
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Add function to search for cabins - improved with better cleanup
  const searchCabins = async (term) => {
    // Clear suggestions if term is too short
    if (!term || term.length < 2) {
      setCabinSuggestions([])
      return
    }

    try {
      const { data, error } = await supabase
        .from("guest_manifest")
        .select("*")
        .ilike("cabin_nr", `%${term}%`)
        .order("cabin_nr", { ascending: true })

      if (error) {
        console.error("Error searching cabins:", error)
        throw error
      }

      // Group by cabin number
      const cabinGroups = {}
      if (data) {
        for (let i = 0; i < data.length; i++) {
          const guest = data[i]
          if (!cabinGroups[guest.cabin_nr]) {
            cabinGroups[guest.cabin_nr] = []
          }
          cabinGroups[guest.cabin_nr].push(guest)
        }
      }

      // Convert to suggestions
      const suggestions = []
      const cabins = Object.keys(cabinGroups)
      for (let i = 0; i < cabins.length; i++) {
        const cabin = cabins[i]
        suggestions.push({
          cabin_nr: cabin,
          guests: cabinGroups[cabin],
          // Check if all guests in this cabin are assigned to the same table
          table_nr:
            cabinGroups[cabin].length > 0 &&
            cabinGroups[cabin].every((g) => g.table_nr === cabinGroups[cabin][0].table_nr)
              ? cabinGroups[cabin][0].table_nr
              : null,
        })
      }

      setCabinSuggestions(suggestions)
    } catch (error) {
      console.error("Error searching cabins:", error)
      setCabinSuggestions([])
    }
  }

  // Modify the handleCabinSelect function - improved with proper cleanup
  const handleCabinSelect = async (cabin) => {
    storeScrollPosition()
    setNewCabinNumber(cabin.cabin_nr)
    setSelectedCabinGuests(cabin.guests)
    setCabinSearchOpen(false)
    setCabinSuggestions([]) // Clear suggestions after selection

    // If table number is already selected, automatically add the cabin to the table
    if (newTableNumber) {
      // Check if cabin is already assigned to a different table
      if (cabin.table_nr && cabin.table_nr !== Number.parseInt(newTableNumber)) {
        // Show confirmation dialog
        setCabinToReassign(cabin)
        setCurrentTableNumber(cabin.table_nr)
        setConfirmDialogOpen(true)
      } else if (!cabin.table_nr) {
        // Wait for state to update
        setTimeout(() => {
          addCabinToTable(cabin.cabin_nr, "")
        }, 100)
      }
    }
  }

  // Handle quick assign from search results - improved with proper cleanup
  const handleQuickAssign = (cabin) => {
    storeScrollPosition()
    if (!newTableNumber) {
      setStatusMessage({
        type: "error",
        message: "Please enter a table number first.",
      })
      return
    }

    // Close the dropdown and clear suggestions
    setCabinSearchOpen(false)
    setCabinSuggestions([])

    // Check if cabin is already assigned to a different table
    if (cabin.table_nr && cabin.table_nr !== Number.parseInt(newTableNumber)) {
      // Show confirmation dialog
      setCabinToReassign(cabin)
      setCurrentTableNumber(cabin.table_nr)
      setConfirmDialogOpen(true)
    } else {
      addCabinToTable(cabin.cabin_nr, "")
    }
  }

  // Preview guests at a table when table number is entered
  const previewTableGuests = async (tableNumber) => {
    if (!tableNumber || isNaN(Number.parseInt(tableNumber, 10))) {
      setTableGuestPreview([])
      setShowTablePreview(false)
      return
    }

    try {
      const tableNum = Number.parseInt(tableNumber, 10)
      const { data, error } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("table_nr", tableNum)
        .order("cabin_nr", { ascending: true })

      if (error) {
        console.error("Error fetching table guests:", error)
        throw error
      }

      setTableGuestPreview(data || [])
      setShowTablePreview(data && data.length > 0)
    } catch (error) {
      console.error("Error fetching table guests:", error)
      setTableGuestPreview([])
      setShowTablePreview(false)
    }
  }

  // Remove individual guest from table preview
  const removeGuestFromTablePreview = async (guestId, guestName) => {
    try {
      setRemovingGuest(true)
      storeScrollPosition()

      const { error } = await supabase.from("guest_manifest").update({ table_nr: null }).eq("id", guestId)

      if (error) {
        console.error("Error removing guest:", error)
        throw error
      }

      // Refresh table preview and main data
      await Promise.all([previewTableGuests(newTableNumber), fetchGuests()])

      restoreScrollPosition()

      setStatusMessage({
        type: "success",
        message: `${guestName} has been removed from Table ${newTableNumber}.`,
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

  // Update table preview when table number changes
  useEffect(() => {
    previewTableGuests(newTableNumber)
  }, [newTableNumber])

  // Fetch all guests
  const fetchGuests = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase.from("guest_manifest").select("*")

      if (error) {
        console.error("Error fetching guests:", error)
        throw error
      }

      console.log("Fetched guests:", data)
      setGuests(data || [])
      processTableAssignments(data || [])

      // If we have a table number selected, refresh the preview
      if (newTableNumber) {
        previewTableGuests(newTableNumber)
      }

      setLoading(false)
    } catch (error) {
      console.error("Error fetching guests:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to fetch guest data. Please try again.",
      })
      setLoading(false)
    }
  }

  // Process guests into table assignments
  const processTableAssignments = (guestData) => {
    const assignments = []

    // Group guests by table number
    const tableGroups = {}

    for (let i = 0; i < guestData.length; i++) {
      const guest = guestData[i]
      if (guest.table_nr) {
        if (!tableGroups[guest.table_nr]) {
          tableGroups[guest.table_nr] = []
        }
        tableGroups[guest.table_nr].push(guest)
      }
    }

    // Convert to table assignments
    const tableNumbers = Object.keys(tableGroups)
    for (let i = 0; i < tableNumbers.length; i++) {
      const tableNumber = tableNumbers[i]
      const tableGuests = tableGroups[tableNumber]

      // Group by nationality within the table
      const nationalityGroups = {}

      for (let j = 0; j < tableGuests.length; j++) {
        const guest = tableGuests[j]
        const nationality = guest.nationality || "Unknown"
        if (!nationalityGroups[nationality]) {
          nationalityGroups[nationality] = []
        }
        nationalityGroups[nationality].push(guest)
      }

      // Create an assignment for each nationality group
      const nationalities = Object.keys(nationalityGroups)
      for (let j = 0; j < nationalities.length; j++) {
        const nationality = nationalities[j]
        const nationalityGuests = nationalityGroups[nationality]

        // Further group by booking number
        const bookingGroups = {}

        for (let k = 0; k < nationalityGuests.length; k++) {
          const guest = nationalityGuests[k]
          const bookingNumber = guest.booking_number || "Unknown"
          if (!bookingGroups[bookingNumber]) {
            bookingGroups[bookingNumber] = []
          }
          bookingGroups[bookingNumber].push(guest)
        }

        // Create an assignment for each booking group
        const bookingNumbers = Object.keys(bookingGroups)
        for (let k = 0; k < bookingNumbers.length; k++) {
          const bookingNumber = bookingNumbers[k]
          const bookingGuests = bookingGroups[bookingNumber]

          // Get unique cabin numbers
          const cabins = []
          for (let l = 0; l < bookingGuests.length; l++) {
            const cabinNr = bookingGuests[l].cabin_nr
            if (cabins.indexOf(cabinNr) === -1) {
              cabins.push(cabinNr)
            }
          }

          assignments.push({
            table_number: Number.parseInt(tableNumber, 10),
            cabins: cabins,
            nationality: nationality,
            booking_number: bookingNumber,
          })
        }
      }
    }

    // Sort by table number
    assignments.sort((a, b) => a.table_number - b.table_number)

    setTableAssignments(assignments)
  }

  // Add a cabin to a table manually with improved error handling
  const addCabinToTable = async (cabinNumberToAdd, nationalityToAdd) => {
    try {
      storeScrollPosition()
      const cabinToAdd = cabinNumberToAdd || newCabinNumber

      if (!newTableNumber || !cabinToAdd) {
        setStatusMessage({
          type: "error",
          message: "Table number and cabin number are required.",
        })
        return
      }

      const tableNumber = Number.parseInt(newTableNumber, 10)

      // Validate table number
      if (!TABLE_CAPACITIES[tableNumber]) {
        setStatusMessage({
          type: "error",
          message: `Table ${tableNumber} does not exist.`,
        })
        return
      }

      // Find the guests with this cabin number
      const { data: cabinGuests, error: fetchError } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("cabin_nr", cabinToAdd)

      if (fetchError) {
        console.error("Error fetching cabin guests:", fetchError)
        throw fetchError
      }

      if (!cabinGuests || cabinGuests.length === 0) {
        setStatusMessage({
          type: "error",
          message: `Cabin ${cabinToAdd} not found.`,
        })
        return
      }

      // Check if the table has enough capacity
      const { data: currentTableGuests, error: tableError } = await supabase
        .from("guest_manifest")
        .select("id")
        .eq("table_nr", tableNumber)

      if (tableError) {
        console.error("Error fetching current table guests:", tableError)
        throw tableError
      }

      const currentTableGuestCount = currentTableGuests ? currentTableGuests.length : 0
      const cabinGuestsCount = cabinGuests.length
      const tableCapacity = TABLE_CAPACITIES[tableNumber] || 0

      console.log(
        `Table ${tableNumber} - Current: ${currentTableGuestCount}, Adding: ${cabinGuestsCount}, Capacity: ${tableCapacity}`,
      )

      if (currentTableGuestCount + cabinGuestsCount > tableCapacity) {
        setStatusMessage({
          type: "error",
          message: `Table ${tableNumber} does not have enough capacity. Current: ${currentTableGuestCount}/${tableCapacity}, Adding: ${cabinGuestsCount}`,
        })
        return
      }

      // Update the guests
      for (let i = 0; i < cabinGuests.length; i++) {
        const guest = cabinGuests[i]
        const { error: updateError } = await supabase
          .from("guest_manifest")
          .update({
            table_nr: tableNumber,
          })
          .eq("id", guest.id)

        if (updateError) {
          console.error("Error updating guest:", updateError)
          throw updateError
        }
      }

      // Refresh data
      await fetchGuests()
      restoreScrollPosition()

      // Clear the form and close dropdown
      setNewCabinNumber("")
      setSelectedCabinGuests([])
      setCabinSearchOpen(false)
      setCabinSuggestions([])

      setStatusMessage({
        type: "success",
        message: `Cabin ${cabinToAdd} has been assigned to table ${tableNumber}.`,
      })
    } catch (error) {
      console.error("Error adding cabin to table:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to add cabin to table. Please try again.",
      })
      // Refresh data to ensure consistency
      fetchGuests()
    }
  }

  // Handle individual guest assignment
  const handleAssignGuest = async (guestId, guestName, cabinNumber) => {
    try {
      if (!newTableNumber) {
        throw new Error("No table number selected")
      }

      const tableNumber = Number.parseInt(newTableNumber, 10)

      // Validate table number
      if (!TABLE_CAPACITIES[tableNumber]) {
        throw new Error(`Table ${tableNumber} does not exist.`)
      }

      // Check if the table has enough capacity
      const { data: currentTableGuests, error: tableError } = await supabase
        .from("guest_manifest")
        .select("id")
        .eq("table_nr", tableNumber)

      if (tableError) {
        console.error("Error fetching current table guests:", tableError)
        throw tableError
      }

      const currentTableGuestCount = currentTableGuests ? currentTableGuests.length : 0
      const tableCapacity = TABLE_CAPACITIES[tableNumber] || 0

      if (currentTableGuestCount >= tableCapacity) {
        throw new Error(
          `Table ${tableNumber} is already at full capacity (${currentTableGuestCount}/${tableCapacity}).`,
        )
      }

      // Update the guest
      const { error: updateError } = await supabase
        .from("guest_manifest")
        .update({
          table_nr: tableNumber,
        })
        .eq("id", guestId)

      if (updateError) {
        console.error("Error updating guest:", updateError)
        throw updateError
      }

      // Refresh data
      await fetchGuests()

      return true
    } catch (error) {
      console.error("Error assigning guest:", error)
      setStatusMessage({
        type: "error",
        message: error.message || "Failed to assign guest. Please try again.",
      })
      throw error
    }
  }

  // Get occupancy display for table preview
  const getTableOccupancy = (tableNumber) => {
    if (!tableNumber || !TABLE_CAPACITIES[tableNumber]) return ""
    const capacity = TABLE_CAPACITIES[tableNumber]
    const currentGuests = tableGuestPreview.length
    return `${currentGuests}/${capacity} seats`
  }

  // Add the return statement at the end of the DashboardPage function, just before the final closing brace
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold">DeWillemstad Admin Dashboard</h1>
          <Button
            variant="ghost"
            onClick={() => {
              clientStorage.removeLocalItem("isAdminAuthenticated")
              router.push("/admin/login")
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {statusMessage && (
          <Alert
            className={`mb-6 ${
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

        <Tabs defaultValue="tables">
          <TabsList className="mb-6">
            <TabsTrigger value="tables" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              Table Assignment System
            </TabsTrigger>
            <TabsTrigger value="daily-floor-plan" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Daily Floor Plan
            </TabsTrigger>
            <TabsTrigger value="guest-list" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Guest List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tables">
            <div className="space-y-6">
              {/* Control Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Control Panel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6">
                    <Button
                      onClick={assignTablesAutomatically}
                      disabled={assigningTables || loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2"
                    >
                      {assigningTables ? "Assigning..." : "Assign Tables Automatically"}
                    </Button>
                    <Button variant="outline" onClick={clearAllAssignments} disabled={assigningTables || loading}>
                      Clear All Assignments
                    </Button>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="text-sm text-blue-600 font-medium">Total Guests</div>
                      <div className="text-2xl font-bold text-blue-900">{statistics.totalGuests}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <div className="text-sm text-green-600 font-medium">Assigned Guests</div>
                      <div className="text-2xl font-bold text-green-900">{statistics.assignedGuests}</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg text-center">
                      <div className="text-sm text-yellow-600 font-medium">Tables Used</div>
                      <div className="text-2xl font-bold text-yellow-900">{statistics.tablesUsed}</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg text-center">
                      <div className="text-sm text-orange-600 font-medium">Unassigned Guests</div>
                      <div className="text-2xl font-bold text-orange-900">{statistics.unassignedGuests}</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg text-center">
                      <div className="text-sm text-red-600 font-medium">Unassigned Tables</div>
                      <div className="text-2xl font-bold text-red-900">{statistics.unassignedTables}</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <div className="text-sm text-purple-600 font-medium">Booking Groups</div>
                      <div className="text-2xl font-bold text-purple-900">{statistics.bookingGroups}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Main Content Area */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Floor Plan */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Floor Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FloorPlan
                        tableCapacities={TABLE_CAPACITIES}
                        tableAssignments={tableAssignments}
                        guests={guests}
                        onTableUpdate={fetchGuests}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Add Cabin to Table */}
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle>Add Cabin to Table</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="table-number" className="block text-sm font-medium mb-1">
                            Table Number
                          </label>
                          <Input
                            id="table-number"
                            type="text"
                            placeholder="e.g. 20"
                            value={newTableNumber}
                            onChange={(e) => setNewTableNumber(e.target.value)}
                          />
                        </div>

                        <div className="relative">
                          <label htmlFor="cabin-number" className="block text-sm font-medium mb-1">
                            Cabin Number
                          </label>
                          <div className="relative">
                            <Input
                              id="cabin-number"
                              placeholder="Select cabin..."
                              value={newCabinNumber}
                              onChange={(e) => {
                                setNewCabinNumber(e.target.value)
                                searchCabins(e.target.value)
                                setCabinSearchOpen(true)
                              }}
                              onFocus={() => {
                                if (newCabinNumber) {
                                  searchCabins(newCabinNumber)
                                  setCabinSearchOpen(true)
                                }
                              }}
                            />
                            {newCabinNumber && (
                              <button
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                onClick={() => {
                                  setNewCabinNumber("")
                                  setCabinSearchOpen(false)
                                  setCabinSuggestions([])
                                }}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          {/* Cabin search results dropdown */}
                          {cabinSearchOpen && cabinSuggestions.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border max-h-60 overflow-auto">
                              {cabinSuggestions.map((cabin) => (
                                <div
                                  key={cabin.cabin_nr}
                                  className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-0 flex justify-between items-center"
                                  onClick={() => handleCabinSelect(cabin)}
                                >
                                  <div>
                                    <div className="font-medium">Cabin {cabin.cabin_nr}</div>
                                    <div className="text-xs text-gray-500">
                                      {cabin.guests.length} guests
                                      {cabin.table_nr && (
                                        <span className="ml-1 text-blue-600">(Table {cabin.table_nr})</span>
                                      )}
                                    </div>
                                  </div>
                                  {newTableNumber && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleQuickAssign(cabin)
                                      }}
                                    >
                                      Assign
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {selectedCabinGuests.length > 0 && (
                          <div className="p-3 border rounded-md bg-gray-50">
                            <h4 className="text-sm font-medium mb-2">Selected Cabin Guests:</h4>
                            <ul className="text-sm">
                              {selectedCabinGuests.map((guest) => (
                                <li key={guest.id} className="mb-1">
                                  {guest.guest_name}
                                  {guest.nationality && (
                                    <span className="text-gray-500 ml-1">({guest.nationality})</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <Button
                          onClick={() => addCabinToTable(newCabinNumber, "")}
                          disabled={!newTableNumber || !newCabinNumber}
                          className="w-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          Add Cabin to Table
                        </Button>

                        {/* Table preview with delete buttons and occupancy */}
                        {showTablePreview && (
                          <div className="p-3 border rounded-md bg-blue-50">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-sm font-medium">Current Table Guests:</h4>
                              <span className="text-sm text-gray-600">{getTableOccupancy(newTableNumber)}</span>
                            </div>
                            {tableGuestPreview.length > 0 ? (
                              <div className="space-y-2">
                                {tableGuestPreview.map((guest) => (
                                  <div
                                    key={guest.id}
                                    className="flex items-center justify-between p-2 bg-white rounded border"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-blue-600" />
                                      <div>
                                        <div className="text-sm font-medium">{guest.guest_name}</div>
                                        <div className="text-xs text-gray-500">({guest.cabin_nr})</div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => removeGuestFromTablePreview(guest.id, guest.guest_name)}
                                      disabled={removingGuest}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm">No guests currently assigned to this table.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Unassigned Guests */}
                  <UnassignedGuests currentTableNumber={newTableNumber} onAssignGuest={handleAssignGuest} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="daily-floor-plan">
            <DailyFloorPlan tableCapacities={TABLE_CAPACITIES} guests={guests} onTableUpdate={fetchGuests} />
          </TabsContent>

          <TabsContent value="guest-list">
            <GuestList />
          </TabsContent>
        </Tabs>
      </main>

      {/* Confirmation Dialog for reassigning cabins */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Cabin</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Cabin {cabinToReassign?.cabin_nr} is already assigned to Table {currentTableNumber}. Do you want to
              reassign it to Table {newTableNumber}?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmDialogOpen(false)
                if (cabinToReassign) {
                  addCabinToTable(cabinToReassign.cabin_nr, "")
                }
              }}
            >
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
