'use client';

/**
 * Landing Page V2 — Premium Graphics Version
 * 
 * Enhanced with premium visual graphics, animated elements, and lively interactions.
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
  Star,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DoctorsSection } from "./DoctorsSection";
import {
  FloatingParticles,
  MedicalCrossIcon,
  BeautyIcon,
  WavePattern,
  GradientOrb,
  ServiceIcon,
  DecorativeElement,
  AnimatedMeshGradient,
  CardGlow,
} from "@/components/landing/PremiumGraphics";
import {
  Sparkles,
  Stethoscope,
  Scissors,
  Syringe,
  HeartPulse,
  Activity,
  Award,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Scroll-reveal wrapper — fades + slides children in on first view   */
/* ------------------------------------------------------------------ */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ================================================================== */
/* VERSION 2 — PREMIUM GRAPHICS                                        */
/* ================================================================== */
export default function LandingPageV2() {
  return (
    <div className="min-h-screen bg-white">
      {/* ============================================================ */}
      {/* NAVIGATION                                                    */}
      {/* ============================================================ */}
      <nav className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            {/* Mobile */}
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

      {/* ============================================================ */}
      {/* HERO                                                          */}
      {/* ============================================================ */}
      <section className="relative py-24 sm:py-28 lg:py-36 overflow-hidden">
        {/* Layer 1 — Gradient mesh base */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-isabelline/60 via-white to-brand-powder/15" />
        {/* Layer 2 — Dot grid texture */}
        <div className="absolute inset-0 bg-dot-grid-light mask-fade-y" />
        {/* Layer 3 — Animated mesh gradient */}
        <AnimatedMeshGradient />
        {/* Layer 4 — Floating particles */}
        <FloatingParticles />
        {/* Layer 5 — Radial glow spotlights with enhanced visuals */}
        <GradientOrb size={500} color="powder" className="top-[-10%] right-[-5%] animate-landing-float-slow" />
        <GradientOrb size={400} color="secondary" className="bottom-[-15%] left-[-8%] animate-landing-float" delay={1} />
        <GradientOrb size={300} color="primary" className="top-[30%] left-[40%]" delay={2} />
        {/* Layer 6 — Decorative elements */}
        <DecorativeElement type="circle" className="top-[20%] right-[10%] opacity-30" />
        <DecorativeElement type="diamond" className="bottom-[10%] right-[20%] opacity-20" />
        {/* Layer 7 — Premium medical icons floating */}
        <div className="absolute top-[15%] right-[15%] opacity-10 animate-pulse">
          <MedicalCrossIcon className="w-32 h-32 text-brand-primary" />
        </div>
        <div className="absolute bottom-[20%] left-[10%] opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>
          <BeautyIcon className="w-24 h-24 text-brand-secondary" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl">
            <Reveal>
              <p className="text-sm font-semibold text-brand-primary/80 tracking-widest uppercase mb-5">
                Premier Aesthetic Surgery Centre
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-6">
                Transform Your Confidence{" "}
              <span className="text-brand-primary">With Expert Care</span>
            </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-lg text-slate-600 leading-relaxed mb-10 max-w-xl">
                World-class aesthetic surgery and personalized clinical care
                in the heart of Nairobi. Your journey to enhanced confidence begins here.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="bg-brand-primary hover:bg-brand-primary/90 text-white h-12 px-8 shadow-lg shadow-brand-primary/20 hover:shadow-xl hover:shadow-brand-primary/30 transition-all duration-300">
              <Link href="/patient/register">
                  Book Your Consultation
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-300">
                  <Link href="/login">Sign In</Link>
                </Button>
            </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TRUST BAR                                                     */}
      {/* ============================================================ */}
      <section className="relative border-y border-gray-100 bg-gradient-to-r from-white via-brand-isabelline/20 to-white py-12 overflow-hidden">
        <FloatingParticles />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10+", label: "Years of Excellence", icon: Award },
              { value: "5", label: "Board-Certified Surgeons", icon: Users },
              { value: "1,000+", label: "Procedures Performed", icon: CheckCircle },
              { value: "100%", label: "Personalized Care", icon: Heart },
            ].map((stat, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="group relative">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <stat.icon className="w-6 h-6 text-brand-primary/30" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-brand-primary group-hover:scale-110 transition-transform">{stat.value}</div>
                  <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SERVICES                                                      */}
      {/* ============================================================ */}
      <section id="services" className="relative py-20 lg:py-24 overflow-hidden">
        {/* Dot grid + soft radial glow from center */}
        <div className="absolute inset-0 bg-dot-grid-light mask-fade-y" />
        <AnimatedMeshGradient />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-brand-powder/10 rounded-full blur-[120px]" />
        <WavePattern className="bottom-0 opacity-30" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-brand-primary/80 tracking-widest uppercase mb-3">
                What We Offer
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Our Services
            </h2>
              <p className="text-base text-slate-500 mt-4 max-w-xl mx-auto leading-relaxed">
              Comprehensive aesthetic surgery solutions tailored to your unique needs
            </p>
          </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: "Liposuction",
                description: "Body contouring that removes excess fat deposits, creating a smoother, more contoured silhouette for abdomen, hips, thighs, and arms.",
                icon: Activity,
              },
              {
                title: "Brazilian Butt Lift",
                description: "Combines liposuction with fat grafting to enhance the size and shape of the buttocks while contouring other areas.",
                icon: Sparkles,
              },
              {
                title: "Tummy Tuck",
                description: "Removes excess skin and fat from the abdomen while tightening muscles for a flatter, firmer midsection.",
                icon: Scissors,
              },
              {
                title: "Breast Augmentation",
                description: "Personalized breast procedures including augmentation, lift, and reduction to achieve your desired silhouette.",
                icon: Heart,
              },
              {
                title: "Facial Procedures",
                description: "Facelifts, rhinoplasty, blepharoplasty, brow lifts, chin augmentation, and otoplasty to enhance natural features.",
                icon: BeautyIcon,
              },
              {
                title: "Non-Surgical Treatments",
                description: "Botox, dermal fillers, and advanced non-invasive treatments to rejuvenate with minimal downtime.",
                icon: Syringe,
              },
              {
                title: "Scar Management",
                description: "Keloid treatment, scar revision, and advanced wound care to improve the appearance and texture of scars.",
                icon: HeartPulse,
              },
              {
                title: "Reconstructive Surgery",
                description: "Hand surgery, traumatic injury management, congenital differences, and peripheral nerve surgery.",
                icon: Stethoscope,
              },
              {
                title: "Consultations",
                description: "In-depth consultations to understand your goals and develop a customized treatment plan.",
                icon: Award,
              },
            ].map((service, index) => (
              <Reveal key={index} delay={index * 60}>
                <div className="group relative p-6 rounded-xl border border-gray-100/80 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-brand-primary/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <CardGlow />
                  <div className="relative">
                    <div className="mb-4">
                      <ServiceIcon icon={service.icon} />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                      {service.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      {/* ============================================================ */}
      {/* DOCTORS — LAZY LOADED                                         */}
      {/* ============================================================ */}
      <DoctorsSection />

      {/* ============================================================ */}
      {/* ABOUT                                                         */}
      {/* ============================================================ */}
      <section id="about" className="relative py-20 lg:py-24 overflow-hidden">
        {/* Asymmetric glow accent */}
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] bg-brand-isabelline/40 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-dot-grid-light mask-fade-y" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-14 items-start">
            {/* Left — Story */}
            <div>
              <Reveal>
                <p className="text-sm font-semibold text-brand-primary/80 tracking-widest uppercase mb-3">
                  Our Story
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-6">
                  About Nairobi Sculpt
            </h2>
              </Reveal>
              <Reveal delay={100}>
                <div className="space-y-5 text-base text-slate-600 leading-relaxed">
                  <p>
                    Founded in Nairobi, Nairobi Sculpt Aesthetic Centre has been transforming lives through expert plastic surgery and aesthetic treatments since 2010. Our mission is to empower individuals with personalized, high-quality care that enhances natural beauty and boosts confidence.
                  </p>
                  <p>
                    With a team of board-certified surgeons and cutting-edge technology, we&apos;ve become a trusted name in Kenya&apos;s aesthetic industry. Our state-of-the-art facility on 4th Avenue Towers is designed to provide a comfortable environment where every client receives tailored solutions.
                  </p>
                </div>
              </Reveal>
            </div>

            {/* Right — Commitments */}
            <div className="space-y-4">
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
                <Reveal key={i} delay={i * 80}>
                  <div className="group flex items-start gap-4 p-5 rounded-xl border border-gray-100/80 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-brand-primary/15 hover:shadow-md transition-all duration-300">
                    <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-brand-primary/5 flex items-center justify-center group-hover:bg-brand-primary/10 transition-colors">
                      <item.icon className="h-5 w-5 text-brand-primary" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 mb-1">{item.title}</h4>
                      <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* WHY CHOOSE US                                                 */}
      {/* ============================================================ */}
      <section className="relative py-20 lg:py-24 overflow-hidden bg-gradient-to-b from-slate-50/50 via-brand-isabelline/20 to-white">
        <div className="absolute inset-0 bg-crosshatch" />
        <div className="absolute bottom-0 left-[20%] w-[500px] h-[300px] bg-brand-powder/10 rounded-full blur-[100px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                Why Choose Nairobi Sculpt
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              "Board-certified plastic surgeons with years of experience",
              "State-of-the-art facilities and advanced technology",
              "Personalized treatment plans tailored to each patient",
              "Comprehensive pre and post-operative care",
              "Patient-centered approach with privacy and dignity",
              "Commitment to safety and natural outcomes",
            ].map((feature, index) => (
              <Reveal key={index} delay={index * 60}>
                <div className="group flex items-start gap-3.5 p-5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100/80 hover:bg-white hover:border-brand-primary/15 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <CheckCircle className="h-5 w-5 text-brand-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <p className="text-base text-slate-600 leading-relaxed">{feature}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CTA                                                           */}
      {/* ============================================================ */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid-light mask-fade-y" />
        <FloatingParticles />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Reveal>
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-brand-primary via-brand-primary to-[#152d4a]">
              {/* Internal glow accents */}
              <GradientOrb size={288} color="powder" className="top-0 right-0 -translate-y-1/2 translate-x-1/3" />
              <GradientOrb size={224} color="secondary" className="bottom-0 left-0 translate-y-1/2 -translate-x-1/4" delay={1} />
              <div className="absolute inset-0 bg-dot-grid-dark opacity-40" />
              {/* Premium decorative elements */}
              <DecorativeElement type="circle" className="top-[10%] right-[15%] opacity-20" />
              <DecorativeElement type="diamond" className="bottom-[15%] left-[10%] opacity-15" />

              <div className="relative p-10 sm:p-14 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
                  Ready to Begin Your Journey?
                </h2>
                <p className="text-base text-white/70 mb-10 max-w-lg mx-auto leading-relaxed">
                  Schedule your consultation today and take the first step towards the confidence you deserve.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild size="lg" className="bg-white text-brand-primary hover:bg-white/90 h-12 px-8 font-semibold shadow-lg shadow-black/10 hover:shadow-xl transition-all duration-300">
                    <Link href="/patient/register">
                      Book Consultation
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-12 px-8 border-white/30 text-white hover:bg-white/10 transition-all duration-300">
                    <Link href="/login">Sign In</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOOTER                                                        */}
      {/* ============================================================ */}
      <footer className="relative bg-slate-900 text-slate-400 py-14 border-t border-slate-800 overflow-hidden">
        {/* Subtle dot grid on dark */}
        <div className="absolute inset-0 bg-dot-grid-dark opacity-50" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-10 w-10 rounded-lg bg-white/10 p-2 flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Nairobi Sculpt Logo"
                    width={28}
                    height={28}
                    className="h-7 w-auto object-contain brightness-200"
                  />
                </div>
                <div>
                  <span className="font-semibold text-white text-sm block leading-tight">Nairobi Sculpt</span>
                  <span className="text-xs text-slate-500">Aesthetic Centre</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed mt-3">
                Premier aesthetic surgery and clinical management in Nairobi, Kenya.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Quick Links</h4>
              <ul className="space-y-2.5">
                {[
                  { href: "/login", label: "Sign In" },
                  { href: "/patient/register", label: "Register" },
                  { href: "#services", label: "Services" },
                  { href: "#doctors", label: "Our Doctors" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-slate-500 hover:text-white transition-colors">
                      {link.label}
                  </Link>
                </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">4th Avenue Towers, 13th Floor, Fourth Ngong Ave, Nairobi</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span className="text-sm">0759 067388</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span className="text-sm">info@nairobisculpt.co.ke</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-slate-800 pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-xs text-slate-600">
                © {new Date().getFullYear()} Nairobi Sculpt Aesthetic Centre. All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <Link href="#" className="hover:text-slate-400 transition-colors">Terms</Link>
                <span className="text-slate-700">·</span>
                <Link href="#" className="hover:text-slate-400 transition-colors">Privacy</Link>
              </div>
            </div>
            <p className="text-[11px] text-slate-700 text-center mt-5">
              Powered by <span className="font-medium text-slate-600">BKG CONSULTING</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
