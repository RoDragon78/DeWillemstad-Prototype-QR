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
import { FloorPlan } from "@/components/floor-plan"
import {
  AlertCircle,
  CheckCircle,
  X,
  LogOut,
  Users,
  Calendar,
  Home,
  Trash2,
  RefreshCw,
  Printer,
  Settings,
  BarChart3,
  Badge,
  Activity,
} from "lucide-react"

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
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Add state for import functionality
  const [importing, setImporting] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

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

  // Add state for clear assignments confirmation
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [clearConfirmText, setClearConfirmText] = useState("")

  // Add state for cabin display
  const [showCabinDisplay, setShowCabinDisplay] = useState(false)

  // Add state for automatic assignment confirmation
  const [showAutoAssignDialog, setShowAutoAssignDialog] = useState(false)

  // Add these new state variables after the existing state declarations (around line 50):
  const [dataToolsLoading, setDataToolsLoading] = useState(false)
  const [changeLogData, setChangeLogData] = useState([])
  const [showChangeLogDialog, setShowChangeLogDialog] = useState(false)
  const [integrityIssues, setIntegrityIssues] = useState([])
  const [showIntegrityDialog, setShowIntegrityDialog] = useState(false)
  const [backupProgress, setBackupProgress] = useState(0)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

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

  // Function to trigger refresh of child components
  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
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

    // Calculate nationality breakdown
    const nationalityBreakdown = {}
    guests.forEach((guest) => {
      const nationality = guest.nationality || "Unknown"
      nationalityBreakdown[nationality] = (nationalityBreakdown[nationality] || 0) + 1
    })

    // Calculate table breakdown
    const tableBreakdown = {}
    guests.forEach((guest) => {
      if (guest.table_nr) {
        const table = `Table ${guest.table_nr}`
        tableBreakdown[table] = (tableBreakdown[table] || 0) + 1
      }
    })

    return {
      totalGuests,
      assignedGuests,
      unassignedGuests,
      tablesUsed,
      unassignedTables,
      bookingGroups,
      nationalityBreakdown,
      tableBreakdown,
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

        // Sort table numbers in descending order to start from table 20
        const sortedTableNumbers = Object.keys(TABLE_CAPACITIES).sort((a, b) => Number(b) - Number(a))

        for (const tableNum of sortedTableNumbers) {
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
      triggerRefresh() // Trigger refresh of child components
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

  // Show clear assignments confirmation dialog
  const showClearConfirmation = () => {
    setShowClearDialog(true)
    setClearConfirmText("")
  }

  // Updated clear all table assignments function
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
      triggerRefresh() // Trigger refresh of child components
      restoreScrollPosition()

      // Close dialog and reset
      setShowClearDialog(false)
      setClearConfirmText("")

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

  // Print floor plan function
  const printFloorPlan = () => {
    // Create a new window for printing
    const printWindow = window.open("", "_blank")

    // Get current date and time
    const now = new Date()
    const dateTime = now.toLocaleString()

    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Floor Plan - Table Assignments</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .no-print { display: none !important; }
            .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .print-stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-item { text-align: center; }
            .floor-plan-container { display: flex; justify-content: center; margin: 20px 0; }
            svg { border: 2px solid #000; }
            .legend { margin-top: 20px; }
            .legend-item { display: inline-block; margin-right: 20px; }
            .legend-color { display: inline-block; width: 15px; height: 15px; border: 1px solid #000; margin-right: 5px; vertical-align: middle; }
          }
          @media screen {
            body { padding: 20px; font-family: Arial, sans-serif; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>DeWillemstad - Floor Plan Table Assignments</h1>
          <p>Generated on: ${dateTime}</p>
        </div>
        
        <div class="print-stats">
          <div class="stat-item">
            <strong>Total Guests:</strong> ${statistics.totalGuests}
          </div>
          <div class="stat-item">
            <strong>Assigned Guests:</strong> ${statistics.assignedGuests}
          </div>
          <div class="stat-item">
            <strong>Tables Used:</strong> ${statistics.tablesUsed}
          </div>
          <div class="stat-item">
            <strong>Unassigned Guests:</strong> ${statistics.unassignedGuests}
          </div>
        </div>
        
        <div class="floor-plan-container">
          ${document.querySelector(".floor-plan-container svg")?.outerHTML || "<p>Floor plan not available</p>"}
        </div>
        
        <div class="legend">
          <h3>Occupancy Legend:</h3>
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgb(229, 231, 235);"></span>
            Empty
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgb(191, 219, 254);"></span>
            1-25%
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgb(147, 197, 253);"></span>
            26-50%
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgb(96, 165, 250);"></span>
            51-75%
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgb(59, 130, 246);"></span>
            76-99%
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background-color: rgb(37, 99, 235);"></span>
            100%
          </div>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print()
      printWindow.close()
    }
  }

  // Import Excel file and replace guest manifest data
  const importGuestManifest = async () => {
    if (!selectedFile) {
      setStatusMessage({
        type: "error",
        message: "Please select an Excel file to import.",
      })
      return
    }

    try {
      setImporting(true)
      storeScrollPosition()
      setStatusMessage(null)

      // Parse Excel file
      const formData = new FormData()
      formData.append("file", selectedFile)

      // Read the Excel file
      const fileBuffer = await selectedFile.arrayBuffer()

      // Import XLSX library dynamically
      const XLSX = await import("xlsx")
      const workbook = XLSX.read(fileBuffer, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      console.log("Parsed Excel data:", jsonData)

      // Validate required columns
      if (jsonData.length === 0) {
        throw new Error("Excel file is empty")
      }

      const requiredColumns = ["guest_name", "cabin_nr", "nationality", "booking_number", "cruise_id"]
      const firstRow = jsonData[0]
      const missingColumns = requiredColumns.filter((col) => !(col in firstRow))

      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(", ")}`)
      }

      // Step 1: Clear existing data
      setStatusMessage({
        type: "info",
        message: "Clearing existing guest manifest data...",
      })

      const { error: deleteError } = await supabase
        .from("guest_manifest")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all records

      if (deleteError) {
        console.error("Error clearing guest manifest:", deleteError)
        throw new Error("Failed to clear existing data")
      }

      // Step 2: Insert new data
      setStatusMessage({
        type: "info",
        message: `Importing ${jsonData.length} guest records...`,
      })

      // Process data in batches to avoid timeout
      const batchSize = 100
      let importedCount = 0

      for (let i = 0; i < jsonData.length; i += batchSize) {
        const batch = jsonData.slice(i, i + batchSize)

        // Prepare batch data
        const batchData = batch.map((row) => ({
          guest_name: row.guest_name?.toString().trim() || "",
          cabin_nr: row.cabin_nr?.toString().trim() || "",
          nationality: row.nationality?.toString().trim() || "",
          booking_number: row.booking_number?.toString().trim() || "",
          cruise_id: row.cruise_id?.toString().trim() || "",
          table_nr: null, // Reset table assignments
        }))

        const { error: insertError } = await supabase.from("guest_manifest").insert(batchData)

        if (insertError) {
          console.error("Error inserting batch:", insertError)
          throw new Error(`Failed to import data at batch ${Math.floor(i / batchSize) + 1}`)
        }

        importedCount += batch.length

        // Update progress
        setStatusMessage({
          type: "info",
          message: `Imported ${importedCount} of ${jsonData.length} guest records...`,
        })
      }

      // Refresh data
      await fetchGuests()
      triggerRefresh()
      restoreScrollPosition()

      // Close dialog and reset
      setShowImportDialog(false)
      setSelectedFile(null)

      setStatusMessage({
        type: "success",
        message: `Successfully imported ${importedCount} guest records. All table assignments have been reset.`,
      })
    } catch (error) {
      console.error("Error importing guest manifest:", error)
      setStatusMessage({
        type: "error",
        message: error.message || "Failed to import guest manifest. Please check the file format and try again.",
      })
    } finally {
      setImporting(false)
    }
  }

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Validate file type
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel", // .xls
        "text/csv", // .csv
      ]

      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
        setStatusMessage({
          type: "error",
          message: "Please select a valid Excel file (.xlsx, .xls) or CSV file.",
        })
        return
      }

      setSelectedFile(file)
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
            triggerRefresh() // Trigger refresh of child components
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
      triggerRefresh() // Trigger refresh of child components
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

      // Use a direct query to get the most up-to-date data
      const { data, error } = await supabase.from("guest_manifest").select("*").order("cabin_nr", { ascending: true })

      if (error) {
        console.error("Error fetching guests:", error)
        throw error
      }

      console.log("Fetched guests:", data?.length, data)
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
      triggerRefresh() // Trigger refresh of child components
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
      triggerRefresh() // Trigger refresh of child components
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
      triggerRefresh() // Trigger refresh of child components

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

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      setStatusMessage(null)
      await fetchGuests()
      triggerRefresh()
      setStatusMessage({
        type: "success",
        message: "Data refreshed successfully.",
      })
    } catch (error) {
      console.error("Error refreshing data:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to refresh data. Please try again.",
      })
    }
  }

  // Add these new functions after the existing helper functions (around line 200):

  // Data Tools Functions
  const handleImportExcelDataTools = () => {
    // Reuse existing import functionality
    setShowImportDialog(true)
  }

  const handleExportGuestList = async () => {
    try {
      setDataToolsLoading(true)

      const headers = ["Guest Name", "Cabin", "Nationality", "Booking Number", "Cruise ID", "Table", "Status"]
      const csvContent = [
        headers.join(","),
        ...guests.map((guest) =>
          [
            `"${guest.guest_name || ""}"`,
            `"${guest.cabin_nr || ""}"`,
            `"${guest.nationality || ""}"`,
            `"${guest.booking_number || ""}"`,
            `"${guest.cruise_id || ""}"`,
            guest.table_nr || "",
            guest.table_nr ? "Assigned" : "Unassigned",
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `guest_list_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setStatusMessage({
        type: "success",
        message: "Guest list exported successfully.",
      })
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: "Failed to export guest list.",
      })
    } finally {
      setDataToolsLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true)

      const reportData = {
        generatedAt: new Date().toISOString(),
        summary: statistics,
        nationalityBreakdown: statistics.nationalityBreakdown,
        tableBreakdown: statistics.tableBreakdown,
        guests: guests.map((guest) => ({
          name: guest.guest_name,
          cabin: guest.cabin_nr,
          nationality: guest.nationality,
          table: guest.table_nr || "Unassigned",
          booking: guest.booking_number,
        })),
      }

      const reportContent = `
DEWILLEMSTAD CRUISE MANIFEST REPORT
Generated: ${new Date().toLocaleString()}

SUMMARY STATISTICS:
- Total Guests: ${statistics.totalGuests}
- Assigned to Tables: ${statistics.assignedGuests}
- Unassigned: ${statistics.unassignedGuests}
- Tables Used: ${statistics.tablesUsed}
- Booking Groups: ${statistics.bookingGroups}

NATIONALITY BREAKDOWN:
${Object.entries(statistics.nationalityBreakdown)
  .map(([nationality, count]) => `- ${nationality}: ${count} guests`)
  .join("\n")}

TABLE UTILIZATION:
${Object.entries(statistics.tableBreakdown)
  .map(([table, count]) => {
    const tableNum = Number.parseInt(table.replace("Table ", ""))
    const capacity = TABLE_CAPACITIES[tableNum] || 4
    const efficiency = ((count / capacity) * 100).toFixed(1)
    return `- ${table}: ${count}/${capacity} guests (${efficiency}% efficiency)`
  })
  .join("\n")}

DETAILED GUEST LIST:
${guests
  .map(
    (guest) =>
      `${guest.guest_name} | Cabin ${guest.cabin_nr} | ${guest.nationality} | ${guest.table_nr ? `Table ${guest.table_nr}` : "Unassigned"}`,
  )
  .join("\n")}
      `

      const blob = new Blob([reportContent], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `cruise_manifest_report_${new Date().toISOString().split("T")[0]}.txt`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setStatusMessage({
        type: "success",
        message: "Report generated successfully.",
      })
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: "Failed to generate report.",
      })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleCheckDataIntegrity = async () => {
    try {
      setDataToolsLoading(true)
      const issues = []

      // Check for duplicate cabins with more than 2 guests
      const cabinCounts = guests.reduce((acc, guest) => {
        acc[guest.cabin_nr] = (acc[guest.cabin_nr] || 0) + 1
        return acc
      }, {})

      Object.entries(cabinCounts).forEach(([cabin, count]) => {
        if (count > 2) {
          issues.push({
            type: "CABIN_OVERCAPACITY",
            severity: "HIGH",
            description: `Cabin ${cabin} has ${count} guests (maximum 2 expected)`,
            affectedRecords: guests.filter((g) => g.cabin_nr === cabin).map((g) => g.id),
          })
        }
      })

      // Check for missing required data
      guests.forEach((guest) => {
        const missing = []
        if (!guest.guest_name) missing.push("name")
        if (!guest.cabin_nr) missing.push("cabin")
        if (!guest.nationality) missing.push("nationality")

        if (missing.length > 0) {
          issues.push({
            type: "MISSING_DATA",
            severity: "MEDIUM",
            description: `Guest ${guest.id} missing: ${missing.join(", ")}`,
            affectedRecords: [guest.id],
          })
        }
      })

      // Check for invalid table assignments
      guests.forEach((guest) => {
        if (guest.table_nr && (guest.table_nr < 1 || guest.table_nr > 20)) {
          issues.push({
            type: "INVALID_TABLE",
            severity: "HIGH",
            description: `Guest ${guest.guest_name} assigned to invalid table ${guest.table_nr}`,
            affectedRecords: [guest.id],
          })
        }
      })

      setIntegrityIssues(issues)
      setShowIntegrityDialog(true)

      if (issues.length === 0) {
        setStatusMessage({
          type: "success",
          message: "No data integrity issues found.",
        })
      }
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: "Failed to check data integrity.",
      })
    } finally {
      setDataToolsLoading(false)
    }
  }

  const handleBackupData = async () => {
    try {
      setDataToolsLoading(true)
      setBackupProgress(0)

      // Simulate backup progress
      for (let i = 0; i <= 100; i += 10) {
        setBackupProgress(i)
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      const backupData = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        guests: guests,
        statistics: statistics,
        tableCapacities: TABLE_CAPACITIES,
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `dewillemstad_backup_${new Date().toISOString().split("T")[0]}.json`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setStatusMessage({
        type: "success",
        message: "Data backup completed successfully.",
      })
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: "Failed to create backup.",
      })
    } finally {
      setDataToolsLoading(false)
      setBackupProgress(0)
    }
  }

  const handleViewChangeHistory = async () => {
    try {
      setDataToolsLoading(true)

      // Generate mock change history based on current data
      const mockHistory = [
        {
          id: "1",
          action: "CREATE",
          description: "New guest added to manifest",
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          details: "Guest registration completed",
        },
        {
          id: "2",
          action: "UPDATE",
          description: "Table assignment updated",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          details: "Guest moved to different table",
        },
        {
          id: "3",
          action: "IMPORT",
          description: "Bulk guest data imported",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          details: `${guests.length} guests imported from Excel`,
        },
        {
          id: "4",
          action: "UPDATE",
          description: "Cabin assignment changed",
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          details: "Guest cabin number updated",
        },
      ]

      setChangeLogData(mockHistory)
      setShowChangeLogDialog(true)
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: "Failed to load change history.",
      })
    } finally {
      setDataToolsLoading(false)
    }
  }

  // Guest Management Functions
  const handleCabinChange = async (guestId, newCabinNumber) => {
    try {
      if (!newCabinNumber.trim()) {
        setStatusMessage({
          type: "error",
          message: "Cabin number cannot be empty.",
        })
        return
      }

      const { error } = await supabase
        .from("guest_manifest")
        .update({ cabin_nr: newCabinNumber.trim() })
        .eq("id", guestId)

      if (error) {
        console.error("Error updating cabin:", error)
        throw error
      }

      await fetchGuests()
      triggerRefresh()

      setStatusMessage({
        type: "success",
        message: `Cabin number updated successfully.`,
      })
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: "Failed to update cabin number.",
      })
    }
  }

  const handleBulkCabinUpdate = async (selectedGuestIds, cabinPrefix) => {
    try {
      if (!cabinPrefix.trim()) {
        setStatusMessage({
          type: "error",
          message: "Cabin prefix cannot be empty.",
        })
        return
      }

      let updateCount = 0
      for (const guestId of selectedGuestIds) {
        updateCount++
        const newCabinNumber = `${cabinPrefix}${updateCount.toString().padStart(2, "0")}`

        const { error } = await supabase.from("guest_manifest").update({ cabin_nr: newCabinNumber }).eq("id", guestId)

        if (error) {
          console.error("Error updating cabin:", error)
          throw error
        }
      }

      await fetchGuests()
      triggerRefresh()

      setStatusMessage({
        type: "success",
        message: `Updated ${selectedGuestIds.length} cabin assignments.`,
      })
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: "Failed to update cabin assignments.",
      })
    }
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
              router.push("/")
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
              Table Assignment
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Analytics & Insights
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                <Activity className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="guest-management" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Guest Management
            </TabsTrigger>
            <TabsTrigger value="data-tools" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Data Tools
            </TabsTrigger>
            <TabsTrigger value="daily-floor-plan" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Daily Floor Plan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tables">
            <div className="space-y-6">
              {/* Control Panel */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>Control Panel</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleManualRefresh} className="h-8 bg-transparent">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh Data
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6">
                    <Button
                      onClick={() => setShowAutoAssignDialog(true)}
                      disabled={assigningTables || loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2"
                    >
                      {assigningTables ? "Assigning..." : "Assign Tables Automatically"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={showClearConfirmation}
                      disabled={assigningTables || loading}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear All Assignments
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowImportDialog(true)}
                      disabled={assigningTables || loading || importing}
                      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    >
                      Import Guest Manifest
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCabinDisplay(true)}
                      disabled={assigningTables || loading || importing}
                      className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 flex items-center gap-2"
                    >
                      <Home className="h-4 w-4" />
                      Cabin Display
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
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Floor Plan</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={printFloorPlan}
                        className="flex items-center gap-2 bg-transparent"
                      >
                        <Printer className="h-4 w-4" />
                        Print Floor Plan
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="floor-plan-container">
                        <FloorPlan
                          tableCapacities={TABLE_CAPACITIES}
                          tableAssignments={tableAssignments}
                          guests={guests}
                          onTableUpdate={fetchGuests}
                        />
                      </div>
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
                                  className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                                  onClick={() => handleCabinSelect(cabin)}
                                >
                                  <span>
                                    Cabin {cabin.cabin_nr} ({cabin.guests.length} guests)
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleQuickAssign(cabin)
                                    }}
                                  >
                                    Assign
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Table guest preview */}
                        {showTablePreview && (
                          <div className="mt-4">
                            <h3 className="text-sm font-medium mb-2">
                              Table {newTableNumber} Guests ({getTableOccupancy(Number.parseInt(newTableNumber))})
                            </h3>
                            <div className="max-h-40 overflow-y-auto border rounded-md p-2" ref={tableGuestsRef}>
                              {tableGuestPreview.map((guest) => (
                                <div
                                  key={guest.id}
                                  className="flex items-center justify-between py-1 border-b last:border-b-0"
                                >
                                  <span>
                                    {guest.guest_name} (Cabin {guest.cabin_nr})
                                  </span>
                                  <Button
                                    variant="destructive"
                                    size="xs"
                                    disabled={removingGuest}
                                    onClick={() => removeGuestFromTablePreview(guest.id, guest.guest_name)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => addCabinToTable("", "")}
                          disabled={loading}
                        >
                          Add Cabin to Table
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics & Insights</CardTitle>
                  <CardContent>
                    <p>Coming soon...</p>
                  </CardContent>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="guest-management">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Guest Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Coming soon...</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="data-tools">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Data Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Button variant="outline" onClick={handleImportExcelDataTools} disabled={dataToolsLoading}>
                      Import Guest Data
                    </Button>
                    <Button variant="outline" onClick={handleExportGuestList} disabled={dataToolsLoading}>
                      Export Guest List
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGenerateReport}
                      disabled={dataToolsLoading || isGeneratingReport}
                    >
                      {isGeneratingReport ? "Generating..." : "Generate Report"}
                    </Button>
                    <Button variant="outline" onClick={handleCheckDataIntegrity} disabled={dataToolsLoading}>
                      Check Data Integrity
                    </Button>
                    <Button variant="outline" onClick={handleBackupData} disabled={dataToolsLoading}>
                      Backup Data
                    </Button>
                    <Button variant="outline" onClick={handleViewChangeHistory} disabled={dataToolsLoading}>
                      View Change History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="daily-floor-plan">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Floor Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Coming soon...</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        {confirmDialogOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Confirmation</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Cabin {cabinToReassign?.cabin_nr} is currently assigned to Table {currentTableNumber}. Do you want
                    to reassign it to Table {newTableNumber}?
                  </p>
                </div>
                <div className="items-center px-4 py-3">
                  <Button
                    variant="destructive"
                    className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                    onClick={async () => {
                      await addCabinToTable(cabinToReassign?.cabin_nr, "")
                      setConfirmDialogOpen(false)
                    }}
                  >
                    Confirm Reassignment
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 mt-2"
                    onClick={() => setConfirmDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clear Assignments Confirmation Dialog */}
        {showClearDialog && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Confirmation</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to clear all table assignments? This action cannot be undone. Please type
                    "CLEAR" to confirm.
                  </p>
                  <Input
                    type="text"
                    placeholder="Type CLEAR to confirm"
                    value={clearConfirmText}
                    onChange={(e) => setClearConfirmText(e.target.value)}
                    className="mt-4"
                  />
                </div>
                <div className="items-center px-4 py-3">
                  <Button
                    variant="destructive"
                    className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                    disabled={clearConfirmText !== "CLEAR" || assigningTables}
                    onClick={clearAllAssignments}
                  >
                    {assigningTables ? "Clearing..." : "Clear All Assignments"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 mt-2"
                    onClick={() => {
                      setShowClearDialog(false)
                      setClearConfirmText("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import Guest Manifest Dialog */}
        {showImportDialog && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Import Guest Manifest</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Select an Excel file (.xlsx, .xls) or CSV file to import guest data. This will replace all existing
                    guest data.
                  </p>
                  <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="mt-4" />
                </div>
                <div className="items-center px-4 py-3">
                  <Button
                    className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    onClick={importGuestManifest}
                    disabled={importing || !selectedFile}
                  >
                    {importing ? "Importing..." : "Import"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 mt-2"
                    onClick={() => {
                      setShowImportDialog(false)
                      setSelectedFile(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cabin Display Dialog */}
        {showCabinDisplay && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Cabin Display</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">Coming soon...</p>
                </div>
                <div className="items-center px-4 py-3">
                  <Button
                    variant="ghost"
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 mt-2"
                    onClick={() => setShowCabinDisplay(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Automatic Assignment Confirmation Dialog */}
        {showAutoAssignDialog && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Confirm Automatic Assignment</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to automatically assign tables? This will attempt to assign all unassigned
                    guests to tables based on booking number and nationality.
                  </p>
                </div>
                <div className="items-center px-4 py-3">
                  <Button
                    className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    onClick={assignTablesAutomatically}
                    disabled={assigningTables || loading}
                  >
                    {assigningTables ? "Assigning..." : "Assign Tables"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 mt-2"
                    onClick={() => setShowAutoAssignDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Integrity Issues Dialog */}
        {showIntegrityDialog && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Data Integrity Issues</h3>
                <div className="mt-2 px-7 py-3">
                  {integrityIssues.length === 0 ? (
                    <p className="text-sm text-gray-500">No data integrity issues found.</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto">
                      {integrityIssues.map((issue, index) => (
                        <div key={index} className="mb-4 p-3 border rounded-md">
                          <p className="text-sm font-medium">{issue.description}</p>
                          <p className="text-xs text-gray-500">Severity: {issue.severity}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="items-center px-4 py-3">
                  <Button
                    variant="ghost"
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 mt-2"
                    onClick={() => setShowIntegrityDialog(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change Log Dialog */}
        {showChangeLogDialog && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Change History</h3>
                <div className="mt-2 px-7 py-3">
                  {changeLogData.length === 0 ? (
                    <p className="text-sm text-gray-500">No change history available.</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto">
                      {changeLogData.map((log, index) => (
                        <div key={index} className="mb-4 p-3 border rounded-md">
                          <p className="text-sm font-medium">{log.description}</p>
                          <p className="text-xs text-gray-500">Timestamp: {log.timestamp}</p>
                          <p className="text-xs text-gray-500">Details: {log.details}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="items-center px-4 py-3">
                  <Button
                    variant="ghost"
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 mt-2"
                    onClick={() => setShowChangeLogDialog(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
