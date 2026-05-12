import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="max-w-md rounded-xl bg-surface-container-lowest p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Not Found</p>
        <h1 className="mt-2 font-headline text-2xl font-extrabold text-primary">That record is not available.</h1>
        <Link href="/dashboard" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Dashboard</Link>
      </div>
    </main>
  );
}
