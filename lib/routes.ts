/**
 * Route Access Configuration
 * 
 * Defines which roles can access which route patterns.
 * Uses regex patterns to match routes.
 */
type RouteAccessProps = {
  [key: string]: string[];
};

export const routeAccess: RouteAccessProps = {
  // Admin routes
  "/admin(.*)": ["admin"],
  
  // Patient routes
  "/patient(.*)": ["patient", "admin", "doctor", "nurse"],
  
  // Doctor routes
  "/doctor(.*)": ["doctor", "admin"],
  
  // Frontdesk routes
  "/frontdesk(.*)": ["frontdesk", "admin"],
  
  // Nurse routes
  "/nurse(.*)": ["nurse", "admin"],
  
  // Staff routes (lab tech, cashier, etc.)
  "/staff(.*)": ["nurse", "lab_technician", "cashier"],
};

// import { createRouteMatcher } from "@clerk/nextjs/server";

// export const routeMatchers = {
//   admin: createRouteMatcher([
//     "/admin(.*)",
//     "/patient(.*)",
//     "/record/users",
//     "/record/doctors(.*)",
//     "/record/patients",
//     "/record/doctors",
//     "/record/staffs",
//     "/record/patients",
//   ]),
//   patient: createRouteMatcher(["/patient(.*)", "/patient/registrations"]),

//   doctor: createRouteMatcher([
//     "/doctor(.*)",
//     "/record/doctors(.*)",
//     "/record/patients",
//     "/patient(.*)",
//     "/record/staffs",
//     "/record/patients",
//   ]),
// };
