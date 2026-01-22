"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useState, useEffect } from "react";

const SearchInput = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(searchParams?.get("q") || "");
  const [debouncedValue, setDebouncedValue] = useState(searchValue);

  // REFACTORED: Debounce search input to prevent excessive server requests
  // 300ms delay is optimal for search UX - not too slow, not too fast
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(searchValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Auto-search when debounced value changes (but not on initial mount)
  // Only trigger if user has actually typed something different
  useEffect(() => {
    const currentQuery = searchParams?.get("q") || "";
    // Only update if debounced value is different from current query
    // This prevents unnecessary navigation on initial load
    if (debouncedValue !== currentQuery && debouncedValue !== searchValue) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedValue.trim()) {
        params.set("q", debouncedValue);
        params.set("p", "1"); // Reset to first page on new search
      } else {
        params.delete("q");
        params.set("p", "1");
      }
      router.push(pathname + "?" + params.toString());
    }
  }, [debouncedValue, pathname, router, searchParams, searchValue]);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);

      return params.toString();
    },
    [searchParams]
  );

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    // Immediate search on form submit (Enter key or button click)
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue.trim()) {
      params.set("q", searchValue);
      params.set("p", "1");
    } else {
      params.delete("q");
      params.set("p", "1");
    }
    router.push(pathname + "?" + params.toString());
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="flex items-center border border-gray-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200 shadow-sm hover:shadow-md">
        <Search size={18} className="text-muted-foreground flex-shrink-0" />
        <input
          className="outline-none px-2 sm:px-3 text-sm w-full text-foreground placeholder:text-muted-foreground"
          placeholder="Search by name, email, phone, or file number..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          aria-label="Search patients"
        />
      </div>
    </form>
  );
};

export default SearchInput;
