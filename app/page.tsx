import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle } from "lucide-react";

export default function Home() {

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Image
                src="https://res.cloudinary.com/dcngzaxlv/image/upload/v1768807323/logo_tw2voz.png"
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
                title: "Cosmetic Surgery",
                description: "Expert cosmetic procedures for natural-looking enhancements that restore and enhance your natural beauty with precision and artistry.",
              },
              {
                number: "02",
                title: "Aesthetic Treatments",
                description: "Advanced non-invasive and minimally invasive treatments designed to rejuvenate and enhance your appearance with minimal downtime.",
              },
              {
                number: "03",
                title: "Reconstructive Surgery",
                description: "Comprehensive reconstructive procedures with precision care, restoring form and function with the highest standards of excellence.",
              },
              {
                number: "04",
                title: "Personalized Consultations",
                description: "In-depth consultations with our experienced surgeons to understand your goals and develop a customized treatment plan.",
              },
              {
                number: "05",
                title: "Follow-up Care",
                description: "Dedicated post-operative care and monitoring to ensure optimal healing and the best possible outcomes for your procedure.",
              },
              {
                number: "06",
                title: "Patient Support",
                description: "Comprehensive support throughout your entire journey, from initial consultation through recovery and beyond.",
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

      {/* Why Choose Us Section */}
      <section className="py-24 bg-slate-50">
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
                  className="group flex items-start gap-4 p-6 bg-white border border-gray-200/60 hover:border-brand-primary/30 transition-all duration-300"
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
                    src="https://res.cloudinary.com/dcngzaxlv/image/upload/v1768807323/logo_tw2voz.png"
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
