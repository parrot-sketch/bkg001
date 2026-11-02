'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface PatientHit {
  id: string;
  firstName: string;
  lastName: string;
  fileNumber?: string | null;
  phone?: string | null;
}

interface CaseHit {
  id: string;
  procedure_name: string;
  patient: {
    first_name: string;
    last_name: string;
    file_number: string | null;
  };
}

type Result =
  | { kind: 'patient'; id: string; title: string; detail: string; href: string }
  | { kind: 'case'; id: string; title: string; detail: string; href: string };

function searchScope(pathname: string): 'patients' | 'cases' | 'both' {
  if (pathname.startsWith('/theater-tech')) return 'cases';
  if (pathname.startsWith('/nurse')) return 'both';
  return 'patients';
}

function patientHref(pathname: string, id: string): string {
  if (pathname.startsWith('/doctor')) return `/doctor/patients/${id}`;
  if (pathname.startsWith('/nurse')) return `/nurse/patients/${id}`;
  if (pathname.startsWith('/admin')) return `/admin/patients/${id}`;
  return `/frontdesk/patient/${id}`;
}

function caseHref(pathname: string, id: string): string {
  if (pathname.startsWith('/nurse')) return `/nurse/surgical-cases/${id}`;
  if (pathname.startsWith('/theater-tech')) return `/theater-tech/surgical-cases/${id}`;
  if (pathname.startsWith('/doctor')) return `/doctor/surgical-cases/${id}`;
  return `/frontdesk/surgical-cases/${id}`;
}

export function HeaderSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const scope = searchScope(pathname);
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const next: Result[] = [];
        if (scope !== 'cases') {
          const response = await apiClient.get<PatientHit[]>(`/patients/search?q=${encodeURIComponent(trimmed)}`);
          if (response.success && response.data) {
            for (const patient of response.data.slice(0, 8)) {
              const name = `${patient.firstName} ${patient.lastName}`.trim();
              const detail = [patient.fileNumber ? `#${patient.fileNumber}` : '', patient.phone || ''].filter(Boolean).join(' · ');
              next.push({ kind: 'patient', id: patient.id, title: name, detail: detail || 'Patient', href: patientHref(pathname, patient.id) });
            }
          }
        }
        if (scope !== 'patients') {
          const response = await apiClient.get<{ data: CaseHit[] }>(`/frontdesk/surgical-cases?search=${encodeURIComponent(trimmed)}&limit=8`);
          const cases = response.success ? response.data?.data ?? [] : [];
          for (const item of cases) {
            const name = `${item.patient.first_name} ${item.patient.last_name}`.trim();
            next.push({
              kind: 'case',
              id: item.id,
              title: item.procedure_name || 'Surgical case',
              detail: [name, item.patient.file_number ? `#${item.patient.file_number}` : ''].filter(Boolean).join(' · '),
              href: caseHref(pathname, item.id),
            });
          }
        }
        if (cancelled) return;
        setResults(next);
        setActive(0);
        setOpen(true);
      } catch {
        if (!cancelled) {
          setResults([]);
          setOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [pathname, query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const choose = (result: Result) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    router.push(result.href);
  };

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#e7d6bf]/70" aria-hidden />
      {loading && <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#e7d6bf]" aria-hidden />}
      <input
        type="search"
        value={query}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-expanded={open}
        aria-controls="header-search-results"
        role="combobox"
        className={cn(
          'h-8 w-64 rounded-lg py-1.5 pl-8 text-[13px] outline-none transition-all',
          loading ? 'pr-8' : 'pr-3',
          'border border-[#e7d6bf]/30 bg-white/10 text-white placeholder:text-[#e7d6bf]/60',
          'focus:border-[#e7d6bf]/50 focus:bg-white/15 focus:ring-2 focus:ring-[#e7d6bf]/40',
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (query.trim().length >= 2) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!open || results.length === 0) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((current) => (current + 1) % results.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((current) => (current - 1 + results.length) % results.length);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            choose(results[active] ?? results[0]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && query.trim().length >= 2 && (
        <ul id="header-search-results" role="listbox" className="absolute right-0 z-50 mt-1 max-h-80 w-80 overflow-auto border border-[#e7d6bf] bg-white shadow-lg">
          {results.length === 0 && !loading && (
            <li className="px-3 py-3 text-sm text-[#2c2e4b]/60">No matches for “{query.trim()}”.</li>
          )}
          {results.map((result, index) => (
            <li key={`${result.kind}-${result.id}`}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={cn(
                  'flex w-full flex-col px-3 py-2 text-left',
                  index === active ? 'bg-[#e7d6bf]/40' : 'hover:bg-[#e7d6bf]/30',
                )}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(result)}
              >
                <span className="truncate text-sm font-medium text-[#2c2e4b]">{result.title}</span>
                <span className="truncate text-xs text-[#2c2e4b]/60">
                  {result.kind === 'case' ? 'Case · ' : ''}
                  {result.detail}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
