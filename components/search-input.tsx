"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useState } from "react";

const SearchInput = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(searchParams?.get("q") || "");

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

    router.push(pathname + "?" + createQueryString("q", searchValue));
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="flex items-center border border-gray-200 bg-white px-4 py-3 rounded-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200 shadow-sm hover:shadow-md">
        <Search size={18} className="text-muted-foreground flex-shrink-0" />
        <input
          className="outline-none px-3 text-sm w-full text-foreground placeholder:text-muted-foreground"
          placeholder="Search by name, email, phone, or file number..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>
    </form>
  );
};

export default SearchInput;
