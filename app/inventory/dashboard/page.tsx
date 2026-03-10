'use client';

/**
 * Inventory Dashboard Page
 * 
 * Route: /inventory/dashboard
 * 
 * Provides overview of inventory status across all roles:
 * - ADMIN: Full access with edit capabilities
 * - NURSE: View and manage consumables
 * - THEATER_TECHNICIAN: View for surgical planning
 * - FRONTDESK: View for patient billing
 * 
 * Features:
 * - Summary cards (total items, low stock, out of stock, expiring)
 * - Category breakdown
 * - Low stock alerts
 * - Expiring items alerts
 * - Recent items
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { Role } from '@/domain/enums/Role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  RefreshCw,
  ArrowRight,
  TrendingDown,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Format currency helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface DashboardData {
  summary: {
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringSoonCount: number;
    totalValue: number;
  };
  categoryBreakdown: {
    category: string;
    itemCount: number;
    totalQuantity: number;
  }[];
  lowStockItems: {
    id: number;
    name: string;
    category: string;
    quantityOnHand: number;
    reorderPoint: number;
    unitCost: number;
  }[];
  expiringBatches: {
    id: string;
    itemName: string;
    category: string;
    batchNumber: string;
    expiryDate: string;
    quantityRemaining: number;
  }[];
  recentItems: {
    id: number;
    name: string;
    category: string;
    quantityOnHand: number;
    unitCost: number;
    reorderPoint: number;
  }[];
}

export default function InventoryDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await fetch('/api/inventory/dashboard');
      const json = await res.json();
      
      if (json.success) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error || 'Failed to load dashboard');
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      const allowedRoles = [Role.ADMIN, Role.NURSE, Role.THEATER_TECHNICIAN, Role.FRONTDESK];
      if (!allowedRoles.includes(user.role as Role)) {
        setError('You do not have permission to view this page');
        setLoading(false);
        return;
      }
      fetchData();
    }
  }, [isAuthenticated, user]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      IMPLANT: 'bg-purple-100 text-purple-700 border-purple-200',
      SUTURE: 'bg-blue-100 text-blue-700 border-blue-200',
      ANESTHETIC: 'bg-red-100 text-red-700 border-red-200',
      MEDICATION: 'bg-green-100 text-green-700 border-green-200',
      DISPOSABLE: 'bg-amber-100 text-amber-700 border-amber-200',
      INSTRUMENT: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      DRESSING: 'bg-pink-100 text-pink-700 border-pink-200',
      OTHER: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return colors[category] || colors.OTHER;
  };

  if (authLoading || loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of clinic inventory status
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Link href="/inventory/items">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Package className="h-4 w-4 mr-2" />
              View All Items
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Items */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {data?.summary.totalItems || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active inventory items
            </p>
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className={cn(
          "border",
          (data?.summary.lowStockCount || 0) > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-3xl font-bold",
              (data?.summary.lowStockCount || 0) > 0 ? "text-amber-600" : "text-slate-900"
            )}>
              {data?.summary.lowStockCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Items at or below reorder point
            </p>
          </CardContent>
        </Card>

        {/* Out of Stock */}
        <Card className={cn(
          "border",
          (data?.summary.outOfStockCount || 0) > 0 ? "border-red-200 bg-red-50" : "border-slate-200"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-3xl font-bold",
              (data?.summary.outOfStockCount || 0) > 0 ? "text-red-600" : "text-slate-900"
            )}>
              {data?.summary.outOfStockCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Items with zero quantity
            </p>
          </CardContent>
        </Card>

        {/* Total Value */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrency(data?.summary.totalValue || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total stock value
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.lowStockItems && data.lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {data.lowStockItems.slice(0, 5).map(item => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        <span className={getCategoryColor(item.category)}>
                          {item.category}
                        </span>
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-bold text-amber-600">
                        {item.quantityOnHand} / {item.reorderPoint}
                      </p>
                      <p className="text-xs text-slate-500">on hand</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-3" />
                <p className="text-sm text-slate-600 font-medium">All items well stocked</p>
                <p className="text-xs text-slate-400">No items below reorder point</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-red-500" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.expiringBatches && data.expiringBatches.length > 0 ? (
              <div className="space-y-3">
                {data.expiringBatches.slice(0, 5).map(batch => (
                  <div 
                    key={batch.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {batch.itemName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Batch: {batch.batchNumber}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-bold text-red-600">
                        {new Date(batch.expiryDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {batch.quantityRemaining} units
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-3" />
                <p className="text-sm text-slate-600 font-medium">No expiring items</p>
                <p className="text-xs text-slate-400">All items within shelf life</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            Inventory by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {data?.categoryBreakdown?.map(cat => (
              <div 
                key={cat.category}
                className={cn(
                  "p-3 rounded-lg border text-center",
                  getCategoryColor(cat.category)
                )}
              >
                <p className="text-2xl font-bold">{cat.itemCount}</p>
                <p className="text-xs font-medium truncate">{cat.category}</p>
                <p className="text-xs opacity-75">{cat.totalQuantity} units</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Items */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-500" />
            Recently Added Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 text-sm font-medium text-slate-500">Item Name</th>
                  <th className="pb-2 text-sm font-medium text-slate-500">Category</th>
                  <th className="pb-2 text-sm font-medium text-slate-500 text-right">Quantity</th>
                  <th className="pb-2 text-sm font-medium text-slate-500 text-right">Unit Cost</th>
                  <th className="pb-2 text-sm font-medium text-slate-500 text-right">Reorder Point</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentItems?.map(item => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-sm text-slate-900">{item.name}</td>
                    <td className="py-3">
                      <span className={cn("text-xs px-2 py-1 rounded-full", getCategoryColor(item.category))}>
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-slate-900 text-right">{item.quantityOnHand}</td>
                    <td className="py-3 text-sm text-slate-900 text-right">{formatCurrency(item.unitCost || 0)}</td>
                    <td className="py-3 text-sm text-slate-500 text-right">{item.reorderPoint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
