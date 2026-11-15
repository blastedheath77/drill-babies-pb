import Link from 'next/link';

/** Inline "not found" for client-loaded pages (calling notFound() after load crashes the app). */
export function NotFoundMessage({ what, backHref, backLabel }: { what: string; backHref: string; backLabel: string }) {
  return (
    <div className="max-w-md mx-auto text-center py-16 space-y-3">
      <h1 className="text-xl font-semibold">{what} not found</h1>
      <p className="text-muted-foreground">It may have been deleted.</p>
      <Link href={backHref} className="text-primary font-medium">
        {backLabel}
      </Link>
    </div>
  );
}
