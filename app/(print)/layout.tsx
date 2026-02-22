/**
 * Minimal layout for standalone print views — no sidebar, no shell.
 * The root app/layout.tsx still provides <html><body>.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
