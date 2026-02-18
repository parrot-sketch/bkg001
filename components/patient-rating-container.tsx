import { getRatingById } from "@/utils/services/doctor";
import React from "react";
import { RatingList } from "./rating-list";
import { RatingChart } from "./charts/rating-chart";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { Role } from "@/domain/enums/Role";

export const PatientRatingContainer = async ({ id }: { id: string }) => {
  const user = await getCurrentUser();

  // RBAC: Frontdesk is not allowed to see ratings/reviews
  if (!user || user.role === Role.FRONTDESK) {
    return null;
  }

  const { ratings, totalRatings, averageRating } = await getRatingById(id);

  if (!ratings) return null;

  return (
    <div className="space-y-4">
      <RatingChart
        totalRatings={totalRatings!}
        averageRating={Number(averageRating!)}
      />
      <RatingList data={ratings} />
    </div>
  );
};
