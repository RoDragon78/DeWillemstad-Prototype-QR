"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { jsPDF } from "jspdf"
import { Printer } from "lucide-react"

interface Guest {
  index: number
  guest_name: string
  nationality: string
}

interface MealSelection {
  id: string
  day: number
  meal: string
  guest_index: number
  cabin_nr: string
  cruise_id: string
  submitted_at: string
}

interface MenuItem {
  id: string
  day: number
  meal_type: string
  name_en: string
  name_de: string
  description_en: string
  description_de: string
}

interface ConfirmationDetailsProps {
  guests: Guest[]
  selections: MealSelection[]
  menuItems: MenuItem[]
  cabinNumber: string
}

export default function ConfirmationDetails({ guests, selections, menuItems, cabinNumber }: ConfirmationDetailsProps) {
  const router = useRouter()
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Create a map of menu items for easy lookup
  const menuItemMap = menuItems.reduce(
    (acc, item) => {
      acc[item.name_en] = item
      return acc
    },
    {} as Record<string, MenuItem>,
  )

  // Group selections by guest and day
  const groupedSelections: Record<number, Record<number, MealSelection>> = {}

  guests.forEach((guest) => {
    groupedSelections[guest.index] = {}
    for (let day = 2; day <= 7; day++) {
      groupedSelections[guest.index][day] = {} as MealSelection
    }
  })

  selections.forEach((selection) => {
    if (groupedSelections[selection.guest_index]) {
      groupedSelections[selection.guest_index][selection.day] = selection
    }
  })

  const generatePdf = () => {
    setIsGeneratingPdf(true)

    try {
      const doc = new jsPDF()

      // Add title
      doc.setFontSize(20)
      doc.text(`Dinner Selections - Cabin ${cabinNumber}`, 20, 20)

      let yPos = 40

      // For each guest
      guests.forEach((guest, guestIndex) => {
        if (guestIndex > 0) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(16)
        doc.text(`${guest.guest_name} (${guest.nationality})`, 20, yPos)
        yPos += 10

        // For each day
        for (let day = 2; day <= 7; day++) {
          doc.setFontSize(14)
          doc.text(`Day ${day}`, 20, yPos)
          yPos += 8

          const selection = groupedSelections[guest.index][day]

          if (selection && selection.meal) {
            const menuItem = menuItemMap[selection.meal]

            doc.setFontSize(12)
            if (menuItem) {
              doc.text(
                `${menuItem.meal_type.charAt(0).toUpperCase() + menuItem.meal_type.slice(1)}: ${menuItem.name_en}`,
                30,
                yPos,
              )
              yPos += 6
              doc.setFontSize(10)
              doc.text(`${menuItem.description_en}`, 35, yPos)
              yPos += 10
            } else {
              doc.text(`Selected: ${selection.meal}`, 30, yPos)
              yPos += 6
            }
          } else {
            doc.setFontSize(12)
            doc.text("No selection made", 30, yPos)
            yPos += 6
          }

          // Add a new page if we're running out of space
          if (yPos > 270 && day < 7) {
            doc.addPage()
            yPos = 20
          }
        }
      })

      // Save the PDF
      doc.save(`Dinner_Selections_Cabin_${cabinNumber}.pdf`)
    } catch (err) {
      console.error("Error generating PDF:", err)
      alert("There was an error generating your PDF. Please try again.")
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue={guests[0]?.index.toString()}>
        <TabsList className="mb-4">
          {guests.map((guest) => (
            <TabsTrigger key={guest.index} value={guest.index.toString()}>
              {guest.guest_name}
            </TabsTrigger>
          ))}
        </TabsList>

        {guests.map((guest) => (
          <TabsContent key={guest.index} value={guest.index.toString()} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {guest.guest_name} <span className="text-muted-foreground text-sm">({guest.nationality})</span>
                </CardTitle>
                <CardDescription>Dinner selections for days 2-7</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {[2, 3, 4, 5, 6, 7].map((day) => {
                    const selection = groupedSelections[guest.index][day]
                    const menuItem = selection?.meal ? menuItemMap[selection.meal] : null

                    return (
                      <div key={day} className="space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2">Day {day}</h3>

                        <div className="grid gap-4">
                          {selection?.meal ? (
                            <div>
                              <div className="font-medium">
                                {menuItem ? (
                                  <>
                                    {menuItem.name_en}
                                    <span className="text-sm text-muted-foreground ml-2">({menuItem.meal_type})</span>
                                  </>
                                ) : (
                                  selection.meal
                                )}
                              </div>
                              {menuItem && (
                                <>
                                  <div className="text-sm text-muted-foreground">{menuItem.description_en}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {menuItem.name_de} - {menuItem.description_de}
                                  </div>
                                </>
                              )}
                              <div className="text-xs text-muted-foreground mt-2">
                                Selected on: {new Date(selection.submitted_at).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">No selection made for this day</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push("/")}>
          Start Over
        </Button>

        <Button onClick={generatePdf} disabled={isGeneratingPdf}>
          <Printer className="mr-2 h-4 w-4" />
          {isGeneratingPdf ? "Generating PDF..." : "Download PDF"}
        </Button>
      </div>
    </div>
  )
}
