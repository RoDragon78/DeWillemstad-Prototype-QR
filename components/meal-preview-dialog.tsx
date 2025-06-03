"use client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { FileDown, Save, X } from "lucide-react"

interface MealPreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  cabinNumber: string
  guestNames: string[]
  mealSelections: any
  menuItems: any[]
  language: "en" | "nl" | "de"
  onSavePdf: () => void
  onSaveSelections: () => void
  isSaving: boolean
  isPdfGenerating: boolean
}

export function MealPreviewDialog({
  isOpen,
  onClose,
  cabinNumber,
  guestNames,
  mealSelections,
  menuItems,
  language,
  onSavePdf,
  onSaveSelections,
  isSaving,
  isPdfGenerating,
}: MealPreviewDialogProps) {
  // Day names
  const DAY_NAMES = ["", "", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

  // Function to get meal name by ID
  const getMealName = (mealId: number) => {
    const meal = menuItems.find((m) => m.id === mealId)
    if (!meal) return "No selection"

    // Avoid using dynamic property access that might trigger __rest
    if (language === "en") return meal.name_en
    if (language === "nl") return meal.name_nl || meal.name_en
    if (language === "de") return meal.name_de || meal.name_en
    return meal.name_en
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Meal Selection Preview</DialogTitle>
          <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-blue-50 p-4 rounded-lg mb-6 text-center">
            <h2 className="text-lg font-semibold">
              Cabin: {cabinNumber} - {guestNames.length} guests
            </h2>
            <p className="text-sm text-gray-600">Guests: {guestNames.join(", ")}</p>
          </div>

          {[2, 3, 4, 5, 6, 7].map((day) => {
            // Check if any selections exist for this day
            const hasSelections = Object.values(mealSelections).some((guestSelections: any) => guestSelections[day])

            if (!hasSelections) return null

            return (
              <div key={day} className="mb-6 border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">
                  Day {day} - {DAY_NAMES[day]}
                </h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Guest</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Meal Selection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(mealSelections).map(([guestId, guestSelections]: [string, any], index) => {
                      const guestName = guestNames[index] || "Guest"
                      const mealId = guestSelections[day]
                      const mealName = getMealName(mealId)

                      return (
                        <tr key={`${day}-${guestId}`}>
                          <td className="py-3 px-3 text-sm">{guestName}</td>
                          <td className="py-3 px-3 text-sm">{mealName}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onSavePdf} disabled={isPdfGenerating}>
              <FileDown className="mr-2 h-4 w-4" />
              {isPdfGenerating ? "Generating PDF..." : "Save as PDF"}
            </Button>
            <Button onClick={onSaveSelections} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Selections"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
