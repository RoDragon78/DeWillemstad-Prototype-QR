"use client"

import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Home, Printer } from "lucide-react"

// Nationality color mapping
const NATIONALITY_COLORS = {
  English: "#FFE66D", // Yellow
  German: "#4ECDC4", // Teal/Blue
  Dutch: "#FF6B35", // Orange
  Empty: "#F8F9FA", // Light gray
  Other: "#95A5A6", // Gray
}

const NATIONALITY_TEXT_COLORS = {
  English: "#8B5A00", // Dark yellow/brown
  German: "#0F5F5C", // Dark teal
  Dutch: "#B8441F", // Dark orange
  Empty: "#6C757D", // Gray
  Other: "#5D6D7E", // Dark gray
}

// Exact ship cabin layout - CORRECTED
const SHIP_LAYOUT = {
  deck2: {
    row1: ["206", "208", "210", "212", "214", "216", "218", "220", "222", "224", "226", "228"],
    row2: ["205", "207", "209", "211", "213", "215", "217", "219", "221", "223", "225", "227"],
  },
  deck1: {
    row1: ["102", "104", "106", null, "108", "110", "112", "114", "116", "118", "120", "122"],
    row2: ["124", "101", "103", "105", "107", "109", "111", "113", "115", "117", "119", "121", "123", "125"],
  },
}

interface CabinDisplayModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guests: any[]
}

interface CabinInfo {
  cabin_nr: string
  deck: number
  guests: any[]
  guestCount: number
  primaryNationality: string
  nationalities: Record<string, number>
  isEmpty: boolean
}

