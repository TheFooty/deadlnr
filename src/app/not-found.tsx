import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#08090a] text-white/95 flex flex-col items-center justify-center p-6">
      <p className="text-7xl font-medium font-display text-[#828fff] mb-4">404</p>
      <h1 className="text-xl font-medium text-white font-display mb-2">Page not found</h1>
      <p className="text-sm text-white/55 max-w-xs text-center mb-8">
        That page doesn&apos;t exist. Your deadlines, however, still do.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-[#5e6ad2] hover:bg-[#5e6ad2]/90 px-5 py-2.5 text-sm font-medium text-white transition-colors font-display"
      >
        Back to Deck
      </Link>
    </div>
  );
}
