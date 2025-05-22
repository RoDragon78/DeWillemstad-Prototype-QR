import type { Guest } from "@/types/guest"
import type { MenuItem } from "@/types/menu-item"

// Day names
const DAY_NAMES = ["", "", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

interface PdfGenerationOptions {
  cabinNumber: string
  guests: Guest[]
  mealSelections: Record<string, Record<number, number>>
  menuItems: MenuItem[]
  language: "en" | "nl" | "de"
}

export async function generateAndDownloadPdf(options: PdfGenerationOptions): Promise<boolean> {
  const { cabinNumber, guests, mealSelections, menuItems, language } = options

  try {
    // Dynamically import jsPDF to avoid SSR issues
    const { jsPDF } = await import("jspdf")

    // Create a new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Set font sizes - smaller to fit more content
    const titleFontSize = 14
    const subtitleFontSize = 10
    const normalFontSize = 8
    const smallFontSize = 7

    // Add title
    doc.setFontSize(titleFontSize)
    doc.setFont("helvetica", "bold")
    doc.text("DeWillemstad Meal Selections", 105, 15, { align: "center" })

    // Add subtitle
    doc.setFontSize(subtitleFontSize)
    doc.setFont("helvetica", "normal")
    doc.text("River Cruise Dining", 105, 20, { align: "center" })

    // Add cabin info
    doc.setFillColor(240, 247, 255)
    doc.rect(20, 25, 170, 12, "F")
    doc.setFontSize(subtitleFontSize)
    doc.setFont("helvetica", "bold")
    doc.text(`Cabin: ${cabinNumber}`, 105, 31, { align: "center" })
    doc.setFontSize(normalFontSize)
    doc.setFont("helvetica", "normal")
    doc.text(`Guests: ${guests.map((g) => g.guest_name).join(", ")}`, 105, 35, { align: "center" })

    // Function to get meal name by ID
    const getMealName = (mealId: number) => {
      const meal = menuItems.find((m) => m.id === mealId)
      if (!meal) return "No selection"
      return meal[`name_${language}` as keyof typeof meal] || meal.name_en
    }

    // Add meal selections for each day - compact layout
    let yPosition = 42
    const columnWidth = 85 // Two columns
    let isRightColumn = false

    for (let day = 2; day <= 7; day++) {
      // Check if any guest has selections for this day
      const hasSelections = guests.some((guest) => mealSelections[guest.id]?.[day] > 0)

      if (hasSelections) {
        // Calculate x position based on column
        const xPosition = isRightColumn ? 110 : 20

        // Add day header
        doc.setFillColor(245, 245, 245)
        doc.rect(xPosition, yPosition, columnWidth, 6, "F")
        doc.setFontSize(subtitleFontSize)
        doc.setFont("helvetica", "bold")
        doc.text(`Day ${day} - ${DAY_NAMES[day]}`, xPosition + 3, yPosition + 4)
        yPosition += 8

        // Add table header
        doc.setFontSize(normalFontSize)
        doc.setFont("helvetica", "bold")
        doc.text("Guest", xPosition + 3, yPosition)
        doc.text("Meal Selection", xPosition + 30, yPosition)
        yPosition += 3

        // Add horizontal line
        doc.setDrawColor(200, 200, 200)
        doc.line(xPosition + 3, yPosition, xPosition + columnWidth - 3, yPosition)
        yPosition += 4

        // Add guest selections
        doc.setFont("helvetica", "normal")
        guests.forEach((guest) => {
          const mealId = mealSelections[guest.id]?.[day]
          const mealName = getMealName(mealId)

          // Truncate guest name if too long
          const truncatedGuestName =
            guest.guest_name.length > 12 ? guest.guest_name.substring(0, 12) + "..." : guest.guest_name

          doc.text(truncatedGuestName, xPosition + 3, yPosition)

          // Handle long meal names with wrapping
          const mealNameLines = doc.splitTextToSize(mealName, 50)
          doc.text(mealNameLines, xPosition + 30, yPosition)

          // Adjust position based on number of lines
          yPosition += Math.max(4, mealNameLines.length * 3.5)
        })

        // Add space after each day
        yPosition += 5

        // Toggle column or reset position for next row
        if (isRightColumn) {
          isRightColumn = false
          // Start a new row
          yPosition += 5
        } else {
          isRightColumn = true
          // Stay on same row, move to right column
          yPosition -= guests.length * 4 + 20 // Approximate reset to align with left column
        }
      }
    }

    // Add footer
    doc.setFontSize(smallFontSize)
    doc.setTextColor(100, 100, 100)
    doc.text("If you need to make changes to your selections, please contact the Hotel Manager.", 105, 285, {
      align: "center",
    })

    // Save the PDF
    doc.save(`DeWillemstad_Cabin${cabinNumber}_Meals.pdf`)

    return true
  } catch (error) {
    console.error("Error generating PDF:", error)
    return false
  }
}
