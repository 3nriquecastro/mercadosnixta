import Link from "next/link"
import { MailCheck } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"

export default function SignUpSuccessPage() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex flex-col items-center gap-3">
          <BrandMark />
        </div>
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-xl font-semibold">Revisa tu correo</h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            Te enviamos un enlace de confirmación. Ábrelo para activar tu cuenta y comenzar a vender.
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
