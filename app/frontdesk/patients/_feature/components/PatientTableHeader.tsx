/**
 * Renders the sticky `<thead>` row of the desktop patient table.
 * Column widths match the original page exactly.
 */
export function PatientTableHeader() {
  return (
    <thead className="sticky top-0 z-10">
      <tr className="border-b border-[#e7d6bf] bg-[#e7d6bf]/15">
        <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#2c2e4b]/50 uppercase tracking-wider w-[260px]">
          Patient
        </th>
        <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#2c2e4b]/50 uppercase tracking-wider w-[110px]">
          File No.
        </th>
        <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#2c2e4b]/50 uppercase tracking-wider w-[140px] hidden lg:table-cell">
          Phone
        </th>
        <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#2c2e4b]/50 uppercase tracking-wider w-[130px] hidden lg:table-cell">
          Last Visit
        </th>
        <th className="px-5 py-3 text-left text-[10px] font-semibold text-[#2c2e4b]/50 uppercase tracking-wider w-[120px]">
          Today
        </th>
        <th className="px-5 py-3 text-right text-[10px] font-semibold text-[#2c2e4b]/50 uppercase tracking-wider w-[70px]" />
      </tr>
    </thead>
  );
}
