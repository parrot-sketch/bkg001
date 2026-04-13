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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

const CATEGORIES = [
  { value: 'FACE', label: 'Face' },
  { value: 'BREAST', label: 'Breast' },
  { value: 'BODY', label: 'Body' },
  { value: 'RECONSTRUCTIVE', label: 'Reconstructive' },
  { value: 'FACE_AND_NECK', label: 'Face & Neck' },
  { value: 'BODY_CONTOURING', label: 'Body Contouring' },
  { value: 'INTIMATE_AESTHETIC', label: 'Intimate Aesthetic' },
  { value: 'HAIR_RESTORATION', label: 'Hair Restoration' },
  { value: 'NON_SURGICAL', label: 'Non Surgical' },
  { value: 'POST_WEIGHT_LOSS', label: 'Post Weight Loss' },
  { value: 'OTHER', label: 'Other' },
];

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  is_billable: z.boolean().default(true),
  estimatedDurationMinutes: z.number().optional(),
  defaultPrice: z.number().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  preparationNotes: z.string().optional(),
  postOpNotes: z.string().optional(),
});

interface Service {
  id: number;
  service_name: string;
  price: number;
  category: string;
}

export default function ProcedureFormPage() {
  const router = useRouter();
  const params = useParams();
  const procedureId = params.id as string;
  const isEditing = procedureId && procedureId !== 'new';

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      is_active: true,
      is_billable: true,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [procRes, svcRes] = await Promise.all([
          isEditing ? fetch(`/api/admin/procedures/${procedureId}`) : Promise.resolve(null),
          fetch('/api/services?is_active=true&limit=200'),
        ]);

        if (svcRes) {
          const svcData = await svcRes.json();
          if (svcData.success) {
            setServices(svcData.data || []);
          }
        }

        if (isEditing && procRes) {
          const procData = await procRes.json();
          if (procData.success && procData.data) {
            const p = procData.data;
            form.reset({
              name: p.name,
              category: p.category,
              subcategory: p.subcategory || '',
              description: p.description || '',
              is_active: p.is_active,
              is_billable: p.is_billable,
              estimatedDurationMinutes: p.estimated_duration_minutes || undefined,
              defaultPrice: p.default_price || undefined,
              minPrice: p.min_price || undefined,
              maxPrice: p.max_price || undefined,
              preparationNotes: p.preparation_notes || '',
              postOpNotes: p.post_op_notes || '',
            });
            setSelectedServices(
              p.procedure_service_links?.map((l: any) => l.service.id) || []
            );
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isEditing, procedureId, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setSaving(true);
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing
        ? `/api/admin/procedures/${procedureId}`
        : '/api/admin/procedures';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          serviceIds: selectedServices,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(isEditing ? 'Procedure updated' : 'Procedure created');
        router.push('/admin/procedures');
      } else {
        toast.error(data.error || 'Failed to save procedure');
      }
    } catch (error) {
      toast.error('Failed to save procedure');
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
              <CardTitle>{isEditing ? 'Edit Procedure' : 'New Procedure'}</CardTitle>
              <CardDescription>
                {isEditing ? 'Update the procedure details below' : 'Fill in the procedure details below'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Procedure Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Breast Augmentation" {...field} />
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
                        {CATEGORIES.map((cat) => (
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
                        placeholder="Brief description of the procedure..."
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedDurationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 120"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : undefined
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
                  name="defaultPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Price (KES)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 150000"
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Price (KES)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 100000"
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
                  name="maxPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Price (KES)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 200000"
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
                name="preparationNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pre-operative Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Instructions for patient before surgery..."
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
                name="postOpNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post-operative Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Care instructions after surgery..."
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel>Linked Services</FormLabel>
                <div className="border rounded-md max-h-48 overflow-y-auto space-y-1 p-2">
                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">
                      No services available
                    </p>
                  ) : (
                    services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded"
                      >
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedServices([...selectedServices, service.id]);
                            } else {
                              setSelectedServices(
                                selectedServices.filter((id) => id !== service.id)
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={`service-${service.id}`}
                          className="flex-1 text-sm cursor-pointer"
                        >
                          {service.service_name}
                        </label>
                        <span className="text-xs text-muted-foreground">
                          KES {service.price.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_billable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Billable</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
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
              {saving ? 'Saving...' : 'Save Procedure'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}