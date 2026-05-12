"use client";

function friendlyMessage(message: string) {
  if (message.includes('"code"') && message.includes('"path"')) return "Some fields need attention. Please review the form and try again.";
  if (message.length > 180) return "Something went wrong while processing your request. Please review the form and try again.";
  return message;
}

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const message = friendlyMessage(error.message);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-lg border border-white/80 bg-white p-6 shadow-xl shadow-slate-300/40">
        <p className="text-xs font-bold uppercase tracking-widest text-red-700">Something needs attention</p>
        <h1 className="mt-2 font-headline text-2xl font-extrabold text-slate-950">{message}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">No data was changed unless the previous action completed successfully.</p>
        <button onClick={reset} className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-700">Try again</button>
      </div>
    </main>
  );
}
