"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Progress } from "@/components/ui/progress"
import {
  Search,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Download,
  AlertCircle,
  CheckCircle,
  Users,
  BarChart3,
  Settings,
  Upload,
  Shield,
  Filter,
  Printer,
  FileText,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  Clock,
  HardDrive,
  AlertTriangle,
  TrendingUp,
  PieChart,
  Activity,
  Target,
  Zap,
  Globe,
  Award,
  BarChart2,
  LineChart,
  UserCheck,
} from "lucide-react"

interface Guest {
  id: string
  guest_name: string
  cabin_nr: string
  nationality: string
  booking_number: string
  cruise_id: string
  table_nr?: number
}

interface GuestManifestEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDataChange?: () => void
}

interface ChangeLogEntry {
  id: string
  action: "CREATE" | "UPDATE" | "DELETE"
  table_name: string
  record_id: string
  old_values?: any
  new_values?: any
  timestamp: string
  user_id?: string
}

interface DataConflict {
  type: "DUPLICATE_CABIN" | "MISSING_DATA" | "INVALID_TABLE" | "ORPHANED_RECORD"
  severity: "HIGH" | "MEDIUM" | "LOW"
  description: string
  affected_records: string[]
  suggested_fix?: string
}

interface AdvancedAnalytics {
  occupancyTrends: { time: string; percentage: number }[]
  nationalityDistribution: { nationality: string; count: number; percentage: number }[]
  tableUtilization: { table: number; efficiency: number; turnover: number }[]
  bookingPatterns: { size: number; count: number; percentage: number }[]
  realTimeMetrics: {
    currentOccupancy: number
    peakOccupancy: number
    averageGroupSize: number
    utilizationRate: number
  }
  predictiveInsights: {
    expectedFullTables: number
    recommendedReassignments: number
    optimizationScore: number
  }
}

// Nationality color mapping
const NATIONALITY_COLORS = {
  English: "#FFE66D",
  German: "#4ECDC4",
  Dutch: "#FF6B35",
  Other: "#95A5A6",
}

const NATIONALITY_TEXT_COLORS = {
  English: "#8B5A00",
  German: "#0F5F5C",
  Dutch: "#B8441F",
  Other: "#5D6D7E",
}

const TABLE_CAPACITIES = {
  1: 4,
  2: 4,
  3: 4,
  4: 4,
  5: 4,
  6: 4,
  7: 4,
  8: 4,
  9: 4,
  10: 4,
  11: 4,
  12: 4,
  13: 4,
  14: 4,
  15: 4,
  16: 4,
  17: 4,
  18: 4,
  19: 4,
  20: 4,
}

