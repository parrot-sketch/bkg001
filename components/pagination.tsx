"use client";

import React, { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "./ui/button";

interface PaginationProps {
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

export const Pagination = ({
  totalPages,
  currentPage,
  totalRecords,
  limit,
}: PaginationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);

      return params.toString();
    },
    [searchParams]
  );

  const handlePrevious = () => {
    if (currentPage > 1) {
      router.push(
        pathname + "?" + createQueryString("p", (currentPage - 1).toString())
      );
      // router.push(`?p=${currentPage - 1}`);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      // router.push(`?p=${currentPage + 1}`);
      router.push(
        pathname + "?" + createQueryString("p", (currentPage + 1).toString())
      );
    }
  };

  if (totalRecords === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4">
      <Button
        size={"sm"}
        variant={"outline"}
        disabled={currentPage === 1}
        onClick={handlePrevious}
      >
        Previous
      </Button>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium">
          Showing <span className="text-foreground font-semibold">{currentPage * limit - (limit - 1)}</span> to{" "}
          <span className="text-foreground font-semibold">
            {currentPage * limit <= totalRecords ? currentPage * limit : totalRecords}
          </span>{" "}
          of <span className="text-foreground font-semibold">{totalRecords.toLocaleString()}</span>
        </span>
      </div>
      <Button
        size={"sm"}
        variant={"outline"}
        disabled={currentPage === totalPages}
        onClick={handleNext}
      >
        Next
      </Button>
    </div>
  );
};
