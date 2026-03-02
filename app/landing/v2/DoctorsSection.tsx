'use client';

/**
 * Doctors Section — Lazy Loading
 * 
 * This component only fetches doctors when it comes into view.
 * Prevents unnecessary API calls and database errors on initial page load.
 */

import { useEffect, useRef, useState, ReactNode } from 'react';
import { useDoctors } from '@/hooks/doctors/useDoctors';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  title?: string;
  specialization: string;
  profile_image?: string;
  bio?: string;
}

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

/**
 * Lazy-loaded doctors section
 * Only fetches data when this component comes into viewport
 */
export function DoctorsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [shouldFetch, setShouldFetch] = useState(false);
  
  // Only enable the hook when section is visible
  const { data: doctors = [], isLoading: loadingDoctors, error: doctorsError } = useDoctors(shouldFetch);

  // Intersection observer to detect when section comes into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || shouldFetch) return; // Don't re-observe if already fetching

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldFetch(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldFetch]);

  return (
    <section 
      ref={sectionRef}
      id="doctors" 
      className="relative py-20 lg:py-24 overflow-hidden bg-gradient-to-b from-brand-isabelline/30 via-slate-50/60 to-white"
    >
      {/* Cross-hatch texture + offset glow */}
      <div className="absolute inset-0 bg-crosshatch" />
      <div className="absolute top-0 right-[-10%] w-[500px] h-[400px] bg-brand-powder/15 rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <Reveal>
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-brand-primary/80 tracking-widest uppercase mb-3">
              Our Team
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Meet Our Expert Surgeons
            </h2>
            <p className="text-base text-slate-500 mt-4 max-w-xl mx-auto leading-relaxed">
              Board-certified surgeons with decades of combined experience dedicated to your aesthetic goals.
            </p>
          </div>
        </Reveal>

        {!shouldFetch ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-sm text-slate-500">Doctors section will load when you scroll here</p>
            </div>
          </div>
        ) : loadingDoctors ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="h-8 w-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-500">Loading our team...</p>
            </div>
          </div>
        ) : doctorsError ? (
          <div className="text-center py-12">
            <Users className="h-14 w-14 text-slate-300 mx-auto mb-4" />
            <p className="text-sm text-slate-500 mb-4">
              Unable to load doctors at this time. Please try again later.
            </p>
            <button 
              onClick={() => {
                setShouldFetch(false);
                setTimeout(() => setShouldFetch(true), 300);
              }}
              className="text-sm text-brand-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : doctors.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.slice(0, 6).map((doctor: Doctor, idx: number) => (
                <Reveal key={doctor.id} delay={idx * 80}>
                  <div className="group bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100/80 hover:bg-white hover:border-brand-primary/20 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full">
                    <div className="p-6 flex-1">
                      {/* Avatar + Name */}
                      <div className="flex items-center gap-4 mb-4">
                        {doctor.profile_image ? (
                          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-100 group-hover:border-brand-primary/20 transition-all duration-300 flex-shrink-0">
                            <Image
                              src={doctor.profile_image}
                              alt={doctor.name}
                              fill
                              className="object-contain"
                              sizes="64px"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-brand-primary/5 flex items-center justify-center border-2 border-slate-100 group-hover:border-brand-primary/20 transition-all duration-300 flex-shrink-0">
                            <Users className="h-7 w-7 text-brand-primary/40" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-slate-900 truncate">
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
                          <p className="text-sm text-brand-primary font-medium truncate">{doctor.specialization}</p>
                        </div>
                      </div>

                      {/* Bio */}
                      {doctor.bio && (
                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{doctor.bio}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="px-6 pb-5 pt-0 flex gap-2.5">
                      <Button asChild variant="outline" size="sm" className="flex-1 h-10 text-sm">
                        <Link href={`/portal/doctors/${doctor.id}`}>View Profile</Link>
                      </Button>
                      <Button asChild size="sm" className="flex-1 h-10 text-sm bg-brand-primary hover:bg-brand-primary/90 text-white">
                        <Link href={`/patient/register?doctorId=${doctor.id}`}>
                          Book
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {doctors.length > 6 && (
              <Reveal>
                <div className="text-center mt-10">
                  <Button asChild variant="outline" size="lg" className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all">
                    <Link href="/portal/doctors">
                      View All Doctors
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </Reveal>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Users className="h-14 w-14 text-slate-300 mx-auto mb-4" />
            <p className="text-base text-slate-500">Our team information is being updated.</p>
          </div>
        )}
      </div>
    </section>
  );
}
