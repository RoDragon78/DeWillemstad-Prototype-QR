"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Search, RefreshCw, Check, User, Users, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandList, CommandInput, CommandItem, CommandEmpty, CommandGroup } from "@/components/ui/command"
import { clientStorage } from "@/utils/client-storage"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FloorPlan } from "@/components/floor-plan"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// 1. Update the imports to include our new UnassignedGuests component
import { UnassignedGuests } from "@/components/unassigned-guests"

// Table capacity configuration based on the floor plan - removed tables 5 and 15
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

  // State
  const [loading, setLoading] = useState(true)
  const [assigningTables, setAssigningTables] = useState(false)
  const [tableAssignments, setTableAssignments] = useState([])
  const [guests, setGuests] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusMessage, setStatusMessage] = useState(null)
  const [activeTab, setActiveTab] = useState("floor-plan")

  // Form state for adding a cabin manually
  const [newTableNumber, setNewTableNumber] = useState("")
  const [newCabinNumber, setNewCabinNumber] = useState("")
  const [newNationality, setNewNationality] = useState("")

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
          fetchGuests() // Refresh data when changes occur
        },
      )
      .subscribe()

    // Return cleanup function
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Add function to search for cabins
  const searchCabins = async (term) => {
    if (!term || term.length < 1) {
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
    }
  }

  // 2. Modify the handleCabinSelect function to fix the greyed out issue
  const handleCabinSelect = async (cabin) => {
    setNewCabinNumber(cabin.cabin_nr)
    setSelectedCabinGuests(cabin.guests)

    // If all guests in the cabin have the same nationality, pre-fill it
    const nationalities = new Set()
    for (let i = 0; i < cabin.guests.length; i++) {
      if (cabin.guests[i].nationality) {
        nationalities.add(cabin.guests[i].nationality)
      }
    }

    if (nationalities.size === 1) {
      setNewNationality(cabin.guests[0].nationality || "")
    }

    setCabinSearchOpen(false)

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
          addCabinToTable(cabin.cabin_nr, Array.from(nationalities)[0] || "")
        }, 100)
      }
    }
  }

  // Handle quick assign from search results
  const handleQuickAssign = (cabin) => {
    if (!newTableNumber) {
      setStatusMessage({
        type: "error",
        message: "Please enter a table number first.",
      })
      return
    }

    // Check if cabin is already assigned to a different table
    if (cabin.table_nr && cabin.table_nr !== Number.parseInt(newTableNumber)) {
      // Show confirmation dialog
      setCabinToReassign(cabin)
      setCurrentTableNumber(cabin.table_nr)
      setConfirmDialogOpen(true)
    } else {
      // Get nationality from cabin guests
      const nationalities = new Set()
      for (let i = 0; i < cabin.guests.length; i++) {
        if (cabin.guests[i].nationality) {
          nationalities.add(cabin.guests[i].nationality)
        }
      }

      addCabinToTable(cabin.cabin_nr, Array.from(nationalities)[0] || "")
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

  // Assign tables automatically - start from table 20 instead of table 1
  const assignTablesAutomatically = async () => {
    try {
      setAssigningTables(true)
      setStatusMessage({
        type: "info",
        message: "Assigning tables automatically...",
      })

      // First, clear existing table assignments by updating each guest individually
      const { data: allGuests, error: fetchError } = await supabase.from("guest_manifest").select("id")

      if (fetchError) {
        console.error("Error fetching guests:", fetchError)
        throw fetchError
      }

      // Update each guest individually to clear table assignments
      for (let i = 0; i < (allGuests || []).length; i++) {
        const guest = allGuests[i]
        const { error: clearError } = await supabase
          .from("guest_manifest")
          .update({ table_nr: null })
          .eq("id", guest.id)

        if (clearError) {
          console.error("Error clearing table assignment:", clearError)
          throw clearError
        }
      }

      // Fetch all guests again to ensure we have the latest data
      const { data: guests, error: fetchGuestsError } = await supabase
        .from("guest_manifest")
        .select("*")
        .order("booking_number", { ascending: true })

      if (fetchGuestsError) {
        console.error("Error fetching guests:", fetchGuestsError)
        throw fetchGuestsError
      }

      if (!guests || guests.length === 0) {
        setStatusMessage({
          type: "info",
          message: "No guests found.",
        })
        setAssigningTables(false)
        return
      }

      console.log("Starting automatic table assignment with", guests.length, "guests")

      // Group guests by booking number and nationality
      const groupedGuests = {}

      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i]
        const key = guest.booking_number + "_" + guest.nationality
        if (!groupedGuests[key]) {
          groupedGuests[key] = []
        }
        groupedGuests[key].push(guest)
      }

      console.log("Grouped guests into", Object.keys(groupedGuests).length, "groups")

      // Sort groups by size (largest first) for better table utilization
      const groupKeys = Object.keys(groupedGuests)
      const sortedGroups = []

      for (let i = 0; i < groupKeys.length; i++) {
        sortedGroups.push(groupedGuests[groupKeys[i]])
      }

      sortedGroups.sort((a, b) => b.length - a.length)

      // Start assigning tables - use reverse order of table numbers (start from highest)
      const tableNumbers = Object.keys(TABLE_CAPACITIES)
        .map((n) => Number.parseInt(n, 10))
        .sort((a, b) => b - a) // Sort in descending order

      const tableAssignments = {}
      const updates = []

      // Initialize table assignments
      for (let i = 0; i < tableNumbers.length; i++) {
        const tableNumber = tableNumbers[i]
        tableAssignments[tableNumber] = []
      }

      console.log("Initialized table assignments for", tableNumbers.length, "tables")

      // Assign groups to tables
      for (let i = 0; i < sortedGroups.length; i++) {
        const group = sortedGroups[i]
        const groupSize = group.length
        console.log("Processing group with", groupSize, "guests")

        // Find a table that can accommodate this group
        let assignedTable = null

        for (let j = 0; j < tableNumbers.length; j++) {
          const tableNumber = tableNumbers[j]
          const capacity = TABLE_CAPACITIES[tableNumber]
          const currentOccupancy = tableAssignments[tableNumber].length

          if (currentOccupancy + groupSize <= capacity) {
            assignedTable = tableNumber
            console.log("Found table", tableNumber, "with capacity", capacity, "current occupancy", currentOccupancy)
            break
          }
        }

        // If no table can accommodate the entire group, find the table with the most available space
        if (assignedTable === null) {
          let maxAvailableSpace = 0
          let bestTable = tableNumbers[0]

          for (let j = 0; j < tableNumbers.length; j++) {
            const tableNumber = tableNumbers[j]
            const capacity = TABLE_CAPACITIES[tableNumber]
            const currentOccupancy = tableAssignments[tableNumber].length
            const availableSpace = capacity - currentOccupancy

            if (availableSpace > maxAvailableSpace) {
              maxAvailableSpace = availableSpace
              bestTable = tableNumber
            }
          }

          assignedTable = bestTable
          console.log("No table can fit entire group, using table", bestTable, "with", maxAvailableSpace, "spaces")
        }

        // Assign as many guests as possible to this table
        const capacity = TABLE_CAPACITIES[assignedTable]
        const currentOccupancy = tableAssignments[assignedTable].length
        const availableSpace = capacity - currentOccupancy
        const guestsToAssign = group.slice(0, availableSpace)

        console.log("Assigning", guestsToAssign.length, "guests to table", assignedTable)

        // Add guests to this table
        for (let j = 0; j < guestsToAssign.length; j++) {
          tableAssignments[assignedTable].push(guestsToAssign[j])
        }

        // Prepare updates
        for (let j = 0; j < guestsToAssign.length; j++) {
          updates.push({
            id: guestsToAssign[j].id,
            table_nr: assignedTable,
          })
        }

        // If there are remaining guests, try to assign them to other tables
        if (availableSpace < group.length) {
          const remainingGuests = group.slice(availableSpace)
          console.log("Have", remainingGuests.length, "remaining guests to assign")

          // Find the next best table
          for (let j = 0; j < tableNumbers.length; j++) {
            const tableNumber = tableNumbers[j]
            if (tableNumber === assignedTable) continue

            const capacity = TABLE_CAPACITIES[tableNumber]
            const currentOccupancy = tableAssignments[tableNumber].length
            const availableSpace = capacity - currentOccupancy

            if (availableSpace > 0) {
              const numToAssign = Math.min(availableSpace, remainingGuests.length)
              const guestsToAssign = remainingGuests.slice(0, numToAssign)
              console.log("Assigning", guestsToAssign.length, "remaining guests to table", tableNumber)

              // Add guests to this table
              for (let k = 0; k < guestsToAssign.length; k++) {
                tableAssignments[tableNumber].push(guestsToAssign[k])
              }

              // Prepare updates
              for (let k = 0; k < guestsToAssign.length; k++) {
                updates.push({
                  id: guestsToAssign[k].id,
                  table_nr: tableNumber,
                })
              }

              // Remove assigned guests from remaining
              remainingGuests.splice(0, numToAssign)

              if (remainingGuests.length === 0) break
            }
          }
        }
      }

      console.log("Prepared", updates.length, "updates")

      // Batch update all guests
      if (updates.length > 0) {
        // Update each guest individually to avoid batch issues
        for (let i = 0; i < updates.length; i++) {
          const update = updates[i]
          const { error: updateError } = await supabase
            .from("guest_manifest")
            .update({ table_nr: update.table_nr })
            .eq("id", update.id)

          if (updateError) {
            console.error("Error updating guest:", updateError)
            throw updateError
          }
        }
      }

      // Refresh the data
      await fetchGuests()

      setStatusMessage({
        type: "success",
        message: `Successfully assigned ${updates.length} guests to tables.`,
      })
    } catch (error) {
      console.error("Error assigning tables:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to assign tables. Please try again.",
      })
    } finally {
      setAssigningTables(false)
    }
  }

  // Clear all table assignments
  const clearTableAssignments = async () => {
    try {
      setLoading(true)
      setStatusMessage({
        type: "info",
        message: "Clearing table assignments...",
      })

      // Get all guests first
      const { data: allGuests, error: fetchError } = await supabase.from("guest_manifest").select("id")

      if (fetchError) {
        console.error("Error fetching guests:", fetchError)
        throw fetchError
      }

      // Update each guest individually to clear table assignments
      for (let i = 0; i < (allGuests || []).length; i++) {
        const guest = allGuests[i]
        const { error: clearError } = await supabase
          .from("guest_manifest")
          .update({ table_nr: null })
          .eq("id", guest.id)

        if (clearError) {
          console.error("Error clearing table assignment:", clearError)
          throw clearError
        }
      }

      await fetchGuests()

      setStatusMessage({
        type: "success",
        message: "All table assignments have been cleared.",
      })
    } catch (error) {
      console.error("Error clearing table assignments:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to clear table assignments. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  // Add a cabin to a table manually - simplified logic
  const addCabinToTable = async (cabinNumberToAdd, nationalityToAdd) => {
    try {
      const cabinToAdd = cabinNumberToAdd || newCabinNumber
      const nationalityToUse = nationalityToAdd || newNationality

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
      let currentTableGuestCount = 0
      for (let i = 0; i < guests.length; i++) {
        if (guests[i].table_nr === tableNumber) {
          currentTableGuestCount++
        }
      }

      const cabinGuestsCount = cabinGuests.length

      if (currentTableGuestCount + cabinGuestsCount > TABLE_CAPACITIES[tableNumber]) {
        setStatusMessage({
          type: "error",
          message: `Table ${tableNumber} does not have enough capacity for cabin ${cabinToAdd}.`,
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
            nationality: nationalityToUse || guest.nationality,
          })
          .eq("id", guest.id)

        if (updateError) {
          console.error("Error updating guest:", updateError)
          throw updateError
        }
      }

      // Refresh data
      await fetchGuests()

      // Clear the form
      setNewCabinNumber("")
      setNewNationality("")
      setSelectedCabinGuests([])

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

  // 3. Add a new function to assign individual guests to a table
  const assignIndividualGuest = async (guestId, guestName, cabinNumber) => {
    try {
      if (!newTableNumber) {
        setStatusMessage({
          type: "error",
          message: "Please enter a table number first.",
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

      // Check if the table has enough capacity
      let currentTableGuestCount = 0
      for (let i = 0; i < guests.length; i++) {
        if (guests[i].table_nr === tableNumber) {
          currentTableGuestCount++
        }
      }

      if (currentTableGuestCount + 1 > TABLE_CAPACITIES[tableNumber]) {
        setStatusMessage({
          type: "error",
          message: `Table ${tableNumber} does not have enough capacity for additional guests.`,
        })
        return
      }

      // Update the guest
      const { error: updateError } = await supabase
        .from("guest_manifest")
        .update({ table_nr: tableNumber })
        .eq("id", guestId)

      if (updateError) {
        console.error("Error updating guest:", updateError)
        throw updateError
      }

      // Refresh data
      await fetchGuests()

      setStatusMessage({
        type: "success",
        message: `Guest ${guestName} from cabin ${cabinNumber} has been assigned to table ${tableNumber}.`,
      })
    } catch (error) {
      console.error("Error assigning guest to table:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to assign guest to table. Please try again.",
      })
      // Refresh data to ensure consistency
      fetchGuests()
    }
  }

  // Handle confirmation dialog for reassigning cabin
  const handleConfirmReassign = async () => {
    if (cabinToReassign) {
      await addCabinToTable(cabinToReassign.cabin_nr, "")
      setCabinToReassign(null)
      setCurrentTableNumber(null)
      setConfirmDialogOpen(false)
    }
  }

  // 4. Modify the removeGuestFromTable function to preserve scroll position
  const removeGuestFromTable = async (guestId) => {
    try {
      setRemovingGuest(true)
      setStatusMessage({
        type: "info",
        message: "Removing guest from table...",
      })

      // Store scroll position before update
      const scrollPosition = tableGuestsRef.current ? tableGuestsRef.current.scrollTop : 0

      const { error: updateError } = await supabase.from("guest_manifest").update({ table_nr: null }).eq("id", guestId)

      if (updateError) {
        console.error("Error removing guest from table:", updateError)
        throw updateError
      }

      // Refresh the data while maintaining scroll position
      await fetchGuests()

      // Restore scroll position after state update and DOM rendering
      if (tableGuestsRef.current) {
        requestAnimationFrame(() => {
          if (tableGuestsRef.current) {
            tableGuestsRef.current.scrollTop = scrollPosition
          }
        })
      }

      setStatusMessage({
        type: "success",
        message: "Guest has been removed from the table.",
      })
    } catch (error) {
      console.error("Error removing guest from table:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to remove guest from table. Please try again.",
      })
    } finally {
      setRemovingGuest(false)
    }
  }

  // Remove a cabin from a table
  const removeCabinFromTable = async (tableNumber, cabinNumber) => {
    try {
      setStatusMessage({
        type: "info",
        message: `Removing cabin ${cabinNumber} from table ${tableNumber}...`,
      })

      const { data: cabinGuests, error: fetchError } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("cabin_nr", cabinNumber)
        .eq("table_nr", tableNumber)

      if (fetchError) {
        console.error("Error fetching cabin guests:", fetchError)
        throw fetchError
      }

      if (!cabinGuests || cabinGuests.length === 0) {
        setStatusMessage({
          type: "error",
          message: `Cabin ${cabinNumber} not found at table ${tableNumber}.`,
        })
        return
      }

      // Update each guest individually
      for (let i = 0; i < cabinGuests.length; i++) {
        const guest = cabinGuests[i]
        const { error: updateError } = await supabase
          .from("guest_manifest")
          .update({ table_nr: null })
          .eq("id", guest.id)

        if (updateError) {
          console.error("Error updating guest:", updateError)
          throw updateError
        }
      }

      // Refresh the data
      await fetchGuests()

      setStatusMessage({
        type: "success",
        message: `Cabin ${cabinNumber} has been removed from table ${tableNumber}.`,
      })
    } catch (error) {
      console.error("Error removing cabin from table:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to remove cabin from table. Please try again.",
      })
    }
  }

  // Handle sign out
  function handleSignOut() {
    clientStorage.removeLocalItem("isAdminAuthenticated")
    router.push("/admin/login")
  }

  // Filter table assignments based on search term
  const getFilteredAssignments = () => {
    const filtered = []
    const searchLower = searchTerm.toLowerCase()

    for (let i = 0; i < tableAssignments.length; i++) {
      const assignment = tableAssignments[i]

      // Check if table number matches
      if (assignment.table_number.toString().includes(searchLower)) {
        filtered.push(assignment)
        continue
      }

      // Check if any cabin matches
      let cabinMatches = false
      for (let j = 0; j < assignment.cabins.length; j++) {
        if (assignment.cabins[j].toLowerCase().includes(searchLower)) {
          cabinMatches = true
          break
        }
      }

      if (cabinMatches) {
        filtered.push(assignment)
        continue
      }

      // Check nationality
      if (assignment.nationality.toLowerCase().includes(searchLower)) {
        filtered.push(assignment)
        continue
      }

      // Check booking number
      if (assignment.booking_number.toLowerCase().includes(searchLower)) {
        filtered.push(assignment)
      }
    }

    return filtered
  }

  const filteredAssignments = getFilteredAssignments()

  // Find guests for an assignment
  const findGuestsForAssignment = (assignment) => {
    const result = []

    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i]
      if (
        guest.table_nr === assignment.table_number &&
        assignment.cabins.indexOf(guest.cabin_nr) !== -1 &&
        guest.nationality === assignment.nationality
      ) {
        result.push(guest)
      }
    }

    return result
  }

  // Calculate statistics
  const totalGuests = guests.length
  const assignedGuests = guests.filter((g) => g.table_nr).length
  const unassignedGuests = totalGuests - assignedGuests
  const tablesUsed = new Set(guests.map((g) => g.table_nr).filter(Boolean)).size
  const bookingGroups = new Set(guests.map((g) => g.booking_number)).size

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-600">Table Assignment System</p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {statusMessage && (
          <Alert
            className={`mb-6 ${
              statusMessage.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : statusMessage.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <AlertDescription>{statusMessage.message}</AlertDescription>
          </Alert>
        )}

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Control Panel</h2>

          <div className="grid grid-cols-1 gap-3 mb-4">
            <div className="flex gap-2">
              <Button
                onClick={assignTablesAutomatically}
                disabled={assigningTables}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {assigningTables ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Tables Automatically"
                )}
              </Button>

              <Button onClick={clearTableAssignments} variant="outline" disabled={loading} className="flex-1">
                Clear All Assignments
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-600 font-medium">Total Guests</p>
              <p className="text-2xl font-bold">{totalGuests}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <p className="text-sm text-green-600 font-medium">Assigned Guests</p>
              <p className="text-2xl font-bold">{assignedGuests}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
              <p className="text-sm text-amber-600 font-medium">Tables Used</p>
              <p className="text-2xl font-bold">{tablesUsed}</p>
            </div>
            // Update the dashboard metrics to include unassigned guests count // Find the metrics section with the grid
            of stats and update the unassigned guests card:
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
              <p className="text-sm text-orange-600 font-medium">Unassigned Guests</p>
              <p className="text-2xl font-bold">{unassignedGuests}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <p className="text-sm text-purple-600 font-medium">Booking Groups</p>
              <p className="text-2xl font-bold">{bookingGroups}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="floor-plan" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full max-w-md mx-auto mb-4 grid grid-cols-2">
            <TabsTrigger value="floor-plan" className="text-sm">
              Floor Plan
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-sm">
              Table Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="floor-plan" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                  <h2 className="text-lg font-semibold mb-3">Floor Plan</h2>
                  <div className="border rounded-lg overflow-hidden">
                    <FloorPlan
                      tableCapacities={TABLE_CAPACITIES}
                      tableAssignments={tableAssignments}
                      guests={guests}
                      onTableUpdate={fetchGuests}
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                  <h2 className="text-lg font-semibold mb-3">Add Cabin to Table</h2>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="table-number">Table Number</Label>
                      <Input
                        id="table-number"
                        placeholder="e.g. 20"
                        value={newTableNumber}
                        onChange={(e) => setNewTableNumber(e.target.value)}
                      />

                      {/* Table guest preview */}
                      {showTablePreview && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">Current Table Guests:</h4>
                            <Badge variant="outline" className="bg-blue-100">
                              {tableGuestPreview.length}/{TABLE_CAPACITIES[Number.parseInt(newTableNumber, 10)] || 0}{" "}
                              seats
                            </Badge>
                          </div>
                          <div ref={tableGuestsRef} className="max-h-24 overflow-y-auto">
                            <ul className="space-y-1">
                              {tableGuestPreview.map((guest) => (
                                <li key={guest.id} className="text-sm flex items-center justify-between">
                                  <div className="flex items-center">
                                    <User className="h-3 w-3 mr-1 text-blue-400" />
                                    {guest.guest_name || "Unknown"} ({guest.cabin_nr})
                                  </div>
                                  <button
                                    onClick={() => removeGuestFromTable(guest.id)}
                                    disabled={removingGuest}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Remove guest from table"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="cabin-number">Cabin Number</Label>
                      <div className="relative mt-1">
                        <Popover open={cabinSearchOpen} onOpenChange={setCabinSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={cabinSearchOpen}
                              className="w-full justify-between"
                            >
                              {newCabinNumber || "Select cabin..."}
                              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search cabins..."
                                onValueChange={(value) => searchCabins(value)}
                              />
                              <CommandList>
                                <CommandEmpty>No cabins found.</CommandEmpty>
                                <CommandGroup>
                                  {cabinSuggestions.map((cabin) => (
                                    // 5. Update the CommandItem styling in the cabin search to make it more clickable
                                    <CommandItem
                                      key={cabin.cabin_nr}
                                      value={cabin.cabin_nr}
                                      onSelect={() => handleCabinSelect(cabin)}
                                      className="flex justify-between items-center cursor-pointer hover:bg-blue-50 active:bg-blue-100 transition-colors"
                                    >
                                      <div className="flex items-center">
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            newCabinNumber === cabin.cabin_nr
                                              ? "opacity-100 text-blue-600"
                                              : "opacity-0"
                                          }`}
                                        />
                                        {cabin.cabin_nr} - {cabin.guests.length}{" "}
                                        {cabin.guests.length === 1 ? "guest" : "guests"}
                                      </div>

                                      {cabin.table_nr ? (
                                        <div className="flex items-center">
                                          <Badge variant="outline" className="mr-2 bg-blue-50 text-blue-700">
                                            Table {cabin.table_nr}
                                          </Badge>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-xs hover:bg-blue-100 hover:text-blue-700"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleQuickAssign(cabin)
                                            }}
                                          >
                                            Reassign
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-xs hover:bg-blue-100 hover:text-blue-700"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleQuickAssign(cabin)
                                          }}
                                        >
                                          Assign
                                        </Button>
                                      )}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {selectedCabinGuests.length > 0 && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium">Guest Names:</h4>
                          <Badge variant="outline" className="bg-gray-100">
                            <Users className="h-3 w-3 mr-1" />
                            {selectedCabinGuests.length}
                          </Badge>
                        </div>
                        <ul className="space-y-1 max-h-24 overflow-y-auto">
                          {selectedCabinGuests.map((guest) => (
                            <li key={guest.id} className="text-sm flex items-center">
                              <User className="h-3 w-3 mr-1 text-gray-400" />
                              {guest.guest_name || "Unknown"}
                              {guest.nationality && <span className="text-gray-500 ml-1">({guest.nationality})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="nationality">Nationality (Optional)</Label>
                      <Input
                        id="nationality"
                        placeholder="e.g. German"
                        value={newNationality}
                        onChange={(e) => setNewNationality(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={() => addCabinToTable()}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={!newTableNumber || !newCabinNumber}
                    >
                      Add Cabin to Table
                    </Button>
                    {/* 6. Add the UnassignedGuests component to the Add Cabin to Table section */}
                    <UnassignedGuests currentTableNumber={newTableNumber} onAssignGuest={assignIndividualGuest} />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="mt-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Table Assignments</h2>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by table, cabin, nationality..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Table
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cabin Numbers
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Guest Names
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nationality
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAssignments.length > 0 ? (
                      filteredAssignments.map((assignment, index) => {
                        // Find all guests for this assignment
                        const assignmentGuests = findGuestsForAssignment(assignment)
                        const guestNames = assignmentGuests.map((g) => g.guest_name)

                        return (
                          <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {assignment.table_number}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex flex-wrap gap-1">
                                {assignment.cabins.map((cabin) => (
                                  <Badge
                                    key={cabin}
                                    className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  >
                                    {cabin}
                                    <button
                                      onClick={() => removeCabinFromTable(assignment.table_number, cabin)}
                                      className="ml-1 text-blue-500 hover:text-blue-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {guestNames.join(", ")}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {assignment.nationality}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-800"
                                onClick={() => {
                                  setNewTableNumber(assignment.table_number.toString())
                                  setNewNationality(assignment.nationality)
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Cabin
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-center text-sm text-gray-500">
                          {searchTerm ? "No matching assignments found." : "No table assignments yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog for Reassigning Cabin */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Cabin</DialogTitle>
            <DialogDescription>
              This cabin is currently assigned to Table {currentTableNumber}. Do you want to reassign it to Table{" "}
              {newTableNumber}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center p-4 bg-amber-50 rounded-md">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
            <p className="text-sm text-amber-700">
              This will remove all guests in this cabin from their current table assignment.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReassign} className="bg-blue-600 hover:bg-blue-700">
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