export function CabinDisplayModal({ open, onOpenChange, guests }: CabinDisplayModalProps) {
  // Process cabin data based on actual ship layout
  const { allCabins, deck1Cabins, deck2Cabins } = useMemo(() => {
    // Group guests by cabin
    const guestsByCabin = guests.reduce(
      (acc, guest) => {
        if (guest.cabin_nr) {
          if (!acc[guest.cabin_nr]) {
            acc[guest.cabin_nr] = []
          }
          acc[guest.cabin_nr].push(guest)
        }
        return acc
      },
      {} as Record<string, any[]>,
    )

    const createCabinInfo = (cabinNr: string, deck: number): CabinInfo => {
      const cabinGuests = guestsByCabin[cabinNr] || []
      const isEmpty = cabinGuests.length === 0

      // Calculate primary nationality
      let primaryNationality = "Empty"
      if (!isEmpty) {
        const nationalityCounts: Record<string, number> = {}
        cabinGuests.forEach((guest) => {
          const nationality = guest.nationality || "Other"
          nationalityCounts[nationality] = (nationalityCounts[nationality] || 0) + 1
        })

        let maxCount = 0
        Object.entries(nationalityCounts).forEach(([nat, count]) => {
          if (count > maxCount) {
            maxCount = count
            primaryNationality = nat
          }
        })
      }

      return {
        cabin_nr: cabinNr,
        deck,
        guests: cabinGuests,
        guestCount: cabinGuests.length,
        primaryNationality,
        nationalities: isEmpty
          ? {}
          : cabinGuests.reduce(
              (acc, guest) => {
                const nationality = guest.nationality || "Other"
                acc[nationality] = (acc[nationality] || 0) + 1
                return acc
              },
              {} as Record<string, number>,
            ),
        isEmpty,
      }
    }

    // Create all cabin objects based on ship layout
    const allCabins: CabinInfo[] = []

    // Process Deck 2
    const deck2Cabins: CabinInfo[] = []
    SHIP_LAYOUT.deck2.row1.forEach((cabinNr) => {
      if (cabinNr) {
        const cabin = createCabinInfo(cabinNr, 2)
        allCabins.push(cabin)
        deck2Cabins.push(cabin)
      }
    })
    SHIP_LAYOUT.deck2.row2.forEach((cabinNr) => {
      if (cabinNr) {
        const cabin = createCabinInfo(cabinNr, 2)
        allCabins.push(cabin)
        deck2Cabins.push(cabin)
      }
    })

    // Process Deck 1
    const deck1Cabins: CabinInfo[] = []
    SHIP_LAYOUT.deck1.row1.forEach((cabinNr) => {
      if (cabinNr) {
        const cabin = createCabinInfo(cabinNr, 1)
        allCabins.push(cabin)
        deck1Cabins.push(cabin)
      }
    })
    SHIP_LAYOUT.deck1.row2.forEach((cabinNr) => {
      if (cabinNr) {
        const cabin = createCabinInfo(cabinNr, 1)
        allCabins.push(cabin)
        deck1Cabins.push(cabin)
      }
    })

    return { allCabins, deck1Cabins, deck2Cabins }
  }, [guests])

  // Calculate nationality statistics (only for occupied cabins)
  const nationalityStats = useMemo(() => {
    const stats: Record<string, { cabins: number; passengers: number }> = {}

    allCabins.forEach((cabin) => {
      if (!cabin.isEmpty) {
        // Count passengers by nationality
        Object.entries(cabin.nationalities).forEach(([nationality, count]) => {
          if (!stats[nationality]) {
            stats[nationality] = { cabins: 0, passengers: 0 }
          }
          stats[nationality].passengers += count
        })

        // Count cabin for primary nationality only
        const primaryNat = cabin.primaryNationality
        if (!stats[primaryNat]) {
          stats[primaryNat] = { cabins: 0, passengers: 0 }
        }
        stats[primaryNat].cabins++
      }
    })

    return stats
  }, [allCabins])

  const getCabinColor = (cabin: CabinInfo) => {
    return NATIONALITY_COLORS[cabin.primaryNationality] || NATIONALITY_COLORS["Other"]
  }

  const getCabinTextColor = (cabin: CabinInfo) => {
    return NATIONALITY_TEXT_COLORS[cabin.primaryNationality] || NATIONALITY_TEXT_COLORS["Other"]
  }

  const getCabinStyle = (cabin: CabinInfo) => {
    if (cabin.isEmpty) {
      return {
        backgroundColor: NATIONALITY_COLORS["Empty"],
        color: NATIONALITY_TEXT_COLORS["Empty"],
        border: "2px dashed #DEE2E6",
      }
    }

    return {
      backgroundColor: getCabinColor(cabin),
      color: getCabinTextColor(cabin),
      border: "2px solid #333",
    }
  }

  const CabinCard = ({ cabin }: { cabin: CabinInfo }) => (
    <div
      className="relative group cursor-pointer transition-all duration-200 hover:scale-105 cabin-card"
      style={getCabinStyle(cabin)}
    >
      <div className="p-1 rounded-lg text-center min-h-[40px] flex flex-col justify-center min-w-[40px]">
        <div className="text-[9px] font-bold leading-tight">{cabin.cabin_nr}</div>
        <div className="text-sm font-bold leading-tight">{cabin.isEmpty ? "" : cabin.guestCount}</div>
      </div>

      {/* Tooltip on hover - only for occupied cabins */}
      {!cabin.isEmpty && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
          <div className="font-semibold">Cabin {cabin.cabin_nr}</div>
          <div>
            {cabin.guestCount} guest{cabin.guestCount !== 1 ? "s" : ""}
          </div>
          {cabin.guests.map((guest) => (
            <div key={guest.id} className="text-xs opacity-90">
              {guest.guest_name}
            </div>
          ))}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
        </div>
      )}
    </div>
  )

  const renderDeckLayout = (deck: number) => {
    const layout = deck === 1 ? SHIP_LAYOUT.deck1 : SHIP_LAYOUT.deck2
    const cabins = deck === 1 ? deck1Cabins : deck2Cabins

    const getCabinByNumber = (cabinNr: string) => {
      return cabins.find((cabin) => cabin.cabin_nr === cabinNr)
    }

    if (deck === 1) {
      // Special handling for Deck 1 irregular layout
      return (
        <div className="space-y-2 cabin-layout">
          {/* Row 1 - 12 positions with proper spacing */}
          <div className="grid gap-1 justify-items-center" style={{ gridTemplateColumns: "repeat(12, 1fr)" }}>
            {layout.row1.map((cabinNr, index) => (
              <div key={index} className="flex justify-center">
                {cabinNr ? (
                  <CabinCard cabin={getCabinByNumber(cabinNr)!} />
                ) : (
                  <div className="w-10 h-10" /> // Empty space for gaps
                )}
              </div>
            ))}
          </div>

          {/* Row 2 - 14 positions with proper spacing */}
          <div className="grid gap-1 justify-items-center" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
            {layout.row2.map((cabinNr, index) => (
              <div key={index} className="flex justify-center">
                <CabinCard cabin={getCabinByNumber(cabinNr)!} />
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Deck 2 layout (unchanged)
    return (
      <div className="space-y-2 cabin-layout">
        {/* Row 1 */}
        <div className="grid grid-cols-12 gap-1 justify-items-center">
          {layout.row1.map((cabinNr, index) => (
            <div key={index} className="flex justify-center">
              <CabinCard cabin={getCabinByNumber(cabinNr)!} />
            </div>
          ))}
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-12 gap-1 justify-items-center">
          {layout.row2.map((cabinNr, index) => (
            <div key={index} className="flex justify-center">
              <CabinCard cabin={getCabinByNumber(cabinNr)!} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Print function
  const handlePrint = () => {
    const printWindow = window.open("", "_blank")

    // Get current date and time
    const now = new Date()
    const dateTime = now.toLocaleString()

    // Create nationality legend HTML
    const nationalityLegendHTML = Object.entries(nationalityStats)
      .sort(([, a], [, b]) => b.passengers - a.passengers)
      .map(
        ([nationality, stats]) => `
        <div class="legend-item" style="background-color: ${NATIONALITY_COLORS[nationality] || NATIONALITY_COLORS["Other"]}; color: ${NATIONALITY_TEXT_COLORS[nationality] || NATIONALITY_TEXT_COLORS["Other"]};">
          <strong>${nationality}</strong><br>
          ${stats.cabins} Cabin${stats.cabins !== 1 ? "s" : ""}<br>
          ${stats.passengers} pax
        </div>
      `,
      )
      .join("")

    // Create deck layouts HTML with separate handling for Deck 1
    const deck2HTML =
      SHIP_LAYOUT.deck2.row1
        .map((cabinNr) => {
          if (!cabinNr) return '<div class="cabin-empty"></div>'
          const cabin = deck2Cabins.find((c) => c.cabin_nr === cabinNr)
          if (!cabin) return '<div class="cabin-empty"></div>'

          return `
      <div class="cabin-card print-cabin" style="background-color: ${getCabinColor(cabin)}; color: ${getCabinTextColor(cabin)}; ${cabin.isEmpty ? "border: 2px dashed #DEE2E6;" : "border: 2px solid #333;"}">
        <div class="cabin-number">${cabin.cabin_nr}</div>
        <div class="guest-count">${cabin.isEmpty ? "" : cabin.guestCount}</div>
      </div>
    `
        })
        .join("") +
      SHIP_LAYOUT.deck2.row2
        .map((cabinNr) => {
          const cabin = deck2Cabins.find((c) => c.cabin_nr === cabinNr)
          if (!cabin) return '<div class="cabin-empty"></div>'

          return `
      <div class="cabin-card print-cabin" style="background-color: ${getCabinColor(cabin)}; color: ${getCabinTextColor(cabin)}; ${cabin.isEmpty ? "border: 2px dashed #DEE2E6;" : "border: 2px solid #333;"}">
        <div class="cabin-number">${cabin.cabin_nr}</div>
        <div class="guest-count">${cabin.isEmpty ? "" : cabin.guestCount}</div>
      </div>
    `
        })
        .join("")

    // Deck 1 Row 1 HTML
    const deck1Row1HTML = SHIP_LAYOUT.deck1.row1
      .map((cabinNr) => {
        if (!cabinNr) return '<div class="cabin-empty"></div>'
        const cabin = deck1Cabins.find((c) => c.cabin_nr === cabinNr)
        if (!cabin) return '<div class="cabin-empty"></div>'

        return `
        <div class="cabin-card print-cabin" style="background-color: ${getCabinColor(cabin)}; color: ${getCabinTextColor(cabin)}; ${cabin.isEmpty ? "border: 2px dashed #DEE2E6;" : "border: 2px solid #333;"}">
          <div class="cabin-number">${cabin.cabin_nr}</div>
          <div class="guest-count">${cabin.isEmpty ? "" : cabin.guestCount}</div>
        </div>
      `
      })
      .join("")

    // Deck 1 Row 2 HTML
    const deck1Row2HTML = SHIP_LAYOUT.deck1.row2
      .map((cabinNr) => {
        const cabin = deck1Cabins.find((c) => c.cabin_nr === cabinNr)
        if (!cabin) return '<div class="cabin-empty"></div>'

        return `
        <div class="cabin-card print-cabin" style="background-color: ${getCabinColor(cabin)}; color: ${getCabinTextColor(cabin)}; ${cabin.isEmpty ? "border: 2px dashed #DEE2E6;" : "border: 2px solid #333;"}">
          <div class="cabin-number">${cabin.cabin_nr}</div>
          <div class="guest-count">${cabin.isEmpty ? "" : cabin.guestCount}</div>
        </div>
      `
      })
      .join("")

    const printContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Ship Cabin Display - DeWillemstad</title>
    <style>
      @media print {
        body { margin: 0; padding: 15px; font-family: Arial, sans-serif; }
        .no-print { display: none !important; }
      }
      @media screen {
        body { padding: 15px; font-family: Arial, sans-serif; }
      }
      
      .print-header { 
        text-align: center; 
        margin-bottom: 15px; 
        border-bottom: 2px solid #000; 
        padding-bottom: 8px; 
      }
      
      .nationality-stats { 
        display: flex; 
        justify-content: center; 
        gap: 15px; 
        margin: 15px 0; 
        flex-wrap: wrap;
      }
      
      .legend-item { 
        padding: 8px; 
        border-radius: 6px; 
        text-align: center; 
        min-width: 80px;
        border: 2px solid #333;
        font-size: 12px;
      }
      
      .deck-section { 
        margin: 20px 0; 
        page-break-inside: avoid;
      }
      
      .deck-title { 
        font-size: 16px; 
        font-weight: bold; 
        margin-bottom: 10px; 
        text-align: center;
        border-bottom: 1px solid #ccc;
        padding-bottom: 4px;
      }
      
      .cabin-grid { 
        display: grid; 
        gap: 2px; 
        justify-items: center;
        margin-bottom: 8px;
      }
      
      .cabin-grid-12 { 
        grid-template-columns: repeat(12, 1fr); 
      }
      
      .cabin-grid-14 { 
        grid-template-columns: repeat(14, 1fr); 
      }
      
      .cabin-card { 
        width: 35px; 
        height: 35px; 
        display: flex; 
        flex-direction: column; 
        justify-content: center; 
        align-items: center; 
        border-radius: 3px;
        font-weight: bold;
      }
      
      .cabin-number { 
        font-size: 8px; 
        line-height: 1;
      }
      
      .guest-count { 
        font-size: 11px; 
        line-height: 1;
      }
      
      .cabin-empty { 
        width: 35px; 
        height: 35px; 
      }
    </style>
  </head>
  <body>
    <div class="print-header">
      <h1>DeWillemstad - Ship Cabin Display</h1>
      <p>Generated on: ${dateTime}</p>
    </div>
    
    <div class="nationality-stats">
      ${nationalityLegendHTML}
    </div>
    
    <div class="deck-section">
      <div class="deck-title">Deck 2 - ${deck2Cabins.length} Cabins</div>
      <div class="cabin-grid cabin-grid-12">
        ${deck2HTML}
      </div>
    </div>
    
    <div class="deck-section">
      <div class="deck-title">Deck 1 - ${deck1Cabins.length} Cabins</div>
      <div class="cabin-grid cabin-grid-12">
        ${deck1Row1HTML}
      </div>
      <div class="cabin-grid cabin-grid-14">
        ${deck1Row2HTML}
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Ship Cabin Display
          </DialogTitle>
          <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Floor Plan
          </Button>
        </DialogHeader>

        <div className="flex flex-col h-full overflow-hidden">
          {/* Nationality Statistics */}
          <Card className="mb-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Nationality Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(nationalityStats)
                  .sort(([, a], [, b]) => b.passengers - a.passengers)
                  .map(([nationality, stats]) => (
                    <div
                      key={nationality}
                      className="flex items-center gap-2 p-2 rounded-lg border"
                      style={{
                        backgroundColor: NATIONALITY_COLORS[nationality] || NATIONALITY_COLORS["Other"],
                        color: NATIONALITY_TEXT_COLORS[nationality] || NATIONALITY_TEXT_COLORS["Other"],
                      }}
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-xs">{nationality}</div>
                        <div className="text-xs opacity-90">
                          {stats.cabins} Cabin{stats.cabins !== 1 ? "s" : ""}
                        </div>
                        <div className="text-xs opacity-90">{stats.passengers} pax</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Cabin Layout */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="deck1" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="deck1">Deck 1 ({deck1Cabins.length} cabins)</TabsTrigger>
                <TabsTrigger value="deck2">Deck 2 ({deck2Cabins.length} cabins)</TabsTrigger>
                <TabsTrigger value="all">All Decks</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto">
                <TabsContent value="deck1" className="mt-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Deck 1 - {deck1Cabins.length} Cabins</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">{renderDeckLayout(1)}</CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="deck2" className="mt-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Deck 2 - {deck2Cabins.length} Cabins</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">{renderDeckLayout(2)}</CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="all" className="mt-3 space-y-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Deck 2 - {deck2Cabins.length} Cabins</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">{renderDeckLayout(2)}</CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Deck 1 - {deck1Cabins.length} Cabins</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">{renderDeckLayout(1)}</CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
