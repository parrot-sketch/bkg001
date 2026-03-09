import { ReactNode } from "react";
import Link from "next/link";
import { Package, List, Boxes, History } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InventoryLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
                    <p className="text-muted-foreground">
                        Manage catalog, track stock batches, and monitor high-value implants.
                    </p>
                </div>
            </div>

            <div className="w-full overflow-x-auto pb-2">
                <nav className="flex space-x-2 border-b border-border/40 pb-4">
                    <Link
                        href="/admin/inventory"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm"
                    >
                        <Package className="mr-2 h-4 w-4" />
                        Overview
                    </Link>
                    <Link
                        href="/admin/inventory/items"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm"
                    >
                        <List className="mr-2 h-4 w-4" />
                        Item Catalog
                    </Link>
                    <Link
                        href="/admin/inventory/batches"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm"
                    >
                        <Boxes className="mr-2 h-4 w-4" />
                        Batches & Stock
                    </Link>
                </nav>
            </div>

            <div className="mt-4">
                {children}
            </div>
        </div>
    );
}
