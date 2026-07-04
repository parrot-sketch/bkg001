import { Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  hasSearch: boolean;
  onClear: () => void;
  onRegister: () => void;
}

/**
 * Displayed when the patient list returns zero results.
 * Shows context-aware messaging based on whether the empty state is
 * caused by an active search or a genuinely empty registry.
 */
export function EmptyState({ hasSearch, onClear, onRegister }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="h-14 w-14 rounded-xl border border-[#e7d6bf] bg-[#e7d6bf]/15 flex items-center justify-center mb-4">
        <Search className="h-6 w-6 text-[#caa26a]" />
      </div>
      <h3 className="text-sm font-semibold text-[#2c2e4b] mb-1">
        {hasSearch ? 'No patients found' : 'No patients registered yet'}
      </h3>
      <p className="text-xs text-[#2c2e4b]/50 text-center max-w-xs mb-5">
        {hasSearch
          ? 'Try adjusting your search query or clearing the filter.'
          : 'Start by registering your first patient to populate the registry.'}
      </p>
      {hasSearch ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="rounded-lg border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
        >
          Clear Search
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={onRegister}
          className="bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] rounded-lg font-medium shadow-sm"
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Register First Patient
        </Button>
      )}
    </div>
  );
}
