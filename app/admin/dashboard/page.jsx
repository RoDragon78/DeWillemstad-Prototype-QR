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
import {
  AlertCircle,
  CheckCircle,
  X,
  LogOut,
  Users,
  Home,
  Trash2,
  RefreshCw,
  Printer,
  Settings,
  BarChart3,
  Badge,
  Activity,
} from "lucide-react"

import {
  TrendingUp,
  UserCheck,
  Target,
  Zap,
  Globe,
  BarChart2,
  Plus,
  Upload,
  Download,
  FileText,
  Shield,
  HardDrive,
  Clock,
  Utensils,
  FileDown,
} from "lucide-react"

// Import CabinDisplayModal component
import { CabinDisplayModal } from "@/components/cabin-display-modal"

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
  const [backupProgress, setBackupProgress] = useState(0)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  // Weekly Menu Viewer state
  const [selectedCabinForMenu, setSelectedCabinForMenu] = useState("")
  const [cabinMenuData, setCabinMenuData] = useState(null)
  const [loadingCabinMenu, setLoadingCabinMenu] = useState(false)
  const [searchAttempted, setSearchAttempted] = useState(false)
  const [printingMenu, setPrintingMenu] = useState(false)
  const [exportingMenu, setExportingMenu] = useState(false)

  // Add state for data integrity dialog
  const [integrityIssues, setIntegrityIssues] = useState([])
  const [showIntegrityDialog, setShowIntegrityDialog] = useState(false)

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

  // Search cabin menu function - FIXED TO USE PROVEN DAILYFLOORPLAN LOGIC
  const searchCabinMenu = async () => {
    if (!selectedCabinForMenu.trim()) {
      setStatusMessage({
        type: "error",
        message: "Please enter a cabin number.",
      })
      return
    }

    try {
      setLoadingCabinMenu(true)
      setSearchAttempted(true)
      setCabinMenuData(null)
      setStatusMessage(null)

      // Get guests for this cabin - same as DailyFloorPlan
      const { data: cabinGuests, error: guestsError } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("cabin_nr", selectedCabinForMenu.trim())
        .order("guest_name", { ascending: true })

      if (guestsError) {
        console.error("Error fetching cabin guests:", guestsError)
        throw guestsError
      }

      if (!cabinGuests || cabinGuests.length === 0) {
        setCabinMenuData(null)
        return
      }

      // Get meal selections for ALL days (2-7) - same logic as DailyFloorPlan
      const guestIds = cabinGuests.map((guest) => guest.id)
      const { data: selections, error: selectionsError } = await supabase
        .from("meal_selections")
        .select("guest_id, meal_id, meal_name, meal_category, day")
        .in("guest_id", guestIds)
        .in("day", [2, 3, 4, 5, 6, 7])

      if (selectionsError) {
        console.error("Error fetching meal selections:", selectionsError)
        throw selectionsError
      }

      // Process meal selections by guest - same as DailyFloorPlan
      const guestMealSelections = {}
      if (selections) {
        selections.forEach((selection) => {
          if (!guestMealSelections[selection.guest_id]) {
            guestMealSelections[selection.guest_id] = {}
          }
          guestMealSelections[selection.guest_id][selection.day] = {
            meal_name: selection.meal_name,
            category: selection.meal_category?.toLowerCase() || "unknown",
          }
        })
      }

      // Process the data - same structure as DailyFloorPlan
      const processedGuests = cabinGuests.map((guest) => {
        const guestMeals = {}

        // Get meals for each day (2-7)
        for (let day = 2; day <= 7; day++) {
          const mealSelection = guestMealSelections[guest.id]?.[day]
          if (mealSelection) {
            guestMeals[day] = {
              meal_name: mealSelection.meal_name,
              meal_category: mealSelection.category,
            }
          }
        }

        return {
          ...guest,
          meals: guestMeals,
        }
      })

      setCabinMenuData({
        cabin_nr: selectedCabinForMenu.trim(),
        guests: processedGuests,
      })
    } catch (error) {
      console.error("Error searching cabin menu:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to load cabin menu data. Please try again.",
      })
    } finally {
      setLoadingCabinMenu(false)
    }
  }

  // Print weekly menu card function
  const printWeeklyMenuCard = () => {
    if (!cabinMenuData) return

    try {
      setPrintingMenu(true)

      // Create print window
      const printWindow = window.open("", "_blank")
      const now = new Date()
      const dateTime = now.toLocaleString()

      // Create print content
      const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Weekly Menu Card - Cabin ${cabinMenuData.cabin_nr}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .cabin-info { margin-bottom: 20px; }
            .menu-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .menu-table th, .menu-table td { border: 1px solid #000; padding: 8px; text-align: center; }
            .menu-table th { background-color: #f0f0f0; font-weight: bold; }
            .guest-name { text-align: left; font-weight: bold; }
            .meal-name { font-weight: bold; font-size: 12px; }
            .meal-category { font-size: 10px; color: #666; }
            .meat { background-color: #ffebee; }
            .fish { background-color: #e3f2fd; }
            .vegetarian { background-color: #e8f5e8; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>DeWillemstad - Weekly Menu Card</h1>
          <p>Generated on: ${dateTime}</p>
        </div>
        
        <div class="cabin-info">
          <h2>Cabin ${cabinMenuData.cabin_nr}</h2>
          <p>Guests: ${cabinMenuData.guests.map((g) => g.guest_name).join(", ")}</p>
        </div>
        
        <table class="menu-table">
          <thead>
            <tr>
              <th>Guest Name</th>
              <th>Day 2<br/>Sunday</th>
              <th>Day 3<br/>Monday</th>
              <th>Day 4<br/>Tuesday</th>
              <th>Day 5<br/>Wednesday</th>
              <th>Day 6<br/>Thursday</th>
              <th>Day 7<br/>Friday</th>
            </tr>
          </thead>
          <tbody>
            ${cabinMenuData.guests
              .map(
                (guest) => `
              <tr>
                <td class="guest-name">${guest.guest_name}</td>
                ${[2, 3, 4, 5, 6, 7]
                  .map((day) => {
                    const meal = guest.meals[day]
                    if (meal) {
                      const categoryClass =
                        meal.meal_category === "meat" ? "meat" : meal.meal_category === "fish" ? "fish" : "vegetarian"
                      return `
                      <td class="${categoryClass}">
                        <div class="meal-name">${meal.meal_name}</div>
                        <div class="meal-category">${meal.meal_category}</div>
                      </td>
                    `
                    } else {
                      return "<td>No selection</td>"
                    }
                  })
                  .join("")}
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
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

      setStatusMessage({
        type: "success",
        message: "Weekly menu card sent to printer.",
      })
    } catch (error) {
      console.error("Error printing menu card:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to print menu card. Please try again.",
      })
    } finally {
      setPrintingMenu(false)
    }
  }

  // Export weekly menu PDF function - FIXED TO USE JSPDF
  const exportWeeklyMenuPDF = async () => {
    if (!cabinMenuData) return

    try {
      setExportingMenu(true)

      // Import jsPDF dynamically
      const { jsPDF } = await import("jspdf")

      // Create new PDF document in landscape orientation
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      })

      // Set font
      doc.setFont("helvetica")

      // Add title
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.text("DeWillemstad - Weekly Menu Card", 148, 20, { align: "center" })

      // Add cabin info
      doc.setFontSize(16)
      doc.text(`Cabin ${cabinMenuData.cabin_nr}`, 148, 35, { align: "center" })

      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(`Guests: ${cabinMenuData.guests.map((g) => g.guest_name).join(", ")}`, 148, 45, { align: "center" })

      // Add generation date
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 148, 55, { align: "center" })

      // Table setup
      const startY = 70
      const rowHeight = 15
      const colWidths = [40, 35, 35, 35, 35, 35, 35]
      let currentX = 20
      let currentY = startY

      // Draw table headers
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")

      const headers = ["Guest Name", "Day 2\nSun", "Day 3\nMon", "Day 4\nTue", "Day 5\nWed", "Day 6\nThu", "Day 7\nFri"]

      // Draw header background
      doc.setFillColor(240, 240, 240)
      doc.rect(
        currentX,
        currentY,
        colWidths.reduce((a, b) => a + b, 0),
        rowHeight,
        "F",
      )

      // Draw header borders and text
      currentX = 20
      for (let i = 0; i < headers.length; i++) {
        doc.rect(currentX, currentY, colWidths[i], rowHeight)
        doc.text(headers[i], currentX + colWidths[i] / 2, currentY + 8, { align: "center" })
        currentX += colWidths[i]
      }

      currentY += rowHeight

      // Draw guest rows
      doc.setFont("helvetica", "normal")
      for (const guest of cabinMenuData.guests) {
        currentX = 20

        // Guest name
        doc.rect(currentX, currentY, colWidths[0], rowHeight)
        doc.setFont("helvetica", "bold")
        doc.text(guest.guest_name, currentX + 2, currentY + 8)
        currentX += colWidths[0]

        // Meal selections for each day
        doc.setFont("helvetica", "normal")
        for (let day = 2; day <= 7; day++) {
          const meal = guest.meals[day]

          // Set background color based on meal category
          if (meal) {
            if (meal.meal_category === "meat") {
              doc.setFillColor(255, 235, 238)
            } else if (meal.meal_category === "fish") {
              doc.setFillColor(227, 242, 253)
            } else {
              doc.setFillColor(232, 245, 232)
            }
            doc.rect(currentX, currentY, colWidths[day - 1], rowHeight, "F")
          }

          // Draw border
          doc.rect(currentX, currentY, colWidths[day - 1], rowHeight)

          // Add meal text
          if (meal) {
            doc.setFontSize(8)
            doc.setFont("helvetica", "bold")
            const mealName = meal.meal_name
            if (mealName.length > 15) {
              const words = mealName.split(" ")
              const line1 = words.slice(0, Math.ceil(words.length / 2)).join(" ")
              const line2 = words.slice(Math.ceil(words.length / 2)).join(" ")
              doc.text(line1, currentX + colWidths[day - 1] / 2, currentY + 5, { align: "center" })
              doc.text(line2, currentX + colWidths[day - 1] / 2, currentY + 9, { align: "center" })
            } else {
              doc.text(mealName, currentX + colWidths[day - 1] / 2, currentY + 6, { align: "center" })
            }

            doc.setFontSize(6)
            doc.setFont("helvetica", "normal")
            doc.text(meal.meal_category, currentX + colWidths[day - 1] / 2, currentY + 12, { align: "center" })
          } else {
            doc.setFontSize(8)
            doc.text("No selection", currentX + colWidths[day - 1] / 2, currentY + 8, { align: "center" })
          }

          currentX += colWidths[day - 1]
        }

        currentY += rowHeight
      }

      // Add legend
      currentY += 10
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("Legend:", 20, currentY)

      currentY += 8
      doc.setFont("helvetica", "normal")

      // Meat legend
      doc.setFillColor(255, 235, 238)
      doc.rect(20, currentY - 3, 10, 5, "F")
      doc.rect(20, currentY - 3, 10, 5)
      doc.text("Meat", 35, currentY)

      // Fish legend
      doc.setFillColor(227, 242, 253)
      doc.rect(60, currentY - 3, 10, 5, "F")
      doc.rect(60, currentY - 3, 10, 5)
      doc.text("Fish", 75, currentY)

      // Vegetarian legend
      doc.setFillColor(232, 245, 232)
      doc.rect(100, currentY - 3, 10, 5, "F")
      doc.rect(100, currentY - 3, 10, 5)
      doc.text("Vegetarian", 115, currentY)

      // Save the PDF
      doc.save(`weekly_menu_cabin_${cabinMenuData.cabin_nr}_${new Date().toISOString().split("T")[0]}.pdf`)

      setStatusMessage({
        type: "success",
        message: "Weekly menu PDF exported successfully.",
      })
    } catch (error) {
      console.error("Error exporting menu PDF:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to export menu PDF. Please try again.",
      })
    } finally {
      setExportingMenu(false)
    }
  }

  // Logout function
  const handleLogout = () => {
    clientStorage.removeLocalItem("isAdminAuthenticated")
    router.push("/admin/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">DeWillemstad Admin Dashboard</h1>
              <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Alert
            className={
              statusMessage.type === "error"
                ? "border-red-200 bg-red-50"
                : statusMessage.type === "success"
                  ? "border-green-200 bg-green-50"
                  : "border-blue-200 bg-blue-50"
            }
          >
            {statusMessage.type === "error" ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : statusMessage.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-blue-600" />
            )}
            <AlertDescription
              className={
                statusMessage.type === "error"
                  ? "text-red-800"
                  : statusMessage.type === "success"
                    ? "text-green-800"
                    : "text-blue-800"
              }
            >
              {statusMessage.message}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={() => setStatusMessage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Table Assignments
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="guests" className="flex items-center gap-2">
              <Badge className="h-4 w-4" />
              Guest Management
            </TabsTrigger>
            <TabsTrigger value="data-tools" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Data Tools
            </TabsTrigger>
            <TabsTrigger value="weekly-menu" className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              Weekly Menu
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.totalGuests}</div>
                  <p className="text-xs text-muted-foreground">Registered passengers</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assigned Guests</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{statistics.assignedGuests}</div>
                  <p className="text-xs text-muted-foreground">
                    {statistics.totalGuests > 0
                      ? Math.round((statistics.assignedGuests / statistics.totalGuests) * 100)
                      : 0}
                    % of total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tables Used</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{statistics.tablesUsed}</div>
                  <p className="text-xs text-muted-foreground">
                    Out of {Object.keys(TABLE_CAPACITIES).length} available
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Booking Groups</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{statistics.bookingGroups}</div>
                  <p className="text-xs text-muted-foreground">Unique reservations</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    onClick={() => setShowAutoAssignDialog(true)}
                    disabled={assigningTables}
                    className="flex items-center gap-2"
                  >
                    <Target className="h-4 w-4" />
                    {assigningTables ? "Assigning..." : "Auto Assign Tables"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={showClearConfirmation}
                    disabled={assigningTables}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear All Assignments
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowImportDialog(true)}
                    disabled={importing}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {importing ? "Importing..." : "Import Guest Manifest"}
                  </Button>

                  <Button variant="outline" onClick={printFloorPlan} className="flex items-center gap-2 bg-transparent">
                    <Printer className="h-4 w-4" />
                    Print Floor Plan
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Floor Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Floor Plan - Table Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="floor-plan-container">
                  <FloorPlan
                    guests={guests}
                    tableCapacities={TABLE_CAPACITIES}
                    refreshTrigger={refreshTrigger}
                    onGuestUpdate={fetchGuests}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Table Assignments Tab */}
          <TabsContent value="assignments" className="space-y-6">
            {/* Manual Assignment Form */}
            <Card>
              <CardHeader>
                <CardTitle>Manual Table Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Table Number</label>
                    <Input
                      type="number"
                      placeholder="Enter table number (1-20)"
                      value={newTableNumber}
                      onChange={(e) => setNewTableNumber(e.target.value)}
                      min="1"
                      max="20"
                    />
                    {showTablePreview && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-blue-800">
                            Table {newTableNumber} Preview - {getTableOccupancy(Number.parseInt(newTableNumber))}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowTablePreview(false)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="max-h-32 overflow-y-auto" ref={tableGuestsRef}>
                          {tableGuestPreview.map((guest) => (
                            <div key={guest.id} className="flex justify-between items-center py-1 text-sm">
                              <span>
                                {guest.guest_name} (Cabin {guest.cabin_nr})
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeGuestFromTablePreview(guest.id, guest.guest_name)}
                                disabled={removingGuest}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">Cabin Number</label>
                    <Input
                      placeholder="Enter cabin number or search"
                      value={newCabinNumber}
                      onChange={(e) => {
                        setNewCabinNumber(e.target.value)
                        searchCabins(e.target.value)
                        setCabinSearchOpen(e.target.value.length >= 2)
                      }}
                      onFocus={() => {
                        if (newCabinNumber.length >= 2) {
                          setCabinSearchOpen(true)
                        }
                      }}
                    />

                    {/* Cabin Search Dropdown */}
                    {cabinSearchOpen && cabinSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {cabinSuggestions.map((cabin) => (
                          <div
                            key={cabin.cabin_nr}
                            className="p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
                            onClick={() => handleCabinSelect(cabin)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium">Cabin {cabin.cabin_nr}</div>
                                <div className="text-sm text-gray-600">
                                  {cabin.guests.map((g) => g.guest_name).join(", ")}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {cabin.guests.length} guest{cabin.guests.length !== 1 ? "s" : ""}
                                  {cabin.table_nr && ` • Currently at Table ${cabin.table_nr}`}
                                </div>
                              </div>
                              {newTableNumber && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleQuickAssign(cabin)
                                  }}
                                  className="ml-2"
                                >
                                  Assign
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selected Cabin Guests Preview */}
                    {selectedCabinGuests.length > 0 && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="text-sm font-medium text-green-800 mb-1">
                          Selected Cabin Guests ({selectedCabinGuests.length}):
                        </div>
                        <div className="text-sm text-green-700">
                          {selectedCabinGuests.map((guest) => guest.guest_name).join(", ")}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => addCabinToTable("", "")}
                  disabled={!newTableNumber || !newCabinNumber}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cabin to Table
                </Button>
              </CardContent>
            </Card>

            {/* Unassigned Guests */}
            <Card>
              <CardHeader>
                <CardTitle>Unassigned Guests ({statistics.unassignedGuests})</CardTitle>
              </CardHeader>
              <CardContent>
                <UnassignedGuests
                  guests={guests.filter((guest) => guest.table_nr === null)}
                  onAssignGuest={handleAssignGuest}
                  refreshTrigger={refreshTrigger}
                  selectedTableNumber={newTableNumber}
                />
              </CardContent>
            </Card>

            {/* Current Table Assignments */}
            <Card>
              <CardHeader>
                <CardTitle>Current Table Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                {tableAssignments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No table assignments yet.</p>
                ) : (
                  <div className="space-y-4">
                    {tableAssignments.map((assignment, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">Table {assignment.table_number}</h3>
                            <p className="text-sm text-gray-600">
                              Cabins: {assignment.cabins.join(", ")} • Nationality: {assignment.nationality}
                            </p>
                            <p className="text-xs text-gray-500">Booking: {assignment.booking_number}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium">
                              {
                                guests.filter(
                                  (guest) =>
                                    guest.table_nr === assignment.table_number &&
                                    assignment.cabins.includes(guest.cabin_nr) &&
                                    guest.nationality === assignment.nationality &&
                                    guest.booking_number === assignment.booking_number,
                                ).length
                              }{" "}
                              guests
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Nationality Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Nationality Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(statistics.nationalityBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([nationality, count]) => (
                      <div key={nationality} className="flex justify-between items-center">
                        <span className="font-medium">{nationality}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(count / statistics.totalGuests) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-16 text-right">
                            {count} ({Math.round((count / statistics.totalGuests) * 100)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Table Utilization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5" />
                  Table Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(statistics.tableBreakdown)
                    .sort(([a], [b]) => {
                      const tableA = Number.parseInt(a.replace("Table ", ""))
                      const tableB = Number.parseInt(b.replace("Table ", ""))
                      return tableA - tableB
                    })
                    .map(([table, count]) => {
                      const tableNum = Number.parseInt(table.replace("Table ", ""))
                      const capacity = TABLE_CAPACITIES[tableNum] || 4
                      const efficiency = (count / capacity) * 100
                      return (
                        <div key={table} className="flex justify-between items-center">
                          <span className="font-medium">{table}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  efficiency === 100
                                    ? "bg-green-600"
                                    : efficiency >= 75
                                      ? "bg-yellow-600"
                                      : "bg-blue-600"
                                }`}
                                style={{ width: `${efficiency}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-20 text-right">
                              {count}/{capacity} ({efficiency.toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Assignment Efficiency */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Assignment Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {statistics.totalGuests > 0
                        ? Math.round((statistics.assignedGuests / statistics.totalGuests) * 100)
                        : 0}
                      %
                    </div>
                    <p className="text-sm text-gray-600">Guests Assigned</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {Object.keys(TABLE_CAPACITIES).length > 0
                        ? Math.round((statistics.tablesUsed / Object.keys(TABLE_CAPACITIES).length) * 100)
                        : 0}
                      %
                    </div>
                    <p className="text-sm text-gray-600">Tables Utilized</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {statistics.assignedGuests > 0
                        ? Math.round(statistics.assignedGuests / statistics.tablesUsed)
                        : 0}
                    </div>
                    <p className="text-sm text-gray-600">Avg Guests per Table</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Guest Management Tab */}
          <TabsContent value="guests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Guest List Management</CardTitle>
              </CardHeader>
              <CardContent>
                <GuestList
                  guests={guests}
                  refreshTrigger={refreshTrigger}
                  onGuestUpdate={fetchGuests}
                  onCabinChange={handleCabinChange}
                  onBulkCabinUpdate={handleBulkCabinUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Tools Tab */}
          <TabsContent value="data-tools" className="space-y-6">
            {/* Import/Export Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import/Export Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={handleImportExcelDataTools}
                    disabled={dataToolsLoading}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Import Excel Data
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleExportGuestList}
                    disabled={dataToolsLoading}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <Download className="h-4 w-4" />
                    Export Guest List
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <FileText className="h-4 w-4" />
                    {isGeneratingReport ? "Generating..." : "Generate Report"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Data Integrity Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Data Integrity Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={handleCheckDataIntegrity}
                    disabled={dataToolsLoading}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <Activity className="h-4 w-4" />
                    Check Data Integrity
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleViewChangeHistory}
                    disabled={dataToolsLoading}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <Clock className="h-4 w-4" />
                    View Change History
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Backup & Restore */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Backup & Restore
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={handleBackupData}
                    disabled={dataToolsLoading}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <HardDrive className="h-4 w-4" />
                    Create Data Backup
                  </Button>

                  {backupProgress > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${backupProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{statistics.totalGuests}</div>
                    <p className="text-sm text-green-800">Total Records</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{statistics.assignedGuests}</div>
                    <p className="text-sm text-blue-800">Processed</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{statistics.unassignedGuests}</div>
                    <p className="text-sm text-yellow-800">Pending</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {statistics.totalGuests > 0
                        ? Math.round((statistics.assignedGuests / statistics.totalGuests) * 100)
                        : 0}
                      %
                    </div>
                    <p className="text-sm text-purple-800">Completion</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly Menu Tab */}
          <TabsContent value="weekly-menu" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Weekly Menu Viewer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">Cabin Number</label>
                    <Input
                      placeholder="Enter cabin number (e.g., A101)"
                      value={selectedCabinForMenu}
                      onChange={(e) => setSelectedCabinForMenu(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          searchCabinMenu()
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={searchCabinMenu}
                      disabled={loadingCabinMenu || !selectedCabinForMenu.trim()}
                      className="flex items-center gap-2"
                    >
                      {loadingCabinMenu ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Utensils className="h-4 w-4" />
                      )}
                      Search Menu
                    </Button>
                  </div>
                </div>

                {/* Menu Display */}
                {searchAttempted && !loadingCabinMenu && (
                  <>
                    {cabinMenuData ? (
                      <div className="space-y-4">
                        {/* Cabin Info */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h3 className="font-semibold text-lg">Cabin {cabinMenuData.cabin_nr}</h3>
                          <p className="text-sm text-gray-600">
                            Guests: {cabinMenuData.guests.map((g) => g.guest_name).join(", ")}
                          </p>
                        </div>

                        {/* Menu Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-300 p-3 text-left font-semibold">Guest Name</th>
                                <th className="border border-gray-300 p-3 text-center font-semibold">
                                  Day 2<br />
                                  <span className="text-xs font-normal">Sunday</span>
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold">
                                  Day 3<br />
                                  <span className="text-xs font-normal">Monday</span>
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold">
                                  Day 4<br />
                                  <span className="text-xs font-normal">Tuesday</span>
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold">
                                  Day 5<br />
                                  <span className="text-xs font-normal">Wednesday</span>
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold">
                                  Day 6<br />
                                  <span className="text-xs font-normal">Thursday</span>
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold">
                                  Day 7<br />
                                  <span className="text-xs font-normal">Friday</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {cabinMenuData.guests.map((guest) => (
                                <tr key={guest.id} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 p-3 font-medium">{guest.guest_name}</td>
                                  {[2, 3, 4, 5, 6, 7].map((day) => {
                                    const meal = guest.meals[day]
                                    return (
                                      <td
                                        key={day}
                                        className={`border border-gray-300 p-3 text-center ${
                                          meal
                                            ? meal.meal_category === "meat"
                                              ? "bg-red-50"
                                              : meal.meal_category === "fish"
                                                ? "bg-blue-50"
                                                : "bg-green-50"
                                            : ""
                                        }`}
                                      >
                                        {meal ? (
                                          <div>
                                            <div className="font-medium text-sm">{meal.meal_name}</div>
                                            <div className="text-xs text-gray-600 capitalize">{meal.meal_category}</div>
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 text-sm">No selection</span>
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                          <Button
                            onClick={printWeeklyMenuCard}
                            disabled={printingMenu}
                            className="flex items-center gap-2"
                          >
                            {printingMenu ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Printer className="h-4 w-4" />
                            )}
                            Print Menu Card
                          </Button>

                          <Button
                            variant="outline"
                            onClick={exportWeeklyMenuPDF}
                            disabled={exportingMenu}
                            className="flex items-center gap-2 bg-transparent"
                          >
                            {exportingMenu ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileDown className="h-4 w-4" />
                            )}
                            Export PDF
                          </Button>
                        </div>

                        {/* Legend */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">Meal Category Legend:</h4>
                          <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                              <span className="text-sm">Meat</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
                              <span className="text-sm">Fish</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                              <span className="text-sm">Vegetarian</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          No guests found for cabin "{selectedCabinForMenu}". Please check the cabin number and try
                          again.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Daily Floor Plan Integration */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Floor Plan with Meal Selections</CardTitle>
              </CardHeader>
              <CardContent>
                <DailyFloorPlan
                  guests={guests}
                  tableCapacities={TABLE_CAPACITIES}
                  refreshTrigger={refreshTrigger}
                  onGuestUpdate={fetchGuests}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Guest Manifest</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Excel File</label>
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} />
              {selectedFile && <p className="text-sm text-green-600 mt-2">Selected: {selectedFile.name}</p>}
            </div>
            <div className="bg-yellow-50 p-3 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This will replace all existing guest data. Make sure your Excel file has the
                required columns: guest_name, cabin_nr, nationality, booking_number, cruise_id.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={importGuestManifest} disabled={importing || !selectedFile}>
              {importing ? "Importing..." : "Import Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Assignments Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clear All Table Assignments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 p-3 rounded-md">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will remove all guests from their assigned tables. This action cannot be
                undone.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Type "CLEAR ALL" to confirm this action:</label>
              <Input
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="Type CLEAR ALL"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)} disabled={assigningTables}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={clearAllAssignments}
              disabled={assigningTables || clearConfirmText !== "CLEAR ALL"}
            >
              {assigningTables ? "Clearing..." : "Clear All Assignments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cabin Reassignment Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Cabin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              Cabin {cabinToReassign?.cabin_nr} is currently assigned to Table {currentTableNumber}. Do you want to
              reassign it to Table {newTableNumber}?
            </p>
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Guests in this cabin:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-1">
                {cabinToReassign?.guests.map((guest) => (
                  <li key={guest.id}>• {guest.guest_name}</li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false)
                setCabinToReassign(null)
                setCurrentTableNumber(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                addCabinToTable(cabinToReassign.cabin_nr, "")
                setConfirmDialogOpen(false)
                setCabinToReassign(null)
                setCurrentTableNumber(null)
              }}
            >
              Reassign to Table {newTableNumber}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto Assignment Confirmation Dialog */}
      <Dialog open={showAutoAssignDialog} onOpenChange={setShowAutoAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Automatic Table Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              This will automatically assign all unassigned guests to tables based on their booking groups and
              nationalities.
            </p>
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Current Status:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-1">
                <li>• Total Guests: {statistics.totalGuests}</li>
                <li>• Unassigned: {statistics.unassignedGuests}</li>
                <li>• Available Tables: {Object.keys(TABLE_CAPACITIES).length - statistics.tablesUsed}</li>
              </ul>
            </div>
            {statistics.unassignedGuests === 0 && (
              <div className="bg-green-50 p-3 rounded-md">
                <p className="text-sm text-green-800">All guests are already assigned to tables.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowAutoAssignDialog(false)
                assignTablesAutomatically()
              }}
              disabled={statistics.unassignedGuests === 0}
            >
              Start Auto Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cabin Display Modal */}
      <CabinDisplayModal
        isOpen={showCabinDisplay}
        onClose={() => setShowCabinDisplay(false)}
        guests={guests}
        refreshTrigger={refreshTrigger}
      />

      {/* Data Integrity Issues Dialog */}
      <Dialog open={showIntegrityDialog} onOpenChange={setShowIntegrityDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Data Integrity Check Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {integrityIssues.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-green-800 font-medium">No data integrity issues found!</p>
                <p className="text-sm text-gray-600">Your data is clean and consistent.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {integrityIssues.map((issue, index) => (
                  <div key={index} className="p-3 border border-red-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm text-red-800">{issue.description}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Type: {issue.type} • Severity: {issue.severity}
                        </div>
                      </div>
                      <div className="text-right">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIntegrityDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change History Dialog */}
      <Dialog open={showChangeLogDialog} onOpenChange={setShowChangeLogDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change History</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {changeLogData.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No change history available.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {changeLogData.map((change) => (
                  <div key={change.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{change.description}</div>
                        <div className="text-xs text-gray-600 mt-1">{change.details}</div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            change.action === "CREATE"
                              ? "bg-green-100 text-green-800"
                              : change.action === "UPDATE"
                                ? "bg-blue-100 text-blue-800"
                                : change.action === "DELETE"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {change.action}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">{new Date(change.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeLogDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
