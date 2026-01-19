import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Heart, Shield, Users, ArrowRight, CheckCircle, Activity } from "lucide-react";

export default function Home() {

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-teal-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">NS</span>
              </div>
              <span className="font-playfair-display text-xl font-bold text-slate-900">Nairobi Sculpt</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="#services" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                Services
              </Link>
              <Link href="#doctors" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                Our Doctors
              </Link>
              <Link href="#about" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
                About
              </Link>
              <Link href="/patient/login">
                <Button variant="ghost" size="sm" className="text-slate-900 hover:text-teal-600">Patient Login</Button>
              </Link>
              <Link href="/patient/register">
                <Button size="sm" className="bg-teal-500 hover:bg-teal-600 text-white">Book Consultation</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-teal-50">
        <div className="absolute inset-0"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-playfair-display text-slate-900 mb-6 leading-tight">
              Transform Your Confidence
              <br />
              <span className="text-teal-600">With Expert Care</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 mb-8 max-w-2xl mx-auto leading-relaxed">
              Experience world-class aesthetic surgery and clinical management in the heart of Nairobi.
              Your journey to enhanced confidence begins here.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/patient/register">
                <Button size="lg" className="w-full sm:w-auto px-8 bg-teal-500 hover:bg-teal-600 text-white border-0">
                  Book Your Consultation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/patient/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white">
                  Patient Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-playfair-display text-slate-900 mb-4">
              Our Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive aesthetic surgery solutions tailored to your unique needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Heart,
                title: "Cosmetic Surgery",
                description: "Expert cosmetic procedures for natural-looking enhancements",
              },
              {
                icon: Activity,
                title: "Aesthetic Treatments",
                description: "Advanced non-invasive and minimally invasive treatments",
              },
              {
                icon: Shield,
                title: "Reconstructive Surgery",
                description: "Comprehensive reconstructive procedures with precision care",
              },
              {
                icon: Users,
                title: "Consultations",
                description: "Personalized consultations with our experienced surgeons",
              },
              {
                icon: Calendar,
                title: "Follow-up Care",
                description: "Dedicated post-operative care and monitoring",
              },
              {
                icon: CheckCircle,
                title: "Patient Support",
                description: "Comprehensive support throughout your journey",
              },
            ].map((service, index) => (
              <div
                key={index}
                className="p-6 rounded-lg border border-gray-200 hover:border-teal-400 transition-all duration-300 hover:shadow-lg bg-white"
              >
                <div className="h-12 w-12 rounded-lg bg-teal-500 flex items-center justify-center mb-4">
                  <service.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-playfair-display text-slate-900 mb-4">
                Why Choose Nairobi Sculpt
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                "Board-certified plastic surgeons with years of experience",
                "State-of-the-art facilities and advanced technology",
                "Personalized treatment plans tailored to each patient",
                "Comprehensive pre and post-operative care",
                "Patient-centered approach with privacy and dignity",
                "Commitment to safety and excellence",
              ].map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-teal-500 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-600">{feature}</p>
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
                <Button size="lg" className="px-8 bg-teal-500 hover:bg-teal-600 text-white border-0">
                  Book Consultation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/patient/login">
                <Button size="lg" variant="outline" className="px-8 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white">
                  Existing Patient Login
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
                <div className="h-12 w-12 rounded-lg bg-teal-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">NS</span>
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
                  <Link href="/patient/login" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">
                    Patient Login
                  </Link>
                </li>
                <li>
                  <Link href="/patient/register" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">
                    Register
                  </Link>
                </li>
                <li>
                  <Link href="#services" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">
                    Services
                  </Link>
                </li>
                <li>
                  <Link href="#doctors" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">
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
                <Link href="#" className="hover:text-teal-400 transition-colors">
                  Terms & Conditions
                </Link>
                <span>•</span>
                <Link href="#" className="hover:text-teal-400 transition-colors">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
