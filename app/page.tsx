'use client';

/**
 * Landing Page — Nairobi Sculpt Aesthetic Centre
 * 
 * Professional, modern landing page with standardized typography,
 * refined layout spacing, and consistent design language.
 */

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle,
  Users,
  MapPin,
  Phone,
  Mail,
  Shield,
  Heart,
  Sparkles,
  Star,
} from "lucide-react";
import { useDoctors } from "@/hooks/doctors/useDoctors";

export default function Home() {
  const { data: doctors = [], isLoading: loadingDoctors, error: doctorsError } = useDoctors();

  return (
    <div className="min-h-screen bg-white">
      {/* ================================================================ */}
      {/* NAVIGATION                                                       */}
      {/* ================================================================ */}
      <nav className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="Nairobi Sculpt Logo"
                width={36}
                height={36}
                className="h-9 w-auto object-contain"
                priority
              />
              <span className="font-semibold text-lg text-slate-900 tracking-tight">
                Nairobi Sculpt
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#services" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                Services
              </Link>
              <Link href="#doctors" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                Doctors
              </Link>
              <Link href="#about" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                About
              </Link>
              <div className="flex items-center gap-3 ml-2">
                <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="bg-brand-primary hover:bg-brand-primary/90 text-white">
                  <Link href="/patient/register">Book Consultation</Link>
                </Button>
              </div>
            </div>
            {/* Mobile CTA */}
            <div className="md:hidden flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm" className="bg-brand-primary hover:bg-brand-primary/90 text-white">
                <Link href="/patient/register">Book</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* ================================================================ */}
      {/* HERO                                                             */}
      {/* ================================================================ */}
      <section className="relative py-20 sm:py-24 lg:py-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-isabelline/40 via-white to-white" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-powder/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-brand-primary tracking-wide uppercase mb-4">
              Premier Aesthetic Surgery Centre
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 leading-[1.15] tracking-tight mb-5">
              Transform Your Confidence{" "}
              <span className="text-brand-primary">With Expert Care</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-xl">
              World-class aesthetic surgery and personalized clinical care
              in the heart of Nairobi. Your journey to enhanced confidence begins here.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-brand-primary hover:bg-brand-primary/90 text-white h-12 px-7">
              <Link href="/patient/register">
                  Book Your Consultation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-7 border-slate-300 text-slate-700 hover:bg-slate-50">
                <Link href="/login">Sign In</Link>
                </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* TRUST BAR                                                        */}
      {/* ================================================================ */}
      <section className="border-y border-gray-100 bg-slate-50/50 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "10+", label: "Years of Excellence" },
              { value: "5", label: "Board-Certified Surgeons" },
              { value: "1,000+", label: "Procedures Performed" },
              { value: "100%", label: "Personalized Care" },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-xl font-bold text-brand-primary">{stat.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
            </div>
      </section>

      {/* ================================================================ */}
      {/* SERVICES                                                         */}
      {/* ================================================================ */}
      <section id="services" className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-brand-primary tracking-wide uppercase mb-2">
              What We Offer
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Our Services
            </h2>
            <p className="text-sm text-slate-500 mt-3 max-w-lg mx-auto">
              Comprehensive aesthetic surgery solutions tailored to your unique needs
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: "Liposuction",
                description: "Body contouring that removes excess fat deposits, creating a smoother, more contoured silhouette for abdomen, hips, thighs, and arms.",
              },
              {
                title: "Brazilian Butt Lift",
                description: "Combines liposuction with fat grafting to enhance the size and shape of the buttocks while contouring other areas.",
              },
              {
                title: "Tummy Tuck",
                description: "Removes excess skin and fat from the abdomen while tightening muscles for a flatter, firmer midsection.",
              },
              {
                title: "Breast Augmentation",
                description: "Personalized breast procedures including augmentation, lift, and reduction to achieve your desired silhouette.",
              },
              {
                title: "Facial Procedures",
                description: "Facelifts, rhinoplasty, blepharoplasty, brow lifts, chin augmentation, and otoplasty to enhance natural features.",
              },
              {
                title: "Non-Surgical Treatments",
                description: "Botox, dermal fillers, and advanced non-invasive treatments to rejuvenate with minimal downtime.",
              },
              {
                title: "Scar Management",
                description: "Keloid treatment, scar revision, and advanced wound care to improve the appearance and texture of scars.",
              },
              {
                title: "Reconstructive Surgery",
                description: "Hand surgery, traumatic injury management, congenital differences, and peripheral nerve surgery.",
              },
              {
                title: "Consultations",
                description: "In-depth consultations to understand your goals and develop a customized treatment plan.",
              },
            ].map((service, index) => (
              <div
                key={index}
                className="group p-5 rounded-xl border border-gray-100 hover:border-brand-primary/20 hover:shadow-sm bg-white transition-all duration-300"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-primary/5 flex items-center justify-center mt-0.5">
                    <Sparkles className="h-4 w-4 text-brand-primary/60 group-hover:text-brand-primary transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">
                        {service.title}
                      </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* DOCTORS                                                          */}
      {/* ================================================================ */}
      <section id="doctors" className="py-16 lg:py-20 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-brand-primary tracking-wide uppercase mb-2">
              Our Team
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Meet Our Expert Surgeons
            </h2>
            <p className="text-sm text-slate-500 mt-3 max-w-lg mx-auto">
              Board-certified surgeons with decades of combined experience dedicated to your goals.
            </p>
          </div>

          {loadingDoctors ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="h-7 w-7 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500">Loading our team...</p>
              </div>
            </div>
          ) : doctorsError ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-2">
                {doctorsError instanceof Error ? doctorsError.message : 'Failed to load doctors.'}
              </p>
              <button onClick={() => window.location.reload()} className="text-xs text-brand-primary hover:underline">
                Refresh page
              </button>
            </div>
          ) : doctors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctors.slice(0, 6).map((doctor) => (
                <div
                  key={doctor.id}
                  className="group bg-white rounded-xl border border-gray-100 hover:border-brand-primary/20 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
                >
                  <div className="p-6 flex-1">
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-4 mb-4">
                    {doctor.profile_image ? (
                        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-100 group-hover:border-brand-primary/20 transition-colors flex-shrink-0">
                        <Image
                          src={doctor.profile_image}
                          alt={doctor.name}
                          fill
                          className="object-contain"
                            sizes="56px"
                        />
                      </div>
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-brand-primary/5 flex items-center justify-center border-2 border-slate-100 flex-shrink-0">
                          <Users className="h-6 w-6 text-brand-primary/40" />
                      </div>
                    )}
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {(() => {
                        if (doctor.title && doctor.name) {
                          const titleLower = doctor.title.toLowerCase().trim();
                          const nameLower = doctor.name.toLowerCase().trim();
                          if (nameLower.startsWith(titleLower) || nameLower.startsWith(`${titleLower} `)) {
                            return doctor.name;
                          }
                          return `${doctor.title} ${doctor.name}`;
                        }
                        return doctor.name;
                      })()}
                    </h3>
                        <p className="text-xs text-brand-primary font-medium truncate">{doctor.specialization}</p>
                      </div>
                    </div>

                    {/* Bio */}
                    {doctor.bio && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{doctor.bio}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-6 pb-5 pt-0 flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1 text-xs h-9">
                      <Link href={`/portal/doctors/${doctor.id}`}>View Profile</Link>
                      </Button>
                    <Button asChild size="sm" className="flex-1 text-xs h-9 bg-brand-primary hover:bg-brand-primary/90 text-white">
                      <Link href={`/patient/register?doctorId=${doctor.id}`}>
                        Book
                        <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                      </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Our team information is being updated.</p>
            </div>
          )}

          {doctors.length > 6 && (
            <div className="text-center mt-8">
              <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
              <Link href="/portal/doctors">
                  View All Doctors
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                </Button>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================ */}
      {/* ABOUT                                                            */}
      {/* ================================================================ */}
      <section id="about" className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left — Story */}
            <div>
              <p className="text-sm font-medium text-brand-primary tracking-wide uppercase mb-2">
                Our Story
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-5">
                About Nairobi Sculpt
              </h2>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <p>
                  Founded in Nairobi, Nairobi Sculpt Aesthetic Centre has been transforming lives through expert plastic surgery and aesthetic treatments since 2010. Our mission is to empower individuals with personalized, high-quality care that enhances natural beauty and boosts confidence.
                </p>
                <p>
                  With a team of board-certified surgeons and cutting-edge technology, we&apos;ve become a trusted name in Kenya&apos;s aesthetic industry. Our state-of-the-art facility on 4th Avenue Towers is designed to provide a comfortable environment where every client receives tailored solutions.
                </p>
              </div>
            </div>

            {/* Right — Commitments */}
            <div className="space-y-3">
              {[
                {
                  icon: Shield,
                  title: "Advanced Facilities",
                  description: "State-of-the-art technology for safe and effective procedures.",
                },
                {
                  icon: Star,
                  title: "Expert Surgeons",
                  description: "Board-certified surgeons with over 15 years of combined experience.",
                },
                {
                  icon: Heart,
                  title: "Personalized Care",
                  description: "Bespoke treatment plans tailored to your individual aesthetic goals.",
                },
                {
                  icon: CheckCircle,
                  title: "Comprehensive Aftercare",
                  description: "Dedicated support for a smooth and successful recovery.",
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-primary/5 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-brand-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-0.5">{item.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* WHY CHOOSE US                                                    */}
      {/* ================================================================ */}
      <section className="py-16 lg:py-20 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Why Choose Nairobi Sculpt
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "Board-certified plastic surgeons with years of experience",
              "State-of-the-art facilities and advanced technology",
              "Personalized treatment plans tailored to each patient",
              "Comprehensive pre and post-operative care",
              "Patient-centered approach with privacy and dignity",
              "Commitment to safety and natural outcomes",
            ].map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100"
              >
                <CheckCircle className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600 leading-relaxed">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* CTA                                                              */}
      {/* ================================================================ */}
      <section className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-brand-primary p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
              Ready to Begin Your Journey?
            </h2>
            <p className="text-sm text-white/70 mb-8 max-w-md mx-auto">
              Schedule your consultation today and take the first step towards the confidence you deserve.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-white text-brand-primary hover:bg-white/90 h-12 px-7 font-semibold">
              <Link href="/patient/register">
                  Book Consultation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-7 border-white/30 text-white hover:bg-white/10">
                <Link href="/login">Sign In</Link>
                </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FOOTER                                                           */}
      {/* ================================================================ */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 p-1.5 flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Nairobi Sculpt Logo"
                    width={24}
                    height={24}
                    className="h-6 w-auto object-contain brightness-200"
                  />
                </div>
                <div>
                  <span className="font-semibold text-white text-sm block leading-tight">Nairobi Sculpt</span>
                  <span className="text-[11px] text-slate-500">Aesthetic Centre</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mt-3">
                Premier aesthetic surgery and clinical management in Nairobi, Kenya.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Quick Links</h4>
              <ul className="space-y-2">
                {[
                  { href: "/login", label: "Sign In" },
                  { href: "/patient/register", label: "Register" },
                  { href: "#services", label: "Services" },
                  { href: "#doctors", label: "Our Doctors" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-xs text-slate-500 hover:text-white transition-colors">
                      {link.label}
                  </Link>
                </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Contact</h4>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs">4th Avenue Towers, 13th Floor, Fourth Ngong Ave, Nairobi</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                  <span className="text-xs">0759 067388</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                  <span className="text-xs">info@nairobisculpt.co.ke</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-slate-800 pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-[11px] text-slate-600">
                © {new Date().getFullYear()} Nairobi Sculpt Aesthetic Centre. All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-[11px] text-slate-600">
                <Link href="#" className="hover:text-slate-400 transition-colors">Terms</Link>
                <span className="text-slate-700">·</span>
                <Link href="#" className="hover:text-slate-400 transition-colors">Privacy</Link>
              </div>
            </div>
            <p className="text-[10px] text-slate-700 text-center mt-4">
              Powered by <span className="font-medium text-slate-600">BKG CONSULTING</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
