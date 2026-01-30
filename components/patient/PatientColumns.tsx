"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Eye, Calendar, Clock, Phone, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { calculateAge } from "@/lib/utils"
import Link from "next/link"
import { format } from "date-fns"

// This type is tailored to matches the data structure from getAllPatients in the page
export type PatientColumn = {
    id: string
    file_number: string
    first_name: string
    last_name: string
    email: string
    phone: string
    date_of_birth: Date
    gender: string
    address: string
    img: string | null
    colorCode: string | null
    created_at: Date
    updated_at: Date
    last_visit_date?: Date | null
}

export const columns: ColumnDef<PatientColumn>[] = [
    {
        accessorKey: "patient_info",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Patient
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const patient = row.original
            const name = `${patient.first_name} ${patient.last_name}`
            const initials = `${patient.first_name[0] || ''}${patient.last_name[0] || ''}`

            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={patient.img || undefined} alt={name} />
                        <AvatarFallback className="text-xs font-medium text-white" style={{ backgroundColor: patient.colorCode || '#64748b' }}>
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-medium truncate max-w-[150px]">{name}</span>
                        <span className="text-xs text-muted-foreground">{calculateAge(patient.date_of_birth)} old • {patient.gender}</span>
                    </div>
                </div>
            )
        },
    },
    {
        accessorKey: "file_number",
        header: "ID",
        cell: ({ row }) => <div className="font-mono text-xs font-medium">{row.getValue("file_number")}</div>,
    },
    {
        accessorKey: "contact",
        header: "Contact",
        cell: ({ row }) => {
            const phone = row.original.phone
            const email = row.original.email
            return (
                <div className="flex flex-col gap-1 text-xs">
                    {phone && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3" /> {phone}
                        </div>
                    )}
                    {email && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3" /> <span className="truncate max-w-[150px]">{email}</span>
                        </div>
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: "last_visit_date",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Last Visit
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const date = row.original.last_visit_date;
            if (!date) return <span className="text-xs text-muted-foreground italic">No visits</span>;
            return (
                <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{format(new Date(date), "MMM d, yyyy")}</span>
                </div>
            )
        }
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const patient = row.original

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/frontdesk/patient/${patient.id}`} className="cursor-pointer flex items-center">
                                <Eye className="mr-2 h-4 w-4" /> View Profile
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/frontdesk/appointments?patientId=${patient.id}`} className="cursor-pointer flex items-center">
                                <Calendar className="mr-2 h-4 w-4" /> Schedule Appointment
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(patient.id)}>
                            Copy ID
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
