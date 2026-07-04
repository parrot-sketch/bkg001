'use client';

export function SectionBackground({
  children,
  className,
  overlayOpacity = 0.85,
  imageOpacity = 0.12,
}: {
  children: React.ReactNode;
  className?: string;
  overlayOpacity?: number;
  imageOpacity?: number;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl ${className ?? ''}`}>
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.webp')", opacity: imageOpacity }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#e7d6bf]" aria-hidden="true" style={{ opacity: overlayOpacity }} />
      <div className="relative">{children}</div>
    </div>
  );
}
