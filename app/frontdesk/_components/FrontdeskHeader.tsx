'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { 
    ChevronRight, 
    Search, 
    HelpCircle,
    User,
    Menu,
    X
} from 'lucide-react';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface FrontdeskHeaderProps {
    onMenuClick?: () => void;
}

export function FrontdeskHeader({ onMenuClick }: FrontdeskHeaderProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const pathSegments = pathname.split('/').filter(Boolean);
    
    const breadcrumbs = pathSegments.map((segment, index) => {
        const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
        const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
        const isLast = index === pathSegments.length - 1;
        return { label, href, isLast };
    });

    if (!mounted) return <div className="h-16 border-b bg-white/50 backdrop-blur-md" />;

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white/80 backdrop-blur-md px-3 sm:px-4 md:px-6 shadow-sm">
            {/* Left side: Menu button and breadcrumbs */}
            <div className="flex items-center space-x-2 overflow-hidden min-w-0">
                {/* Mobile menu button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden h-9 w-9 p-0"
                    onClick={onMenuClick}
                >
                    <Menu className="h-5 w-5" />
                </Button>

                <div className="flex items-center text-xs sm:text-sm font-medium text-slate-500">
                    <span className="hidden sm:inline">Frontdesk</span>
                    {breadcrumbs.length > 0 && <ChevronRight className="mx-1 h-3 w-3 sm:h-4 sm:w-4" />}
                </div>
                {breadcrumbs.slice(0, 2).map((crumb) => (
                    <div key={crumb.href} className="flex items-center min-w-0 hidden sm:flex">
                        <span className={cn(
                            "text-xs sm:text-sm font-semibold truncate",
                            crumb.isLast ? "text-stone-900" : "text-stone-500"
                        )}>
                            {crumb.label}
                        </span>
                        {!crumb.isLast && <ChevronRight className="mx-1 h-3 w-3 sm:h-4 sm:w-4 text-stone-400" />}
                    </div>
                ))}
            </div>

            {/* Right side: Search, notifications, avatar */}
            <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="hidden lg:flex items-center relative group">
                    <Search className="absolute left-3 h-4 w-4 text-stone-400 group-focus-within:text-stone-600 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search patients..." 
                        className="pl-9 pr-4 py-1.5 h-9 w-48 lg:w-64 bg-stone-50 border-stone-200 border rounded-full text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
                    />
                </div>

                <div className="hidden md:block h-6 w-px bg-stone-200" />

                <NotificationBell />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-offset-background transition-colors hover:bg-stone-100">
                            <Avatar className="h-9 w-9 border border-stone-200">
                                <AvatarFallback className="bg-stone-100 text-stone-600 font-bold text-xs uppercase">
                                    {(user?.firstName?.[0] || '') + (user?.lastName?.[0] || 'F')}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-bold leading-none text-stone-900">
                                    {user?.firstName} {user?.lastName}
                                </p>
                                <p className="text-xs leading-none text-stone-500 truncate">
                                    {user?.email}
                                </p>
                                <div className="mt-2 inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                                    Front Desk
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={() => window.location.href = '/frontdesk/profile'}>
                            <User className="mr-2 h-4 w-4" />
                            <span>My Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            <span>Help Center</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-rose-600 focus:text-rose-600" onClick={() => logout()}>
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
