import Link from "next/link"
import { AlertTriangle } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm text-center">
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-xl font-semibold">Algo salió mal</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No pudimos completar la autenticación. Intenta de nuevo.
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block text-sm font-medium text-foreground underline underline-offset-4"
          >
            Volver a entrar
          </Link>
        </div>
      </div>
    </main>
  )
}
