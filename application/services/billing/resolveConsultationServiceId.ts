import db from '@/lib/db';

export async function resolveConsultationServiceId(): Promise<number> {
  const existing =
    (await db.service.findFirst({
      where: {
        is_active: true,
        OR: [
          { service_name: 'Consultation - Initial' },
          { service_name: 'Consultation' },
          { category: 'Consultation' },
        ],
      },
      orderBy: { id: 'asc' },
      select: { id: true },
    })) ?? null;

  if (existing?.id) return existing.id;

  const created = await db.service.create({
    data: {
      service_name: 'Consultation',
      price: 0,
      category: 'Consultation',
      is_active: true,
    },
    select: { id: true },
  });

  return created.id;
}

