export interface StepProps {
  caseId: string;
  onComplete: () => void;
  onError: (error: string) => void;
}

export interface Surgeon {
  id: string;
  name: string;
}

export interface LinkedService {
  id: number;
  service_name: string;
  price: number;
  category: string;
  is_active: boolean;
  is_primary: boolean;
}

export interface Procedure {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  estimated_duration_minutes?: number | null;
  default_price?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  procedure_service_links: LinkedService[];
}
