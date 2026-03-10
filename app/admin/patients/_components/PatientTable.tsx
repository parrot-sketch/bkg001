'use client';

import { 
    Users, 
    Mail, 
    Phone, 
    Calendar, 
    FileText, 
    ChevronRight,
    Search,
    RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import Link from 'next/link';

interface PatientTableProps {
  patients: PatientResponseDto[];
  isLoading: boolean;
}

export function PatientTable({ patients, isLoading }: PatientTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-[2.5rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-slate-50 rounded-2xl" />
            ))}
        </div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center rounded-[3rem] bg-white border-2 border-dashed border-slate-100 shadow-sm">
        <div className="h-20 w-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
          <Users className="h-10 w-10 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Clinical Records Terminal</h3>
        <p className="text-slate-500 max-w-sm mt-2 font-medium">
          No patients found matching the current institutional criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="hover:bg-transparent border-slate-100">
            <TableHead className="w-[120px] h-14 pl-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">File Number</TableHead>
            <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinical Identity</TableHead>
            <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Demographics</TableHead>
            <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Details</TableHead>
            <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</TableHead>
            <TableHead className="h-14 pr-8 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id} className="group border-slate-50 hover:bg-slate-50/50 transition-colors">
              <TableCell className="pl-8 py-5">
                <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                    {patient.fileNumber || 'PENDING'}
                </span>
              </TableCell>
              <TableCell className="py-5">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all font-bold text-xs">
                        {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 leading-none">
                            {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">
                            Reg: {patient.createdAt ? format(new Date(patient.createdAt), 'dd MMM yyyy') : 'N/A'}
                        </p>
                    </div>
                </div>
              </TableCell>
              <TableCell className="py-5">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Calendar className="h-3 w-3 text-slate-300" />
                        {patient.age ? `${patient.age} Yrs` : 'N/A'}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase ml-4.5">{patient.gender || 'Not specified'}</span>
                </div>
              </TableCell>
              <TableCell className="py-5">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Mail className="h-3 w-3 text-slate-300" />
                        <span className="truncate max-w-[140px]">{patient.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Phone className="h-3 w-3 text-slate-300" />
                        {patient.phone || 'No phone'}
                    </div>
                </div>
              </TableCell>
              <TableCell className="py-5">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[9px] uppercase tracking-wider rounded-md hover:bg-emerald-50">
                    Active Record
                </Badge>
              </TableCell>
              <TableCell className="pr-8 py-5 text-right">
                <Link href={`/admin/patients/${patient.id}`}>
                    <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl p-0 hover:bg-slate-900 hover:text-white transition-all">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
