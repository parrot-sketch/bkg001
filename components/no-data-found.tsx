import { FileText } from "lucide-react";

export const NoDataFound = ({ note }: { note?: string }) => {
  return (
    <div className="w-full flex flex-col items-center justify-center py-12 px-4">
      <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
        <FileText className="h-8 w-8 text-gray-400" />
      </div>
      <p className="text-base text-gray-600 font-medium text-center max-w-sm">
        {note || "No records available at this time"}
      </p>
      <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">
        {note ? "We'll notify you when new items are available." : "Check back later or contact support if you need assistance."}
      </p>
    </div>
  );
};
