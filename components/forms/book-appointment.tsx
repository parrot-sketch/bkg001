"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Doctor, Patient } from "@prisma/client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { Button } from "../ui/button";
import { UserPen } from "lucide-react";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { ProfileImage } from "../profile-image";
import { CustomInput } from "../custom-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";
import { patientApi } from "@/lib/api/patient";
import type { SubmitConsultationRequestDto } from "@/application/dtos/SubmitConsultationRequestDto";
import Link from "next/link";
import { ConsultationRequestConfirmationDialog } from "../patient/ConsultationRequestConfirmationDialog";
import type { AppointmentResponseDto } from "@/application/dtos/AppointmentResponseDto";

const TYPES = [
  { label: "Rhinoplasty", value: "Rhinoplasty" },
  { label: "BBL (Brazilian Butt Lift)", value: "BBL" },
  { label: "Liposuction", value: "Liposuction" },
  { label: "Breast Surgery", value: "Breast Surgery" },
  { label: "Skin Procedures", value: "Skin Procedures" },
  { label: "Other", value: "Other" },
];

const TIME_PREFERENCES = [
  { label: "Morning", value: "Morning" },
  { label: "Afternoon", value: "Afternoon" },
  { label: "Evening", value: "Evening" },
  { label: "No Preference", value: "No Preference" },
];

// Schema for consultation request (no specific date/time)
const ConsultationRequestSchema = z.object({
  doctor_id: z.string().min(1, "Select a surgeon"),
  type: z.string().min(1, "Select procedure of interest"),
  preferred_date: z.string().optional(),
  time_preference: z.string().min(1, "Select time preference"),
  concern_description: z.string().min(10, "Please describe your concern (at least 10 characters)"),
  note: z.string().optional(),
  isOver18: z.boolean().refine((val) => val === true, {
    message: "You must confirm you are over 18 years old",
  }),
  privacyConsent: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Privacy Policy",
  }),
  contactConsent: z.boolean().refine((val) => val === true, {
    message: "You must agree to be contacted",
  }),
  acknowledgmentConsent: z.boolean().refine((val) => val === true, {
    message: "You must acknowledge the terms",
  }),
});