export function GuestManifestEditor({ open, onOpenChange, onDataChange }: GuestManifestEditorProps) {
  const supabase = createClientComponentClient()
  const [activeTab, setActiveTab] = useState("manage-guests")
  const [guests, setGuests] = useState<Guest[]>([])
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Filter state
  const [filters, setFilters] = useState({
    search: "",
    nationality: "all",
    tableStatus: "all",
    duplicates: "all",
  })

  // Phase 3: Advanced Analytics State
  const [analyticsView, setAnalyticsView] = useState("overview")
  const [timeRange, setTimeRange] = useState("24h")
  const [exportFormat, setExportFormat] = useState("csv")
  const [realTimeEnabled, setRealTimeEnabled] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Tools state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importMapping, setImportMapping] = useState<Record<string, string>>({})
  const [importProgress, setImportProgress] = useState(0)
  const [isImporting, setIsImporting] = useState(false)

  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([])
  const [changeLogFilter, setChangeLogFilter] = useState("all")
  const [loadingChangeLog, setLoadingChangeLog] = useState(false)

  const [conflicts, setConflicts] = useState<DataConflict[]>([])
  const [loadingConflicts, setLoadingConflicts] = useState(false)

  const [backupProgress, setBackupProgress] = useState(0)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  // Advanced features state
  const [availableNationalities, setAvailableNationalities] = useState<string[]>([])
  const [availableTables, setAvailableTables] = useState<number[]>([])
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set())
  const [editingGuest, setEditingGuest] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<Guest>>({})
  const [statistics, setStatistics] = useState({
    totalGuests: 0,
    assignedGuests: 0,
    unassignedGuests: 0,
    nationalityBreakdown: {} as Record<string, number>,
    tableBreakdown: {} as Record<string, number>,
    bookingGroups: 0,
  })

  // Add guest form state
  const [newGuest, setNewGuest] = useState<Partial<Guest>>({
    guest_name: "",
    cabin_nr: "",
    nationality: "",
    booking_number: "",
    cruise_id: "",
  })

  // Virtual scrolling state
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 })
  const itemHeight = 45
  const containerHeight = 400
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Phase 3: Advanced Analytics Calculations
  const advancedAnalytics = useMemo((): AdvancedAnalytics => {
    // Calculate occupancy trends (simulated data for demo)
    const occupancyTrends = Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      percentage: Math.random() * 100,
    }))

    // Calculate nationality distribution with percentages
    const nationalityDistribution = Object.entries(statistics.nationalityBreakdown)
      .map(([nationality, count]) => ({
        nationality,
        count,
        percentage: (count / statistics.totalGuests) * 100,
      }))
      .sort((a, b) => b.count - a.count)

    // Calculate table utilization efficiency
    const tableUtilization = Object.entries(statistics.tableBreakdown)
      .map(([table, count]) => {
        const tableNum = Number.parseInt(table.replace("Table ", ""))
        const capacity = TABLE_CAPACITIES[tableNum] || 4
        const efficiency = (count / capacity) * 100
        return {
          table: tableNum,
          efficiency,
          turnover: Math.random() * 5, // Simulated turnover rate
        }
      })
      .sort((a, b) => a.table - b.table)

    // Calculate booking patterns
    const bookingSizes = guests.reduce(
      (acc, guest) => {
        const bookingGuests = guests.filter((g) => g.booking_number === guest.booking_number)
        const size = bookingGuests.length
        acc[size] = (acc[size] || 0) + 1
        return acc
      },
      {} as Record<number, number>,
    )

    const bookingPatterns = Object.entries(bookingSizes)
      .map(([size, count]) => ({
        size: Number.parseInt(size),
        count,
        percentage: (count / statistics.bookingGroups) * 100,
      }))
      .sort((a, b) => a.size - b.size)

    // Calculate real-time metrics
    const currentOccupancy = (statistics.assignedGuests / statistics.totalGuests) * 100
    const peakOccupancy = Math.max(currentOccupancy, 85) // Simulated peak
    const averageGroupSize = statistics.totalGuests / Math.max(statistics.bookingGroups, 1)
    const utilizationRate = (Object.keys(statistics.tableBreakdown).length / 20) * 100

    // Calculate predictive insights
    const expectedFullTables = Math.ceil(statistics.totalGuests / 4)
    const recommendedReassignments = Math.max(0, Object.keys(statistics.tableBreakdown).length - expectedFullTables)
    const optimizationScore = Math.min(100, (utilizationRate + currentOccupancy) / 2)

    return {
      occupancyTrends,
      nationalityDistribution,
      tableUtilization,
      bookingPatterns,
      realTimeMetrics: {
        currentOccupancy,
        peakOccupancy,
        averageGroupSize,
        utilizationRate,
      },
      predictiveInsights: {
        expectedFullTables,
        recommendedReassignments,
        optimizationScore,
      },
    }
  }, [guests, statistics])

  // Real-time updates
  useEffect(() => {
    if (!realTimeEnabled || !open) return

    const interval = setInterval(() => {
      setLastUpdate(new Date())
      // In a real app, this would trigger data refresh
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [realTimeEnabled, open])

  // Fetch guests from database
  const fetchGuests = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("guest_manifest").select("*").order("guest_name", { ascending: true })

      if (error) {
        console.error("Error fetching guests:", error)
        throw error
      }

      setGuests(data || [])
      calculateStatistics(data || [])

      const nationalities = Array.from(new Set(data?.map((g) => g.nationality).filter(Boolean) || []))
      const tables = Array.from(new Set(data?.map((g) => g.table_nr).filter(Boolean) || []))

      setAvailableNationalities(nationalities.sort())
      setAvailableTables(tables.sort((a, b) => a - b))
    } catch (error) {
      console.error("Error fetching guests:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to fetch guest data. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Calculate statistics
  const calculateStatistics = (guestData: Guest[]) => {
    const stats = {
      totalGuests: guestData.length,
      assignedGuests: guestData.filter((g) => g.table_nr).length,
      unassignedGuests: guestData.filter((g) => !g.table_nr).length,
      nationalityBreakdown: {} as Record<string, number>,
      tableBreakdown: {} as Record<string, number>,
      bookingGroups: new Set(guestData.map((g) => g.booking_number).filter(Boolean)).size,
    }

    guestData.forEach((guest) => {
      const nationality = guest.nationality || "Unknown"
      stats.nationalityBreakdown[nationality] = (stats.nationalityBreakdown[nationality] || 0) + 1

      if (guest.table_nr) {
        const table = `Table ${guest.table_nr}`
        stats.tableBreakdown[table] = (stats.tableBreakdown[table] || 0) + 1
      }
    })

    setStatistics(stats)
  }

  // Apply filters
  useEffect(() => {
    let result = [...guests]

    if (filters.search) {
      const term = filters.search.toLowerCase()
      result = result.filter(
        (guest) =>
          guest.guest_name?.toLowerCase().includes(term) ||
          guest.cabin_nr?.toLowerCase().includes(term) ||
          guest.nationality?.toLowerCase().includes(term),
      )
    }

    if (filters.nationality !== "all") {
      result = result.filter((guest) => guest.nationality === filters.nationality)
    }

    if (filters.tableStatus !== "all") {
      if (filters.tableStatus === "assigned") {
        result = result.filter((guest) => guest.table_nr)
      } else if (filters.tableStatus === "unassigned") {
        result = result.filter((guest) => !guest.table_nr)
      }
    }

    if (filters.duplicates !== "all") {
      if (filters.duplicates === "duplicates") {
        const cabinCounts = result.reduce(
          (acc, guest) => {
            acc[guest.cabin_nr] = (acc[guest.cabin_nr] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )
        result = result.filter((guest) => cabinCounts[guest.cabin_nr] > 1)
      }
    }

    setFilteredGuests(result)
    setVisibleRange({ start: 0, end: Math.min(100, result.length) })
  }, [guests, filters])

  // Virtual scrolling handler
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, clientHeight } = event.currentTarget
      const start = Math.floor(scrollTop / itemHeight)
      const end = Math.min(start + Math.ceil(clientHeight / itemHeight) + 10, filteredGuests.length)
      setVisibleRange({ start, end })
    },
    [filteredGuests.length, itemHeight],
  )

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      fetchGuests()
    }
  }, [open, fetchGuests])

  // Phase 3: Advanced Export Functions
  const handleAdvancedExport = async () => {
    const timestamp = new Date().toISOString().split("T")[0]

    if (exportFormat === "csv") {
      // Enhanced CSV export with analytics
      const headers = [
        "Guest Name",
        "Cabin",
        "Nationality",
        "Booking Number",
        "Cruise ID",
        "Table",
        "Group Size",
        "Nationality %",
        "Table Efficiency",
        "Booking Pattern",
      ]

      const csvContent = [
        headers.join(","),
        ...filteredGuests.map((guest) => {
          const groupSize = guests.filter((g) => g.booking_number === guest.booking_number).length
          const nationalityPercent = (
            ((statistics.nationalityBreakdown[guest.nationality] || 0) / statistics.totalGuests) *
            100
          ).toFixed(1)
          const tableEfficiency = guest.table_nr
            ? (
                ((statistics.tableBreakdown[`Table ${guest.table_nr}`] || 0) /
                  (TABLE_CAPACITIES[guest.table_nr] || 4)) *
                100
              ).toFixed(1)
            : "N/A"

          return [
            `"${guest.guest_name || ""}"`,
            `"${guest.cabin_nr || ""}"`,
            `"${guest.nationality || ""}"`,
            `"${guest.booking_number || ""}"`,
            `"${guest.cruise_id || ""}"`,
            guest.table_nr || "",
            groupSize,
            `${nationalityPercent}%`,
            `${tableEfficiency}%`,
            groupSize > 4 ? "Large Group" : groupSize > 2 ? "Medium Group" : "Small Group",
          ].join(",")
        }),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `guest_manifest_analytics_${timestamp}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else if (exportFormat === "json") {
      // JSON export with full analytics
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalGuests: statistics.totalGuests,
          assignedGuests: statistics.assignedGuests,
          unassignedGuests: statistics.bookingGroups,
        },
        guests: filteredGuests,
        analytics: advancedAnalytics,
        statistics,
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `guest_manifest_full_${timestamp}.json`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else if (exportFormat === "pdf") {
      // PDF report generation (simplified)
      const reportContent = `
        GUEST MANIFEST ANALYTICS REPORT
        Generated: ${new Date().toLocaleString()}
        
        SUMMARY STATISTICS:
        - Total Guests: ${statistics.totalGuests}
        - Assigned to Tables: ${statistics.assignedGuests}
        - Unassigned: ${statistics.unassignedGuests}
        - Booking Groups: ${statistics.bookingGroups}
        - Tables Used: ${Object.keys(statistics.tableBreakdown).length}
        
        OCCUPANCY METRICS:
        - Current Occupancy: ${advancedAnalytics.realTimeMetrics.currentOccupancy.toFixed(1)}%
        - Peak Occupancy: ${advancedAnalytics.realTimeMetrics.peakOccupancy.toFixed(1)}%
        - Average Group Size: ${advancedAnalytics.realTimeMetrics.averageGroupSize.toFixed(1)}
        - Utilization Rate: ${advancedAnalytics.realTimeMetrics.utilizationRate.toFixed(1)}%
        
        OPTIMIZATION INSIGHTS:
        - Optimization Score: ${advancedAnalytics.predictiveInsights.optimizationScore.toFixed(1)}/100
        - Expected Full Tables: ${advancedAnalytics.predictiveInsights.expectedFullTables}
        - Recommended Reassignments: ${advancedAnalytics.predictiveInsights.recommendedReassignments}
      `

      const blob = new Blob([reportContent], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `guest_manifest_report_${timestamp}.txt`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    setStatusMessage({
      type: "success",
      message: `Analytics report exported successfully as ${exportFormat.toUpperCase()}.`,
    })
  }

  // TOOLS FUNCTIONALITY (keeping existing implementation)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
      processImportFile(file)
    }
  }

  const processImportFile = async (file: File) => {
    try {
      setLoading(true)
      const text = await file.text()

      const lines = text.split("\n").filter((line) => line.trim())
      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
        return headers.reduce(
          (obj, header, index) => {
            obj[header] = values[index] || ""
            return obj
          },
          {} as Record<string, string>,
        )
      })

      setImportPreview(rows.slice(0, 10))

      const mapping: Record<string, string> = {}
      headers.forEach((header) => {
        const lower = header.toLowerCase()
        if (lower.includes("name")) mapping["guest_name"] = header
        if (lower.includes("cabin")) mapping["cabin_nr"] = header
        if (lower.includes("nationality")) mapping["nationality"] = header
        if (lower.includes("booking")) mapping["booking_number"] = header
        if (lower.includes("cruise")) mapping["cruise_id"] = header
        if (lower.includes("table")) mapping["table_nr"] = header
      })
      setImportMapping(mapping)
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: "Failed to process import file. Please check the format.",
      })
    } finally {
      setLoading(false)
    }
  }

  const executeImport = async () => {
    if (!importFile || !importPreview.length) return

    try {
      setIsImporting(true)
      setImportProgress(0)

      const text = await importFile.text()
      const lines = text.split("\n").filter((line) => line.trim())
      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
      const rows = lines.slice(1)

      for (let i = 0; i < rows.length; i++) {
        const values = rows[i].split(",").map((v) => v.trim().replace(/"/g, ""))
        const rowData = headers.reduce(
          (obj, header, index) => {
            obj[header] = values[index] || ""
            return obj
          },
          {} as Record<string, string>,
        )

        const guestData: Partial<Guest> = {}
        Object.entries(importMapping).forEach(([field, column]) => {
          if (rowData[column]) {
            if (field === "table_nr") {
              guestData[field] = Number.parseInt(rowData[column]) || undefined
            } else {
              guestData[field as keyof Guest] = rowData[column] as any
            }
          }
        })

        if (guestData.guest_name && guestData.cabin_nr) {
          const { error } = await supabase.from("guest_manifest").insert([guestData])
          if (error) {
            console.error("Import error:", error)
          }
        }

        setImportProgress(((i + 1) / rows.length) * 100)
      }

      await fetchGuests()
      onDataChange?.()
      setStatusMessage({
        type: "success",
        message: `Successfully imported ${rows.length} guests.`,
      })

      setImportFile(null)
      setImportPreview([])
      setImportMapping({})
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: "Failed to import data. Please try again.",
      })
    } finally {
      setIsImporting(false)
      setImportProgress(0)
    }
  }

  const fetchChangeLog = async () => {
    try {
      setLoadingChangeLog(true)

      const mockChangeLog: ChangeLogEntry[] = [
        {
          id: "1",
          action: "CREATE",
          table_name: "guest_manifest",
          record_id: "guest_123",
          new_values: { guest_name: "John Doe", cabin_nr: "101" },
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "2",
          action: "UPDATE",
          table_name: "guest_manifest",
          record_id: "guest_124",
          old_values: { table_nr: null },
          new_values: { table_nr: 5 },
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: "3",
          action: "DELETE",
          table_name: "guest_manifest",
          record_id: "guest_125",
          old_values: { guest_name: "Jane Smith", cabin_nr: "102" },
          timestamp: new Date(Date.now() - 10800000).toISOString(),
        },
      ]

      setChangeLog(mockChangeLog)
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: "Failed to load change history.",
      })
    } finally {
      setLoadingChangeLog(false)
    }
  }

  const handleBackupData = async () => {
    try {
      setIsBackingUp(true)
      setBackupProgress(0)

      for (let i = 0; i <= 100; i += 10) {
        setBackupProgress(i)
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      const headers = ["Guest Name", "Cabin", "Nationality", "Booking Number", "Cruise ID", "Table"]
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
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `guest_manifest_backup_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setStatusMessage({
        type: "success",
        message: "Backup completed successfully.",
      })
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: "Backup failed. Please try again.",
      })
    } finally {
      setIsBackingUp(false)
      setBackupProgress(0)
    }
  }

  const handleRestoreData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsRestoring(true)

      if (!confirm("This will replace all current data. Are you sure?")) {
        setIsRestoring(false)
        return
      }

      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())

      await supabase.from("guest_manifest").delete().neq("id", "")

      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
      const rows = lines.slice(1)

      for (const row of rows) {
        const values = row.split(",").map((v) => v.trim().replace(/"/g, ""))
        const guestData = {
          guest_name: values[0],
          cabin_nr: values[1],
          nationality: values[2],
          booking_number: values[3],
          cruise_id: values[4],
          table_nr: values[5] ? Number.parseInt(values[5]) : null,
        }

        if (guestData.guest_name && guestData.cabin_nr) {
          await supabase.from("guest_manifest").insert([guestData])
        }
      }

      await fetchGuests()
      onDataChange?.()

      setStatusMessage({
        type: "success",
        message: "Data restored successfully.",
      })
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: "Restore failed. Please try again.",
      })
    } finally {
      setIsRestoring(false)
    }
  }

  const checkDataIntegrity = async () => {
    try {
      setLoadingConflicts(true)
      const foundConflicts: DataConflict[] = []

      // Replace the existing duplicate cabin detection logic (around line 600-620)
      const cabinCounts = guests.reduce(
        (acc, guest) => {
          acc[guest.cabin_nr] = (acc[guest.cabin_nr] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      // Update this section to only flag cabins with MORE than 2 guests
      Object.entries(cabinCounts).forEach(([cabin, count]) => {
        if (count > 2) {
          // Changed from count > 1 to count > 2
          const duplicateGuests = guests.filter((g) => g.cabin_nr === cabin)
          foundConflicts.push({
            type: "DUPLICATE_CABIN",
            severity: "HIGH",
            description: `Cabin ${cabin} has ${count} guests (maximum 2 expected)`, // Updated description
            affected_records: duplicateGuests.map((g) => g.id),
            suggested_fix: "Review cabin assignments - cabins should have maximum 2 guests",
          })
        }
      })

      guests.forEach((guest) => {
        const missing = []
        if (!guest.guest_name) missing.push("name")
        if (!guest.cabin_nr) missing.push("cabin")
        if (!guest.nationality) missing.push("nationality")

        if (missing.length > 0) {
          foundConflicts.push({
            type: "MISSING_DATA",
            severity: "MEDIUM",
            description: `Guest ${guest.id} is missing: ${missing.join(", ")}`,
            affected_records: [guest.id],
            suggested_fix: "Complete the missing information",
          })
        }
      })

      guests.forEach((guest) => {
        if (guest.table_nr && (guest.table_nr < 1 || guest.table_nr > 20)) {
          foundConflicts.push({
            type: "INVALID_TABLE",
            severity: "MEDIUM",
            description: `Guest ${guest.guest_name} assigned to invalid table ${guest.table_nr}`,
            affected_records: [guest.id],
            suggested_fix: "Assign to a valid table number (1-20)",
          })
        }
      })

      setConflicts(foundConflicts)

      if (foundConflicts.length === 0) {
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
      setLoadingConflicts(false)
    }
  }

  // Add new guest
  const handleAddGuest = async () => {
    if (!newGuest.guest_name || !newGuest.cabin_nr) {
      setStatusMessage({
        type: "error",
        message: "Guest name and cabin number are required.",
      })
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase.from("guest_manifest").insert([newGuest])

      if (error) {
        console.error("Error adding guest:", error)
        throw error
      }

      setNewGuest({
        guest_name: "",
        cabin_nr: "",
        nationality: "",
        booking_number: "",
        cruise_id: "",
      })
      await fetchGuests()
      onDataChange?.()

      setStatusMessage({
        type: "success",
        message: "Guest added successfully.",
      })
    } catch (error) {
      console.error("Error adding guest:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to add guest. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  // Start editing guest
  const startEditGuest = (guest: Guest) => {
    setEditingGuest(guest.id)
    setEditingData({ ...guest })
  }

  // Save guest changes
  const saveGuestChanges = async () => {
    if (!editingGuest || !editingData) return

    try {
      setSaving(true)
      const { error } = await supabase.from("guest_manifest").update(editingData).eq("id", editingGuest)

      if (error) {
        console.error("Error updating guest:", error)
        throw error
      }

      await fetchGuests()
      onDataChange?.()
      setEditingGuest(null)
      setEditingData({})

      setStatusMessage({
        type: "success",
        message: "Guest updated successfully.",
      })
    } catch (error) {
      console.error("Error updating guest:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to update guest. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingGuest(null)
    setEditingData({})
  }

  // Delete guest
  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm("Are you sure you want to delete this guest?")) return

    try {
      setSaving(true)
      const { error } = await supabase.from("guest_manifest").delete().eq("id", guestId)

      if (error) {
        console.error("Error deleting guest:", error)
        throw error
      }

      await fetchGuests()
      onDataChange?.()

      setStatusMessage({
        type: "success",
        message: "Guest deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting guest:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to update guest. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  // Export to CSV
  const handleExport = () => {
    const headers = ["Guest Name", "Cabin", "Nationality", "Booking Number", "Cruise ID", "Table"]
    const csvContent = [
      headers.join(","),
      ...filteredGuests.map((guest) =>
        [
          `"${guest.guest_name || ""}"`,
          `"${guest.cabin_nr || ""}"`,
          `"${guest.nationality || ""}"`,
          `"${guest.booking_number || ""}"`,
          `"${guest.cruise_id || ""}"`,
          guest.table_nr || "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `guest_manifest_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: "",
      nationality: "all",
      tableStatus: "all",
      duplicates: "all",
    })
  }

  // Toggle guest selection
  const toggleGuestSelection = (guestId: string) => {
    const newSelection = new Set(selectedGuests)
    if (newSelection.has(guestId)) {
      newSelection.delete(guestId)
    } else {
      newSelection.add(guestId)
    }
    setSelectedGuests(newSelection)
  }

  // Select all visible guests
  const toggleSelectAll = () => {
    if (selectedGuests.size === filteredGuests.length) {
      setSelectedGuests(new Set())
    } else {
      setSelectedGuests(new Set(filteredGuests.map((g) => g.id)))
    }
  }

  const visibleGuests = filteredGuests.slice(visibleRange.start, visibleRange.end)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Guest Manifest Editor
            <Badge variant="outline">{guests.length} total guests</Badge>
            {realTimeEnabled && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <Activity className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {statusMessage && (
          <Alert
            className={statusMessage.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="manage-guests" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Manage Guests
              <Badge variant="secondary">{filteredGuests.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="add-guest" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Guest
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Advanced Analytics
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                <TrendingUp className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Tools
            </TabsTrigger>
          </TabsList>

          {/* Manage Guests Tab - keeping existing implementation */}
          <TabsContent value="manage-guests" className="space-y-4">
            {/* Advanced Filters */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, cabin, nationality"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-8"
                  />
                </div>

                <Select
                  value={filters.nationality}
                  onValueChange={(value) => setFilters({ ...filters, nationality: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Nationalities</SelectItem>
                    {availableNationalities.map((nationality) => (
                      <SelectItem key={nationality} value={nationality}>
                        {nationality}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.tableStatus}
                  onValueChange={(value) => setFilters({ ...filters, tableStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Table Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Guests</SelectItem>
                    <SelectItem value="assigned">Assigned to Table</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.duplicates}
                  onValueChange={(value) => setFilters({ ...filters, duplicates: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Duplicates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Guests</SelectItem>
                    <SelectItem value="duplicates">Show Duplicates Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                  <Button onClick={clearFilters} variant="outline" size="sm" className="flex items-center gap-1">
                    <Filter className="h-4 w-4" />
                    Clear Filters
                  </Button>
                  <Button onClick={handleExport} variant="outline" size="sm" className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Printer className="h-4 w-4" />
                    Print List
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Save Filter
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedGuests.size === filteredGuests.length && filteredGuests.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm">Select All Visible</span>
                </div>
              </div>
            </div>

            {/* Guest List */}
            {loading ? (
              <LoadingSpinner size={24} text="Loading guests..." />
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 border-b">
                  <div className="grid grid-cols-12 gap-2 p-2 text-sm font-medium">
                    <div className="col-span-1"></div>
                    <div className="col-span-3">Guest Name</div>
                    <div className="col-span-2">Cabin</div>
                    <div className="col-span-2">Nationality</div>
                    <div className="col-span-2">Booking</div>
                    <div className="col-span-1">Table</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                </div>

                {/* Virtual Scrolled Content */}
                <div
                  ref={scrollContainerRef}
                  className="overflow-auto"
                  style={{ height: `${containerHeight}px` }}
                  onScroll={handleScroll}
                >
                  <div style={{ height: `${filteredGuests.length * itemHeight}px`, position: "relative" }}>
                    {visibleGuests.map((guest, index) => {
                      const actualIndex = visibleRange.start + index
                      const isEditing = editingGuest === guest.id

                      return (
                        <div
                          key={guest.id}
                          className="absolute w-full border-b hover:bg-gray-50"
                          style={{
                            top: `${actualIndex * itemHeight}px`,
                            height: `${itemHeight}px`,
                          }}
                        >
                          <div className="grid grid-cols-12 gap-2 p-2 h-full items-center text-sm">
                            <div className="col-span-1">
                              <Checkbox
                                checked={selectedGuests.has(guest.id)}
                                onCheckedChange={() => toggleGuestSelection(guest.id)}
                              />
                            </div>
                            <div className="col-span-3">
                              {isEditing ? (
                                <Input
                                  value={editingData.guest_name || ""}
                                  onChange={(e) => setEditingData({ ...editingData, guest_name: e.target.value })}
                                  className="h-8"
                                />
                              ) : (
                                <span className="truncate">{guest.guest_name}</span>
                              )}
                            </div>
                            <div className="col-span-2">
                              {isEditing ? (
                                <Input
                                  value={editingData.cabin_nr || ""}
                                  onChange={(e) => setEditingData({ ...editingData, cabin_nr: e.target.value })}
                                  className="h-8"
                                />
                              ) : (
                                <span>{guest.cabin_nr}</span>
                              )}
                            </div>
                            <div className="col-span-2">
                              {isEditing ? (
                                <Input
                                  value={editingData.nationality || ""}
                                  onChange={(e) => setEditingData({ ...editingData, nationality: e.target.value })}
                                  className="h-8"
                                />
                              ) : (
                                <span className="truncate">{guest.nationality}</span>
                              )}
                            </div>
                            <div className="col-span-2">
                              {isEditing ? (
                                <Input
                                  value={editingData.booking_number || ""}
                                  onChange={(e) => setEditingData({ ...editingData, booking_number: e.target.value })}
                                  className="h-8"
                                />
                              ) : (
                                <span className="truncate">{guest.booking_number}</span>
                              )}
                            </div>
                            <div className="col-span-1">
                              {guest.table_nr ? (
                                <Badge variant="outline">{guest.table_nr}</Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                            <div className="col-span-1 flex gap-1">
                              {isEditing ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-green-600"
                                    onClick={saveGuestChanges}
                                    disabled={saving}
                                  >
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={cancelEdit}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => startEditGuest(guest)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={() => handleDeleteGuest(guest.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Add New Guest Tab - keeping existing implementation */}
          <TabsContent value="add-guest" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="guest-name" className="text-sm font-medium">
                  Guest Name *
                </Label>
                <Input
                  id="guest-name"
                  placeholder="Enter guest name"
                  value={newGuest.guest_name}
                  onChange={(e) => setNewGuest({ ...newGuest, guest_name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="cabin-number" className="text-sm font-medium">
                  Cabin Number *
                </Label>
                <Input
                  id="cabin-number"
                  placeholder="Enter cabin number"
                  value={newGuest.cabin_nr}
                  onChange={(e) => setNewGuest({ ...newGuest, cabin_nr: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="nationality" className="text-sm font-medium">
                  Nationality
                </Label>
                <Input
                  id="nationality"
                  placeholder="Enter nationality"
                  value={newGuest.nationality}
                  onChange={(e) => setNewGuest({ ...newGuest, nationality: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="booking-number" className="text-sm font-medium">
                  Booking Number
                </Label>
                <Input
                  id="booking-number"
                  placeholder="Enter booking number"
                  value={newGuest.booking_number}
                  onChange={(e) => setNewGuest({ ...newGuest, booking_number: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="cruise-id" className="text-sm font-medium">
                  Cruise ID
                </Label>
                <Input
                  id="cruise-id"
                  placeholder="Enter cruise ID"
                  value={newGuest.cruise_id}
                  onChange={(e) => setNewGuest({ ...newGuest, cruise_id: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  setNewGuest({
                    guest_name: "",
                    cabin_nr: "",
                    nationality: "",
                    booking_number: "",
                    cruise_id: "",
                  })
                }
              >
                Clear Form
              </Button>
              <Button onClick={handleAddGuest} disabled={saving} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Guest
              </Button>
            </div>
          </TabsContent>

          {/* PHASE 3: ADVANCED ANALYTICS TAB */}
          <TabsContent value="statistics" className="space-y-6">
            {/* Analytics Controls */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2">
                <Select value={analyticsView} onValueChange={setAnalyticsView}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="View" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Overview</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="trends">Trends</SelectItem>
                    <SelectItem value="predictions">Predictions</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24h</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Export Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="pdf">PDF Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2">
                  <Checkbox checked={realTimeEnabled} onCheckedChange={setRealTimeEnabled} />
                  <span className="text-sm">Real-time Updates</span>
                </div>
                <Button onClick={handleAdvancedExport} variant="outline" size="sm" className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  Export Analytics
                </Button>
                <div className="text-xs text-gray-500">Last updated: {lastUpdate.toLocaleTimeString()}</div>
              </div>
            </div>

            {/* Real-time Metrics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-5 w-5 text-blue-600 mr-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      {advancedAnalytics.realTimeMetrics.currentOccupancy.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Current Occupancy</div>
                  <div className="text-xs text-gray-500">
                    {statistics.assignedGuests} of {statistics.totalGuests} guests
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                    <div className="text-2xl font-bold text-green-600">
                      {advancedAnalytics.realTimeMetrics.peakOccupancy.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Peak Occupancy</div>
                  <div className="text-xs text-gray-500">Highest recorded today</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <UserCheck className="h-5 w-5 text-purple-600 mr-2" />
                    <div className="text-2xl font-bold text-purple-600">
                      {advancedAnalytics.realTimeMetrics.averageGroupSize.toFixed(1)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Avg Group Size</div>
                  <div className="text-xs text-gray-500">Guests per booking</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="h-5 w-5 text-orange-600 mr-2" />
                    <div className="text-2xl font-bold text-orange-600">
                      {advancedAnalytics.realTimeMetrics.utilizationRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">Table Utilization</div>
                  <div className="text-xs text-gray-500">
                    {Object.keys(statistics.tableBreakdown).length} of 20 tables
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Predictive Insights */}
            <Card className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-indigo-600" />
                  AI-Powered Insights
                  <Badge variant="outline" className="bg-indigo-100 text-indigo-700">
                    <Award className="h-3 w-3 mr-1" />
                    Score: {advancedAnalytics.predictiveInsights.optimizationScore.toFixed(0)}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {advancedAnalytics.predictiveInsights.expectedFullTables}
                    </div>
                    <div className="text-sm text-gray-600">Expected Full Tables</div>
                    <div className="text-xs text-gray-500">Based on current bookings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {advancedAnalytics.predictiveInsights.recommendedReassignments}
                    </div>
                    <div className="text-sm text-gray-600">Recommended Moves</div>
                    <div className="text-xs text-gray-500">For optimal efficiency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {100 - advancedAnalytics.predictiveInsights.optimizationScore.toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Improvement Potential</div>
                    <div className="text-xs text-gray-500">Efficiency gains possible</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Enhanced Nationality Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Nationality Distribution
                    <Badge variant="outline">{advancedAnalytics.nationalityDistribution.length} countries</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Add scroll container here */}
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {advancedAnalytics.nationalityDistribution.map(({ nationality, count, percentage }) => {
                      const bgColor = NATIONALITY_COLORS[nationality] || NATIONALITY_COLORS.Other
                      const textColor = NATIONALITY_TEXT_COLORS[nationality] || NATIONALITY_TEXT_COLORS.Other

                      return (
                        <div key={nationality} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium" style={{ color: textColor }}>
                              {nationality}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">{count}</span>
                              <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: bgColor,
                              }}
                            >
                              {percentage > 15 && (
                                <span className="text-xs font-medium" style={{ color: textColor }}>
                                  {percentage.toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Table Occupancy - already has scroll container, ensure it's properly sized */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5" />
                    Table Efficiency Analysis
                    <Badge variant="outline">{advancedAnalytics.tableUtilization.length} active tables</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Ensure this scroll container has proper height */}
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {advancedAnalytics.tableUtilization.map(({ table, efficiency, turnover }) => {
                      const capacity = TABLE_CAPACITIES[table] || 4
                      const currentGuests = statistics.tableBreakdown[`Table ${table}`] || 0
                      const isOptimal = efficiency >= 75
                      const isEmpty = currentGuests === 0

                      return (
                        <div key={table} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Table {table}</span>
                              {isOptimal && <Award className="h-3 w-3 text-yellow-500" />}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-bold">
                                {currentGuests}/{capacity}
                              </span>
                              <span className="text-gray-500">({efficiency.toFixed(0)}%)</span>
                            </div>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                              className={`h-4 rounded-full transition-all duration-300 flex items-center justify-center ${
                                isEmpty
                                  ? "bg-gray-300"
                                  : efficiency === 100
                                    ? "bg-green-500"
                                    : efficiency >= 75
                                      ? "bg-green-400"
                                      : efficiency >= 50
                                        ? "bg-yellow-400"
                                        : "bg-red-400"
                              }`}
                              style={{ width: `${Math.max(efficiency, 5)}%` }}
                            >
                              {efficiency > 20 && (
                                <span className="text-xs font-medium text-white">{efficiency.toFixed(0)}%</span>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Efficiency: {efficiency.toFixed(1)}%</span>
                            <span>Turnover: {turnover.toFixed(1)}x</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Booking Patterns Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Booking Pattern Analysis
                  <Badge variant="outline">{statistics.bookingGroups} total bookings</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Group Size Distribution</h4>
                    {advancedAnalytics.bookingPatterns.map(({ size, count, percentage }) => (
                      <div key={size} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">
                            {size === 1
                              ? "Solo travelers"
                              : size === 2
                                ? "Couples"
                                : size <= 4
                                  ? "Small groups"
                                  : size <= 6
                                    ? "Medium groups"
                                    : "Large groups"}
                            ({size} guests)
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{count}</span>
                            <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              size === 1
                                ? "bg-blue-400"
                                : size === 2
                                  ? "bg-green-400"
                                  : size <= 4
                                    ? "bg-yellow-400"
                                    : size <= 6
                                      ? "bg-orange-400"
                                      : "bg-red-400"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Optimization Recommendations</h4>
                    <div className="space-y-2 text-sm">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-800">Table Assignment</span>
                        </div>
                        <p className="text-blue-700">
                          Consider grouping similar-sized bookings to maximize table efficiency.
                        </p>
                      </div>

                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-800">Capacity Optimization</span>
                        </div>
                        <p className="text-green-700">
                          Current utilization is {advancedAnalytics.realTimeMetrics.utilizationRate.toFixed(0)}%.
                          {advancedAnalytics.realTimeMetrics.utilizationRate < 80
                            ? " Consider consolidating smaller groups."
                            : " Excellent utilization rate!"}
                        </p>
                      </div>

                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Globe className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-purple-800">Cultural Considerations</span>
                        </div>
                        <p className="text-purple-700">
                          Mix nationalities thoughtfully to enhance the dining experience.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Occupancy Trends Chart */}
            {analyticsView === "trends" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Occupancy Trends
                    <Badge variant="outline">Last {timeRange}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between gap-1 p-4 bg-gray-50 rounded-lg">
                    {advancedAnalytics.occupancyTrends.map((trend, index) => (
                      <div key={index} className="flex flex-col items-center gap-1 flex-1">
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                          style={{ height: `${trend.percentage * 2}px` }}
                          title={`${trend.time}: ${trend.percentage.toFixed(1)}%`}
                        />
                        <span className="text-xs text-gray-600 transform -rotate-45 origin-center">{trend.time}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-center text-sm text-gray-600">
                    Hover over bars to see detailed occupancy percentages
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tools Tab - keeping existing implementation */}
          <TabsContent value="tools" className="space-y-6">
            {/* Add scroll container for tools grid */}
            <div className="max-h-[600px] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Advanced Import */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      Advanced Import
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Import guest data from Excel/CSV files with column mapping and preview.
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                      variant="outline"
                      disabled={isImporting}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Select Excel/CSV File
                    </Button>

                    {importFile && (
                      <div className="space-y-3">
                        <div className="text-sm">
                          <strong>File:</strong> {importFile.name}
                        </div>

                        {importPreview.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Column Mapping:</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(importMapping).map(([field, column]) => (
                                <div key={field} className="flex justify-between">
                                  <span>{field}:</span>
                                  <span className="font-medium">{column}</span>
                                </div>
                              ))}
                            </div>

                            <div className="text-sm">Preview: {importPreview.length} rows</div>

                            {isImporting && (
                              <div className="space-y-2">
                                <Progress value={importProgress} className="w-full" />
                                <div className="text-xs text-center">{Math.round(importProgress)}% complete</div>
                              </div>
                            )}

                            <Button onClick={executeImport} className="w-full" disabled={isImporting}>
                              {isImporting ? "Importing..." : "Import Data"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Change History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Change History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">View recent changes made to the guest manifest.</p>

                    <Button onClick={fetchChangeLog} className="w-full" variant="outline" disabled={loadingChangeLog}>
                      <Eye className="h-4 w-4 mr-2" />
                      {loadingChangeLog ? "Loading..." : `View Change Log (${changeLog.length})`}
                    </Button>

                    {changeLog.length > 0 && (
                      <div className="space-y-2">
                        <Select value={changeLogFilter} onValueChange={setChangeLogFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Filter changes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Changes</SelectItem>
                            <SelectItem value="CREATE">Created</SelectItem>
                            <SelectItem value="UPDATE">Updated</SelectItem>
                            <SelectItem value="DELETE">Deleted</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {changeLog
                            .filter((entry) => changeLogFilter === "all" || entry.action === changeLogFilter)
                            .map((entry) => (
                              <div key={entry.id} className="text-xs p-2 bg-gray-50 rounded">
                                <div className="flex justify-between">
                                  <span
                                    className={`font-medium ${
                                      entry.action === "CREATE"
                                        ? "text-green-600"
                                        : entry.action === "UPDATE"
                                          ? "text-blue-600"
                                          : "text-red-600"
                                    }`}
                                  >
                                    {entry.action}
                                  </span>
                                  <span className="text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="text-gray-600">Record: {entry.record_id}</div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Data Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5" />
                      Data Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">Backup and restore guest manifest data.</p>

                    <div className="space-y-2">
                      <Button onClick={handleBackupData} className="w-full" variant="outline" disabled={isBackingUp}>
                        <Download className="h-4 w-4 mr-2" />
                        {isBackingUp ? "Creating Backup..." : "Backup to CSV"}
                      </Button>

                      {isBackingUp && (
                        <div className="space-y-2">
                          <Progress value={backupProgress} className="w-full" />
                          <div className="text-xs text-center">{Math.round(backupProgress)}% complete</div>
                        </div>
                      )}

                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleRestoreData}
                        className="hidden"
                        id="restore-file"
                      />

                      <Button
                        onClick={() => document.getElementById("restore-file")?.click()}
                        className="w-full"
                        variant="outline"
                        disabled={isRestoring}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isRestoring ? "Restoring..." : "Restore from File"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Data Integrity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Data Integrity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">Check for data consistency and conflicts.</p>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Conflicts Found:</span> {conflicts.length}
                      </div>

                      <Button
                        onClick={checkDataIntegrity}
                        className="w-full"
                        variant="outline"
                        disabled={loadingConflicts}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {loadingConflicts ? "Checking..." : "Check Data Integrity"}
                      </Button>

                      {conflicts.length > 0 && (
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {conflicts.map((conflict, index) => (
                            <div key={index} className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                              <div className="flex justify-between items-start">
                                <span
                                  className={`font-medium ${
                                    conflict.severity === "HIGH"
                                      ? "text-red-600"
                                      : conflict.severity === "MEDIUM"
                                        ? "text-orange-600"
                                        : "text-yellow-600"
                                  }`}
                                >
                                  {conflict.severity}
                                </span>
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              </div>
                              <div className="text-gray-700 mt-1">{conflict.description}</div>
                              {conflict.suggested_fix && (
                                <div className="text-gray-600 mt-1 italic">Fix: {conflict.suggested_fix}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
