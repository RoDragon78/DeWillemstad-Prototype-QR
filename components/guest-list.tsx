"use client"

import { useState } from "react"
import { Edit, Trash, Utensils } from "lucide-react"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"
import type { Guest } from "@/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

interface GuestListProps {
  guests: Guest[]
  refetchGuests: () => void
}

const formSchema = z.object({
  guest_name: z.string().min(2, {
    message: "Guest name must be at least 2 characters.",
  }),
  cabin_number: z.string().min(1, {
    message: "Cabin number must be at least 1 character.",
  }),
  table_number: z.string().min(1, {
    message: "Table number must be at least 1 character.",
  }),
  group_number: z.string().min(1, {
    message: "Group number must be at least 1 character.",
  }),
  language: z.string().min(2, {
    message: "Language must be at least 2 characters.",
  }),
  dietary_restrictions: z.string().optional(),
  notes: z.string().optional(),
})

export function GuestList({ guests, refetchGuests }: GuestListProps) {
  const [open, setOpen] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [loadingStates, setLoadingStates] = useState({
    delete: {} as Record<string, boolean>,
    edit: {} as Record<string, boolean>,
    deleteMeals: {} as Record<string, boolean>,
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guest_name: "",
      cabin_number: "",
      table_number: "",
      group_number: "",
      language: "",
      dietary_restrictions: "",
      notes: "",
    },
  })

  const handleOpen = (guest: Guest) => {
    setSelectedGuest(guest)
    form.reset({
      guest_name: guest.guest_name,
      cabin_number: guest.cabin_number,
      table_number: guest.table_number,
      group_number: guest.group_number,
      language: guest.language,
      dietary_restrictions: guest.dietary_restrictions || "",
      notes: guest.notes || "",
    })
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setSelectedGuest(null)
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedGuest) return

    setLoadingStates((prev) => ({
      ...prev,
      edit: { ...prev.edit, [selectedGuest.id]: true },
    }))

    try {
      const { data, error } = await supabase
        .from("guests")
        .update({
          guest_name: values.guest_name,
          cabin_number: values.cabin_number,
          table_number: values.table_number,
          group_number: values.group_number,
          language: values.language,
          dietary_restrictions: values.dietary_restrictions,
          notes: values.notes,
        })
        .eq("id", selectedGuest.id)

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Guest updated successfully.",
        variant: "default",
      })
      refetchGuests()
    } catch (error: any) {
      console.error("Error updating guest:", error)
      toast({
        title: "Error",
        description: "Failed to update guest. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingStates((prev) => ({
        ...prev,
        edit: { ...prev.edit, [selectedGuest.id]: false },
      }))
      handleClose()
    }
  }

  const handleDeleteGuest = async (guestId: string, guestName: string) => {
    if (!confirm(`Are you sure you want to delete ${guestName}? This action cannot be undone.`)) {
      return
    }

    setLoadingStates((prev) => ({
      ...prev,
      delete: { ...prev.delete, [guestId]: true },
    }))

    try {
      const { error } = await supabase.from("guests").delete().eq("id", guestId)

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: `${guestName} has been deleted.`,
        variant: "default",
      })
      refetchGuests()
    } catch (error) {
      console.error("Error deleting guest:", error)
      toast({
        title: "Error",
        description: "Failed to delete guest. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingStates((prev) => ({
        ...prev,
        delete: { ...prev.delete, [guestId]: false },
      }))
    }
  }

  const handleDeleteMealChoices = async (guestId: string, guestName: string) => {
    if (!confirm(`Are you sure you want to delete all meal choices for ${guestName}? This action cannot be undone.`)) {
      return
    }

    setLoadingStates((prev) => ({
      ...prev,
      deleteMeals: { ...prev.deleteMeals, [guestId]: true },
    }))

    try {
      const { error } = await supabase.from("meal_selections").delete().eq("guest_id", guestId)

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: `Meal choices for ${guestName} have been deleted.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error deleting meal choices:", error)
      toast({
        title: "Error",
        description: "Failed to delete meal choices. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingStates((prev) => ({
        ...prev,
        deleteMeals: { ...prev.deleteMeals, [guestId]: false },
      }))
    }
  }

  return (
    <>
      <Table>
        <TableCaption>A list of guests.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Cabin</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Table</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Diet</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-[100px]">Meals</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No guests found.
              </TableCell>
            </TableRow>
          ) : (
            guests.map((guest) => (
              <TableRow key={guest.id}>
                <TableCell className="font-medium">{guest.cabin_number}</TableCell>
                <TableCell>{guest.guest_name}</TableCell>
                <TableCell>{guest.table_number}</TableCell>
                <TableCell>{guest.group_number}</TableCell>
                <TableCell>{guest.language}</TableCell>
                <TableCell>{guest.dietary_restrictions}</TableCell>
                <TableCell>{guest.notes}</TableCell>
                <TableCell className="text-center">
                  {guest.has_meal_selections ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteMealChoices(guest.id, guest.guest_name)}
                      disabled={loadingStates.deleteMeals[guest.id]}
                    >
                      {loadingStates.deleteMeals[guest.id] ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Utensils className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="sr-only">Delete meal choices</span>
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-500">No meals</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpen(guest)}
                      disabled={loadingStates.edit[guest.id]}
                    >
                      {loadingStates.edit[guest.id] ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Edit className="h-4 w-4" />
                      )}
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGuest(guest.id, guest.guest_name)}
                      disabled={loadingStates.delete[guest.id]}
                    >
                      {loadingStates.delete[guest.id] ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Trash className="h-4 w-4 text-red-500" />
                      )}
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Guest</DialogTitle>
            <DialogDescription>
              Make changes to the guest information here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="guest_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Guest Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cabin_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cabin Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Cabin Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="table_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Table Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="group_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Group Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <FormControl>
                      <Input placeholder="Language" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dietary_restrictions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dietary Restrictions</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Dietary Restrictions" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notes" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={loadingStates.edit[selectedGuest?.id || ""]}>
                  {loadingStates.edit[selectedGuest?.id || ""] ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
