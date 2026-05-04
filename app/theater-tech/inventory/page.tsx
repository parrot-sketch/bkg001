'use client';

import { Package, Boxes, Truck, ShoppingCart, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const inventoryModules = [
  {
    name: 'Item Catalog',
    description: 'Manage the master catalog of all surgical and clinical items.',
    href: '/theater-tech/inventory/items',
    icon: Package,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    name: 'Batches & Stock',
    description: 'Track real-time stock levels, batches, and expiration dates.',
    href: '/theater-tech/inventory/batches',
    icon: Boxes,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  {
    name: 'Vendors',
    description: 'Manage vendor relationships and contact information.',
    href: '/theater-tech/inventory/vendors',
    icon: Truck,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    name: 'Purchase Orders',
    description: 'Create and track purchase orders for theater supplies.',
    href: '/theater-tech/inventory/purchase-orders',
    icon: ShoppingCart,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    name: 'Goods Receipts',
    description: 'Record and verify received shipments against purchase orders.',
    href: '/theater-tech/inventory/receipts',
    icon: FileText,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
];

export default function InventoryHub() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Inventory Management
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            Centralized hub for managing theater supplies, stock levels, and procurement operations.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventoryModules.map((module) => (
            <Link
              key={module.name}
              href={module.href}
              className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${module.bgColor}`}>
                  <module.icon className={`h-6 w-6 ${module.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-brand-primary transition-colors">
                  {module.name}
                </h3>
              </div>
              
              <p className="text-sm text-slate-500 flex-1">
                {module.description}
              </p>
              
              <div className="mt-6 flex items-center text-sm font-medium text-brand-primary">
                Open module
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