export const BookAppointment = ({
  data,
  doctors,
}: {
  data: Patient;
  doctors: Doctor[];
}) => {
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [physicians, setPhysicians] = useState<Doctor[] | undefined>(doctors);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedAppointment, setSubmittedAppointment] = useState<AppointmentResponseDto | null>(null);

  const patientName = `${data?.first_name} ${data?.last_name}`;

  const form = useForm<z.infer<typeof ConsultationRequestSchema>>({
    resolver: zodResolver(ConsultationRequestSchema),
    defaultValues: {
      doctor_id: "",
      type: "",
      preferred_date: "",
      time_preference: "",
      concern_description: "",
      note: "",
      isOver18: false,
      privacyConsent: false,
      contactConsent: false,
      acknowledgmentConsent: false,
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof ConsultationRequestSchema>> = async (
    values
  ) => {
    try {
      setIsSubmitting(true);

      // Map form data to SubmitConsultationRequestDto
      const consultationRequestDto: SubmitConsultationRequestDto = {
        patientId: data?.id!,
        doctorId: values.doctor_id || undefined,
        preferredDate: values.preferred_date ? new Date(values.preferred_date) : undefined,
        timePreference: values.time_preference || undefined,
        concernDescription: values.concern_description,
        notes: values.note || undefined,
        // Required consents - from user input
        isOver18: values.isOver18,
        contactConsent: values.contactConsent,
        privacyConsent: values.privacyConsent,
        acknowledgmentConsent: values.acknowledgmentConsent,
      };

      const response = await patientApi.submitConsultationRequest(consultationRequestDto);

      if (response.success && response.data) {
        form.reset({
          doctor_id: "",
          type: "",
          preferred_date: "",
          time_preference: "",
          concern_description: "",
          note: "",
          isOver18: false,
          privacyConsent: false,
          contactConsent: false,
          acknowledgmentConsent: false,
        });
        setSubmittedAppointment(response.data);
        setShowConfirmation(true);
        router.refresh();
      } else if (!response.success) {
        toast.error(response.error || "Failed to submit consultation request. Please try again.");
      } else {
        toast.error("Failed to submit consultation request. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting consultation request:", error);
      toast.error("Something went wrong. Try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex items-center gap-2 justify-start text-sm font-light bg-blue-600 text-white"
        >
          <UserPen size={16} /> Request Consultation
        </Button>
      </SheetTrigger>

      <SheetContent className="rounded-xl rounded-r-2xl md:h-p[95%] md:top-[2.5%] md:right-[1%] w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span>Loading</span>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <SheetHeader>
              <SheetTitle>Request Consultation</SheetTitle>
            </SheetHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8 mt-5 2xl:mt-10"
              >
                <div className="w-full rounded-md border border-input bg-background px-3 py-1 flex items-center gap-4">
                  <ProfileImage
                    url={data?.img!}
                    name={patientName}
                    className="size-16 border border-input"
                    bgColor={data?.colorCode!}
                  />

                  <div>
                    <p className="font-semibold text-lg">{patientName}</p>
                    <span className="text-sm text-gray-500 capitalize">
                      {data?.gender}
                    </span>
                  </div>
                </div>

                <CustomInput
                  type="select"
                  selectList={TYPES}
                  control={form.control}
                  name="type"
                  label="Procedure of Interest"
                  placeholder="Select a procedure"
                />

                <FormField
                  control={form.control}
                  name="doctor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surgeon</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a surgeon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="">
                          {physicians?.map((i, id) => (
                            <SelectItem key={id} value={i.id} className="p-2">
                              <div className="flex flex-row gap-2 p-2">
                                <ProfileImage
                                  url={i?.img!}
                                  name={i?.name}
                                  bgColor={i?.colorCode!}
                                  textClassName="text-black"
                                />
                                <div>
                                  <p className="font-medium text-start ">
                                    {i.name}
                                  </p>
                                  <span className="text-sm text-gray-600">
                                    {i?.specialization}
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name="preferred_date"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Preferred Date (Optional)</FormLabel>
                        <FormControl>
                          <input
                            type="date"
                            {...field}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            min={new Date().toISOString().split('T')[0]}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="time_preference"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Time Preference *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select preference" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIME_PREFERENCES.map((pref) => (
                              <SelectItem key={pref.value} value={pref.value}>
                                {pref.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="concern_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Describe Your Concern *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Please describe what procedure you're interested in and any concerns or goals..."
                          disabled={isSubmitting}
                          rows={4}
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Any additional information you'd like to share..."
                          disabled={isSubmitting}
                          rows={3}
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Required Consents */}
                <div className="space-y-4 border-t pt-4">
                  <FormLabel className="text-sm font-semibold">Required Consents *</FormLabel>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="isOver18"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              I confirm I am over 18 years old *
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="privacyConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              I agree to the <Link href="/privacy" className="underline text-primary hover:underline-offset-2" target="_blank">Privacy Policy</Link> *
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              I consent to be contacted by phone, email, or SMS regarding my consultation request *
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="acknowledgmentConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              I acknowledge that this is a consultation request and not a confirmed appointment. Our team will review and contact me to schedule *
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button
                  disabled={isSubmitting}
                  type="submit"
                  className="bg-blue-600 w-full"
                >
                  {isSubmitting ? 'Submitting...' : 'Request Consultation'}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </SheetContent>

      {/* Success Confirmation Dialog */}
      <ConsultationRequestConfirmationDialog
        open={showConfirmation}
        onClose={() => {
          setShowConfirmation(false);
          setSubmittedAppointment(null);
        }}
        appointment={submittedAppointment}
      />
    </Sheet>
  );
};
