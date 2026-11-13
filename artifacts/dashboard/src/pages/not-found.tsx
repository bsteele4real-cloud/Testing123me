import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That address is not part of Mission Control.
        </p>
        <Link href="/" className="inline-block mt-4 text-sm underline">
          Back to Mission Control
        </Link>
      </div>
    </div>
  );
}
