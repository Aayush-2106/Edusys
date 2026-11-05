import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--brand)] text-sm font-bold text-[var(--brand-ink)]">
            E
          </span>
          <span className="text-lg font-bold tracking-tight">Edusys</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            {user.role === "admin" && (
              <>
                <Link
                  href="/admin"
                  className="text-sm font-semibold text-[var(--brand)]"
                >
                  Placement cell
                </Link>
                <Link href="/dashboard" className="text-sm font-semibold">
                  My practice
                </Link>
              </>
            )}
            <span className="hidden text-sm text-[var(--muted)] sm:inline">
              {user.name}
            </span>
            <LogoutButton />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-secondary">
              Sign in
            </Link>
            <Link href="/register" className="btn btn-primary">
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
