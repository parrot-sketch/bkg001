'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

interface UserSelectProps {
  value: string;
  onChange: (value: string) => void;
  role?: string;
  placeholder?: string;
  excludeCurrentUser?: boolean;
  currentUserId?: string;
}

export function UserSelect({
  value,
  onChange,
  role,
  placeholder = 'Select a user...',
  excludeCurrentUser = false,
  currentUserId,
}: UserSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (role) params.append('role', role);
        if (search) params.append('search', search);

        const response = await fetch(`/api/users?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch users');
        }

        let filteredUsers = result.data || [];
        if (excludeCurrentUser && currentUserId) {
          filteredUsers = filteredUsers.filter((u: UserOption) => u.id !== currentUserId);
        }
        setUsers(filteredUsers);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError(err instanceof Error ? err.message : 'Failed to load users');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, role, search, excludeCurrentUser, currentUserId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedUser = users.find(u => u.id === value || u.name === value);

  const getRoleBadgeColor = (userRole: string) => {
    const colors: Record<string, string> = {
      NURSE: 'bg-blue-100 text-blue-700 border-blue-200',
      DOCTOR: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      FRONTDESK: 'bg-purple-100 text-purple-700 border-purple-200',
      ADMIN: 'bg-slate-100 text-slate-700 border-slate-200',
      THEATER_TECHNICIAN: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[userRole] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={cn(
          'w-full h-11 px-4 py-2 rounded-lg border bg-background text-left flex items-center justify-between transition-all duration-200',
          'hover:border-primary/50 hover:shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-red-300 bg-red-50' : isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-input'
        )}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading users...
          </span>
        ) : error ? (
          <span className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </span>
        ) : selectedUser ? (
          <div className="flex items-center gap-3">
            <span className="font-medium">{selectedUser.name}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full border', getRoleBadgeColor(selectedUser.role))}>
              {selectedUser.role}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 rounded-xl border bg-background shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full h-10 pl-10 pr-4 rounded-lg border bg-background text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="max-h-[280px] overflow-y-auto p-1">
            {error ? (
              <div className="py-6 text-center">
                <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-600 font-medium">Failed to load users</p>
                <p className="text-xs text-red-500 mt-1">{error}</p>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="text-sm text-primary hover:underline mt-3"
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-sm">No {role ? role.toLowerCase() + 's' : 'users'} found</p>
                {search && (
                  <button onClick={() => setSearch('')} className="text-sm text-primary hover:underline mt-1">
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onChange(user.name);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'w-full px-3 py-2.5 text-left flex items-center justify-between rounded-lg transition-colors',
                    'hover:bg-muted',
                    value === user.id || value === user.name
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground'
                  )}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', getRoleBadgeColor(user.role))}>
                      {user.role}
                    </span>
                    {(value === user.id || value === user.name) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
            {users.length} user{users.length !== 1 ? 's' : ''} available
          </div>
        </div>
      )}
    </div>
  );
}
