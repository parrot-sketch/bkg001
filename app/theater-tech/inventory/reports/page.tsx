'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

interface StockReportData {
  items: Array<{
    id: number;
    name: string;
    sku: string | null;
    category: string;
    unitOfMeasure: string;
    quantityOnHand: number;
    reorderPoint: number;
    isActive: boolean;
    isBelowReorderPoint: boolean;
    unitCost?: number;
    stockValue?: number;
  }>;
  summary: {
    totalItems: number;
    itemsBelowReorderPoint: number;
    totalStockValue?: number;
    averageUnitCost?: number;
  };
  filters: {
    belowReorderOnly: boolean;
    category: string | null;
    activeOnly: boolean;
  };
}

interface ConsumptionReportData {
  totals: {
    totalQuantity: number;
    totalCost: number;
    billableCost: number;
    nonBillableCost: number;
  };
  grouped: Array<{
    key: string;
    quantity: number;
    cost: number;
    billableCost: number;
    nonBillableCost: number;
    items: Array<{
      inventoryItemId: number;
      itemName: string;
      category: string;
      quantityUsed: number;
      unitCost: number;
      totalCost: number;
      isBillable: boolean;
      usedAt: string;
      usedByUserName: string | null;
      sourceFormKey: string | null;
    }>;
  }>;
  filters: {
    from: string;
    to: string;
    category: string | null;
    sourceFormKey: string | null;
    groupBy: string;
  };
}

function ReportsContent() {
  const { user, isAuthenticated } = useAuth();
  const [stockReport, setStockReport] = useState<StockReportData | null>(null);
  const [consumptionReport, setConsumptionReport] = useState<ConsumptionReportData | null>(null);
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingConsumption, setLoadingConsumption] = useState(true);
  const [stockCategory, setStockCategory] = useState<string>('ALL');
  const [stockBelowReorderOnly, setStockBelowReorderOnly] = useState(true);
  const [consumptionCategory, setConsumptionCategory] = useState<string>('ALL');
  const [consumptionGroupBy, setConsumptionGroupBy] = useState<string>('day');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated) {
      loadStockReport();
      loadConsumptionReport();
    }
  }, [isAuthenticated, stockCategory, stockBelowReorderOnly, consumptionCategory, consumptionGroupBy, fromDate, toDate]);

  const loadStockReport = async () => {
    try {
      setLoadingStock(true);
      const params = new URLSearchParams();
      params.set('belowReorderOnly', stockBelowReorderOnly ? 'true' : 'false');
      params.set('activeOnly', 'true');
      if (stockCategory && stockCategory !== 'ALL') params.set('category', stockCategory);

      const res = await apiClient.get<StockReportData>(`/theater-tech/inventory/report/stock?${params}`);
      if (res.success) {
        setStockReport((res as any).data);
      }
    } catch {
      toast.error('Failed to load stock report');
    } finally {
      setLoadingStock(false);
    }
  };

  const loadConsumptionReport = async () => {
    try {
      setLoadingConsumption(true);
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (consumptionCategory && consumptionCategory !== 'ALL') params.set('category', consumptionCategory);
      params.set('groupBy', consumptionGroupBy);

      const res = await apiClient.get<ConsumptionReportData>(`/theater-tech/inventory/report/consumption?${params}`);
      if (res.success) {
        setConsumptionReport((res as any).data);
      }
    } catch {
      toast.error('Failed to load consumption report');
    } finally {
      setLoadingConsumption(false);
    }
  };

  if (!isAuthenticated) return <div className="flex items-center justify-center h-screen"><p className="text-sm text-slate-400">Authenticating...</p></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Stock levels and consumption analytics</p>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock Report</TabsTrigger>
          <TabsTrigger value="consumption">Consumption Report</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={stockCategory} onValueChange={setStockCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {Object.values(InventoryCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Filter</Label>
                <Button
                  variant={stockBelowReorderOnly ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setStockBelowReorderOnly(!stockBelowReorderOnly)}
                >
                  Below Reorder Point Only
                </Button>
              </div>
            </CardContent>
          </Card>

          {loadingStock ? (
            <Skeleton className="h-64 w-full" />
          ) : stockReport ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-500">Total Items</p>
                    <p className="text-2xl font-semibold">{stockReport.summary.totalItems}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-500">Below Reorder</p>
                    <p className="text-2xl font-semibold text-amber-600">{stockReport.summary.itemsBelowReorderPoint}</p>
                  </CardContent>
                </Card>
                {stockReport.summary.totalStockValue !== undefined && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-slate-500">Total Stock Value</p>
                      <p className="text-2xl font-semibold">${stockReport.summary.totalStockValue.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Stock Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {stockReport.items.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">No items found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">On Hand</TableHead>
                          <TableHead className="text-right">Reorder Pt</TableHead>
                          <TableHead>Status</TableHead>
                          {stockReport.items[0]?.unitCost !== undefined && (
                            <TableHead className="text-right">Unit Cost</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockReport.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
                            <TableCell className="text-right">{item.quantityOnHand}</TableCell>
                            <TableCell className="text-right">{item.reorderPoint}</TableCell>
                            <TableCell>
                              {item.isBelowReorderPoint ? (
                                <Badge className="bg-amber-100 text-amber-700 text-xs">Below Reorder</Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs">OK</Badge>
                              )}
                            </TableCell>
                            {item.unitCost !== undefined && (
                              <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="consumption" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={consumptionCategory} onValueChange={setConsumptionCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {Object.values(InventoryCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Group By</Label>
                <Select value={consumptionGroupBy} onValueChange={setConsumptionGroupBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="item">Item</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="source">Source</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>From</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>To</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {loadingConsumption ? (
            <Skeleton className="h-64 w-full" />
          ) : consumptionReport ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-500">Total Quantity</p>
                    <p className="text-2xl font-semibold">{consumptionReport.totals.totalQuantity}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-500">Total Cost</p>
                    <p className="text-2xl font-semibold">${consumptionReport.totals.totalCost.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-500">Billable Cost</p>
                    <p className="text-2xl font-semibold text-emerald-600">${consumptionReport.totals.billableCost.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-500">Non-Billable Cost</p>
                    <p className="text-2xl font-semibold text-rose-600">${consumptionReport.totals.nonBillableCost.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              {consumptionReport.grouped.map((group) => (
                <Card key={group.key}>
                  <CardHeader>
                    <CardTitle className="text-lg">{group.key}</CardTitle>
                    <CardDescription>
                      Qty: {group.quantity} · Cost: ${group.cost.toFixed(2)} · Billable: ${group.billableCost.toFixed(2)} · Non-Billable: ${group.nonBillableCost.toFixed(2)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Qty Used</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
                            <TableCell className="text-right">{item.quantityUsed}</TableCell>
                            <TableCell className="text-right">${item.unitCost.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${item.totalCost.toFixed(2)}</TableCell>
                            <TableCell>{item.usedByUserName || '—'}</TableCell>
                            <TableCell>{item.sourceFormKey || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function TheaterTechReportsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <ReportsContent />
    </Suspense>
  );
}