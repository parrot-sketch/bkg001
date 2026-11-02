import type { Service } from '@/components/theater-tech/charge-sheet.types';

interface LinkedProcedure {
  procedure?: {
    procedure_service_links?: Array<{
      service?: {
        id: number;
        service_name: string;
        price: number;
        category: string | null;
        is_active?: boolean;
      } | null;
    }>;
  } | null;
}

/** Services already linked to the procedures on this case. Used to prefill an empty charge sheet. */
export function suggestedServicesFromCase(caseProcedures: LinkedProcedure[] | null | undefined): Service[] {
  const seen = new Set<number>();
  const services: Service[] = [];
  for (const row of caseProcedures ?? []) {
    for (const link of row.procedure?.procedure_service_links ?? []) {
      const service = link.service;
      if (!service || service.is_active === false || seen.has(service.id)) continue;
      seen.add(service.id);
      services.push({
        id: service.id,
        service_name: service.service_name,
        price: service.price,
        category: service.category,
      });
    }
  }
  return services;
}
