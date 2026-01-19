import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server-auth";
import React from "react";
import { RatingList } from "./rating-list";

export const PatientRatingContainer = async ({ id }: { id?: string }) => {
  const user = await getCurrentUser();
  const userId = user?.userId;

  const data = await db.rating.findMany({
    take: 10,

    where: { patient_id: id ? id : userId! },
    include: { patient: { select: { last_name: true, first_name: true } } },
    orderBy: { created_at: "desc" },
  });

  if (!data) return null;

  return (
    <div>
      <RatingList data={data} />
    </div>
  );
};
