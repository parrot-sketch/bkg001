'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle, Users, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";

interface Doctor {
  id: string;
  name: string;
  title?: string;
  specialization: string;
  profile_image?: string;
  bio?: string;
  education?: string;
  focus_areas?: string;
  professional_affiliations?: string;
  clinic_location?: string;
  email?: string;
  phone?: string;
}

export default function Home() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true);
        setDoctorsError(null);

        // Add timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          abortController.abort();
        }, 10000); // 10 second timeout

        const response = await fetch('/api/doctors', {
          signal: abortController.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        // Check if response is ok before parsing
        if (!response.ok) {
          throw new Error(`Failed to fetch doctors: ${response.status} ${response.statusText}`);
        }

        // Check content type before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format from server');
        }

        const result = await response.json();

        if (!isMounted) return;

        if (result.success && result.data) {
          setDoctors(Array.isArray(result.data) ? result.data : []);
        } else {
          setDoctors([]);
          setDoctorsError(result.error || 'Failed to load doctors');
        }
      } catch (error: any) {
        if (!isMounted) return;

        // Ignore abort errors (timeout/user cancellation)
        if (error.name === 'AbortError') {
          console.warn('Doctors fetch aborted');
          setDoctorsError('Request timed out. Please refresh the page.');
        } else {
          console.error('Error fetching doctors:', error);
          setDoctorsError(error.message || 'Failed to load doctors. Please try again later.');
        }
        setDoctors([]);
      } finally {
        if (isMounted) {
          setLoadingDoctors(false);
        }
      }
    };

    fetchDoctors();

    // Cleanup function
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // Get unique specializations for filtering
  const specializations = Array.from(new Set(doctors.map((d) => d.specialization))).sort();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Image
                src="/logo.png"
                alt="Nairobi Sculpt Logo"
                width={40}
                height={40}
                className="h-10 w-auto object-contain"
                priority
              />
              <span className="font-playfair-display text-xl font-bold text-slate-900">Nairobi Sculpt</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="#services" className="text-sm text-gray-600 hover:text-brand-primary transition-colors">
                Services
              </Link>
              <Link href="#doctors" className="text-sm text-gray-600 hover:text-brand-primary transition-colors">
                Our Doctors
              </Link>
              <Link href="#about" className="text-sm text-gray-600 hover:text-brand-primary transition-colors">
                About
              </Link>
              <Link href="/patient/login">
                <Button variant="ghost" size="sm" className="text-slate-900 hover:text-brand-primary">Login</Button>
              </Link>
              <Link href="/patient/register">
                <Button size="sm" className="bg-brand-primary hover:bg-brand-primary/90 text-white">Book Consultation</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-isabelline via-white to-brand-powder/30">
        <div className="absolute inset-0">
          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-brand-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-secondary/10 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-playfair-display text-slate-900 mb-6 leading-tight">
              Transform Your Confidence
              <br />
              <span className="text-brand-primary">With Expert Care</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 mb-8 max-w-2xl mx-auto leading-relaxed">
              Experience world-class aesthetic surgery and clinical management in the heart of Nairobi.
              Your journey to enhanced confidence begins here.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/patient/register">
                <Button size="lg" className="w-full sm:w-auto px-8 bg-brand-primary hover:bg-brand-primary/90 text-white border-0">
                  Book Your Consultation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/patient/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-block mb-4">
              <div className="h-px w-16 bg-brand-primary mx-auto"></div>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-playfair-display text-slate-900 mb-4">
              Our Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Comprehensive aesthetic surgery solutions tailored to your unique needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                number: "01",
                title: "Liposuction",
                description: "Body contouring procedure that removes excess fat deposits from specific areas, creating a smoother, more contoured silhouette. Effective for abdomen, hips, thighs, arms, and more.",
              },
              {
                number: "02",
                title: "Brazilian Butt Lift",
                description: "Combines liposuction with fat grafting to enhance the size and shape of the buttocks while simultaneously contouring other areas, creating a natural hourglass figure.",
              },
              {
                number: "03",
                title: "Tummy Tuck",
                description: "Comprehensive body contouring procedure that removes excess skin and fat from the abdomen while tightening muscles for a flatter, firmer midsection.",
              },
              {
                number: "04",
                title: "Breast Augmentation",
                description: "Enhance your natural curves with personalized breast augmentation procedures, including augmentation, lift, and reduction to achieve your desired silhouette.",
              },
              {
                number: "05",
                title: "Facial Procedures",
                description: "Expert facial rejuvenation including facelifts, rhinoplasty, blepharoplasty, brow lifts, chin augmentation, and otoplasty to enhance your natural features.",
              },
              {
                number: "06",
                title: "Non-Surgical Treatments",
                description: "Advanced non-invasive treatments including Botox and dermal fillers designed to rejuvenate and enhance your appearance with minimal downtime.",
              },
              {
                number: "07",
                title: "Scar Management",
                description: "Comprehensive scar treatment including keloid treatment, scar revision, and advanced wound care to improve the appearance and texture of scars.",
              },
              {
                number: "08",
                title: "Reconstructive Surgery",
                description: "Expert reconstructive procedures including hand surgery, traumatic injury management, congenital differences, and peripheral nerve surgery.",
              },
              {
                number: "09",
                title: "Personalized Consultations",
                description: "In-depth consultations with our experienced surgeons to understand your goals and develop a customized treatment plan tailored to your unique needs.",
              },
            ].map((service, index) => (
              <div
                key={index}
                className="group relative bg-white border border-gray-200/60 hover:border-brand-primary/30 transition-all duration-500 overflow-hidden"
              >
                {/* Subtle background accent on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-isabelline/0 to-brand-powder/0 group-hover:from-brand-isabelline/30 group-hover:to-brand-powder/20 transition-all duration-500"></div>
                
                <div className="relative p-8">
                  {/* Number indicator */}
                  <div className="mb-6">
                    <span className="text-4xl font-playfair-display font-bold text-brand-primary/20 group-hover:text-brand-primary/30 transition-colors duration-500">
                      {service.number}
                    </span>
                  </div>
                  
                  {/* Title with accent line */}
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px w-8 bg-brand-primary/60 group-hover:w-12 transition-all duration-500"></div>
                      <h3 className="text-xl font-semibold text-slate-900 font-playfair-display">
                        {service.title}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block mb-4">
                <div className="h-px w-16 bg-brand-primary mx-auto"></div>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-playfair-display text-slate-900 mb-4">
                About Nairobi Sculpt
              </h2>
            </div>
            
            <div className="bg-white rounded-xl p-8 md:p-12 shadow-sm border border-gray-200/60 mb-12">
              <div className="prose prose-lg max-w-none">
                <h3 className="text-2xl font-semibold font-playfair-display text-slate-900 mb-6">
                  Welcome to Nairobi Sculpt Aesthetic Centre
                </h3>
                <p className="text-gray-700 leading-relaxed mb-6">
                  Founded in the vibrant city of Nairobi, Nairobi Sculpt Aesthetic Centre has been transforming lives through expert plastic surgery and aesthetic treatments since 2010. Our mission is to empower individuals with personalized, high-quality care that enhances natural beauty and boosts confidence. With a team of board-certified surgeons and cutting-edge technology, we've become a trusted name in Kenya's aesthetic industry.
                </p>
                <p className="text-gray-700 leading-relaxed mb-6">
                  At Nairobi Sculpt, we prioritize safety, innovation, and patient satisfaction. Our state-of-the-art facility on 4th Avenue Towers is designed to provide a comfortable environment where every client receives tailored solutions. Whether it's body contouring, facial rejuvenation, or non-surgical enhancements, our experienced surgeons deliver results that reflect your unique vision.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white rounded-xl p-6 border border-gray-200/60 text-center">
                <div className="text-3xl font-bold font-playfair-display text-brand-primary mb-2">10+</div>
                <div className="text-sm text-gray-600">Years of Excellence</div>
                <p className="text-xs text-gray-500 mt-2">Over a decade of excellence in aesthetic surgery</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200/60 text-center">
                <div className="text-3xl font-bold font-playfair-display text-brand-primary mb-2">100%</div>
                <div className="text-sm text-gray-600">Personalized Care</div>
                <p className="text-xs text-gray-500 mt-2">Personalized treatment plans for every client</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200/60 text-center">
                <div className="text-3xl font-bold font-playfair-display text-brand-primary mb-2">✓</div>
                <div className="text-sm text-gray-600">Safety First</div>
                <p className="text-xs text-gray-500 mt-2">Commitment to safety and natural outcomes</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 md:p-12 shadow-sm border border-gray-200/60">
              <h3 className="text-2xl font-semibold font-playfair-display text-slate-900 mb-6">
                Our Commitment to Excellence
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-brand-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Advanced Facilities</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Our Nairobi clinic features state-of-the-art technology for safe and effective procedures.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-brand-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Expert Surgeons</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Board-certified surgeons with over 15 years of combined experience lead our team.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-brand-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Personalized Care</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">We craft bespoke treatment plans to meet your individual aesthetic goals.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-brand-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Comprehensive Aftercare</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Our team provides dedicated support for a smooth and successful recovery.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20">
              <div className="inline-block mb-4">
                <div className="h-px w-16 bg-brand-primary mx-auto"></div>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-playfair-display text-slate-900 mb-4">
                Why Choose Nairobi Sculpt
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                "Board-certified plastic surgeons with years of experience",
                "State-of-the-art facilities and advanced technology",
                "Personalized treatment plans tailored to each patient",
                "Comprehensive pre and post-operative care",
                "Patient-centered approach with privacy and dignity",
                "Commitment to safety and excellence",
              ].map((feature, index) => (
                <div 
                  key={index} 
                  className="group flex items-start gap-4 p-6 bg-slate-50 border border-gray-200/60 hover:border-brand-primary/30 transition-all duration-300"
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary group-hover:scale-150 transition-transform duration-300"></div>
                  </div>
                  <p className="text-gray-700 leading-relaxed flex-1">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Doctors Section */}
      <section id="doctors" className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-block mb-4">
              <div className="h-px w-16 bg-brand-primary mx-auto"></div>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-playfair-display text-slate-900 mb-4">
              Meet Our Expert Surgeons
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Our board-certified surgeons bring years of experience and dedication to helping you achieve your aesthetic goals.
            </p>
          </div>

          {loadingDoctors ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="h-8 w-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-600">Loading our team...</p>
              </div>
            </div>
          ) : doctorsError ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">{doctorsError}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-brand-primary hover:underline"
              >
                Refresh page
              </button>
            </div>
          ) : doctors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {doctors.slice(0, 6).map((doctor) => (
                <div
                  key={doctor.id}
                  className="group bg-white border border-gray-200/60 rounded-xl p-8 hover:border-brand-primary/30 hover:shadow-lg transition-all duration-300 flex flex-col"
                >
                  {/* Doctor Image */}
                  <div className="mb-6 flex justify-center">
                    {doctor.profile_image ? (
                      <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 group-hover:border-brand-primary/20 transition-colors duration-300 bg-gradient-to-br from-gray-50 to-gray-100">
                        <Image
                          src={doctor.profile_image}
                          alt={doctor.name}
                          fill
                          className="object-contain"
                          sizes="128px"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 flex items-center justify-center border-4 border-gray-100 group-hover:border-brand-primary/20 transition-colors duration-300">
                        <Users className="h-16 w-16 text-brand-primary/40" />
                      </div>
                    )}
                  </div>

                  {/* Doctor Info */}
                  <div className="text-center mb-6 flex-grow">
                    <h3 className="text-xl font-semibold font-playfair-display text-slate-900 mb-2">
                      {(() => {
                        // Only add title prefix if name doesn't already start with it
                        if (doctor.title && doctor.name) {
                          const titleLower = doctor.title.toLowerCase().trim();
                          const nameLower = doctor.name.toLowerCase().trim();
                          // Check if name already starts with the title (e.g., "Dr." or "Dr ")
                          if (nameLower.startsWith(titleLower) || nameLower.startsWith(`${titleLower} `)) {
                            return doctor.name;
                          }
                          return `${doctor.title} ${doctor.name}`;
                        }
                        return doctor.name;
                      })()}
                    </h3>
                    <p className="text-brand-primary font-medium mb-4">{doctor.specialization}</p>
                    {doctor.bio && (
                      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{doctor.bio}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 mt-auto">
                    <Link href={`/portal/doctors/${doctor.id}`} className="block">
                      <Button
                        variant="outline"
                        className="w-full border-gray-300 text-slate-900 hover:bg-gray-50 hover:border-gray-400"
                      >
                        View Full Profile
                      </Button>
                    </Link>
                    <Link
                      href={`/patient/register?doctorId=${doctor.id}`}
                      className="block"
                    >
                      <Button className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white">
                        Book Consultation
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Our team information is being updated.</p>
              <p className="text-sm text-gray-400">Please check back soon.</p>
            </div>
          )}

          {doctors.length > 6 && (
            <div className="text-center">
              <Link href="/portal/doctors">
                <Button variant="outline" size="lg" className="border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white">
                  View All Doctors
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-50 border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-playfair-display text-slate-900 mb-6">
              Ready to Begin Your Journey?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Schedule your consultation today and take the first step towards the confidence you deserve.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/patient/register">
                <Button size="lg" className="px-8 bg-brand-primary hover:bg-brand-primary/90 text-white border-0">
                  Book Consultation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/patient/login">
                <Button size="lg" variant="outline" className="px-8 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-300 py-16 border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* Logo & Description */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-white p-2 flex items-center justify-center shadow-lg">
                  <Image
                    src="/logo.png"
                    alt="Nairobi Sculpt Logo"
                    width={32}
                    height={32}
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-white text-lg">NAIROBI SCULPT</span>
                  <span className="text-sm text-gray-400 italic">Aesthetic Centre</span>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-4 leading-relaxed">
                Premier Aesthetic Surgery & Clinical Management System
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-base">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/patient/login" className="text-sm text-gray-400 hover:text-brand-secondary transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/patient/register" className="text-sm text-gray-400 hover:text-brand-secondary transition-colors">
                    Register
                  </Link>
                </li>
                <li>
                  <Link href="#services" className="text-sm text-gray-400 hover:text-brand-secondary transition-colors">
                    Services
                  </Link>
                </li>
                <li>
                  <Link href="#doctors" className="text-sm text-gray-400 hover:text-brand-secondary transition-colors">
                    Our Doctors
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-base">Contact Us</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">📍</span>
                  <span>4th Avenue Towers, 13th Floor, Fourth Ngong Ave, Nairobi</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">📞</span>
                  <span>0759 067388</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✉️</span>
                  <span>info@nairobisculpt.co.ke</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-slate-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-400">
                © {new Date().getFullYear()} Nairobi Sculpt Aesthetic Centre. All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <Link href="#" className="hover:text-brand-secondary transition-colors">
                  Terms & Conditions
                </Link>
                <span>•</span>
                <Link href="#" className="hover:text-brand-secondary transition-colors">
                  Privacy Policy
                </Link>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-800">
              <p className="text-xs text-gray-500 text-center">
                Powered by{' '}
                <span className="font-semibold text-gray-400">BKG CONSULTING</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
