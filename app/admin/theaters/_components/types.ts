export interface TheaterBookingCase {
  id: string;
  procedure_name: string | null;
  status: string;
  urgency: string;
  patient: { first_name: string; last_name: string; file_number: string };
  primary_surgeon: { name: string };
}

export interface TheaterBooking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  surgical_case: TheaterBookingCase;
}

export interface Theater {
  id: string;
  name: string;
  type: string;
  status: string;
  color_code: string | null;
  notes: string | null;
  is_active: boolean;
  operational_hours: string | null;
  capabilities: string | null;
  hourly_rate: number;
  bookings: TheaterBooking[];
  _count: { bookings: number; surgical_records: number };
  created_at: string;
  updated_at: string;
}

export type TheaterType = 'MAJOR' | 'MINOR' | 'PROCEDURE_ROOM';

export interface TheaterFormData {
  name: string;
  type: TheaterType;
  color_code: string;
  notes: string;
  operational_hours: string;
  capabilities: string;
  rate_per_minute: number;
}

export const EMPTY_FORM: TheaterFormData = {
  name: '',
  type: 'MAJOR',
  color_code: '#475569', // Muted Slate-600
  notes: '',
  operational_hours: '',
  capabilities: '',
  rate_per_minute: 0,
};

export interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}
