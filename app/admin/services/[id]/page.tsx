'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

const SERVICE_CATEGORIES = [
  { value: 'Service', label: 'Service' },
  { value: 'Consultation', label: 'Consultation' },
  { value: 'Procedure', label: 'Procedure' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Pharmacy', label: 'Pharmacy' },
];

const PRICE_TYPES = [
  { value: 'FIXED', label: 'Fixed Price' },
  { value: 'VARIABLE', label: 'Variable Range' },
  { value: 'PER_UNIT', label: 'Per Unit' },
  { value: 'QUOTE_REQUIRED', label: 'Quote Required' },
];

const formSchema = z.object({
  service_name: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive').default(0),
  category: z.string().optional(),
  is_active: z.boolean().default(true),
  price_type: z.string().default('FIXED'),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
});

export default function ServiceFormPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;
  const isEditing = serviceId && serviceId !== 'new';

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service_name: '',
      category: '',
      is_active: true,
      price_type: 'FIXED',
      price: 0,
    },
  });

  useEffect(() => {
    if (isEditing) {
      const fetchService = async () => {
        try {
          const res = await fetch(`/api/admin/services/${serviceId}`);
          const data = await res.json();
          
          if (data.success && data.data) {
            const s = data.data;
            form.reset({
              service_name: s.service_name,
              description: s.description || '',
              price: s.price,
              category: s.category || '',
              is_active: s.is_active,
              price_type: s.price_type || 'FIXED',
              min_price: s.min_price || undefined,
              max_price: s.max_price || undefined,
            });
          }
        } catch (error) {
          console.error('Error fetching service:', error);
          toast.error('Failed to load service');
        } finally {
          setLoading(false);
        }
      };
      fetchService();
    } else {
      setLoading(false);
    }
  }, [isEditing, serviceId, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setSaving(true);
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing
        ? `/api/admin/services/${serviceId}`
        : '/api/admin/services';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(isEditing ? 'Service updated' : 'Service created');
        router.push('/admin/services');
      } else {
        toast.error(data.error || 'Failed to save service');
      }
    } catch (error) {
      toast.error('Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <Card>
          <CardHeader />
          <CardContent className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? 'Edit Service' : 'New Service'}</CardTitle>
              <CardDescription>
                {isEditing ? 'Update the service details below' : 'Fill in the service details below'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="service_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Consultation - Initial" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of the service..."
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select price type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRICE_TYPES.map((pt) => (
                          <SelectItem key={pt.value} value={pt.value}>
                            {pt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (KES)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 5000"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : 0
                            )
                          }
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="min_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Price (KES)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 3000"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="max_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Price (KES)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 7000"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : undefined
                          )
                        }
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Service'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}