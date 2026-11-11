import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import { requirePageSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

function safeNext(value: string | undefined) {
  if (!value || !value.startsWith("/app") || value.startsWith("//") || value.includes("\\\\")) return "/app/cases";
  return value;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await requirePageSession()) redirect("/app/cases");
  const params = await searchParams;
  const nextPath = safeNext(params.next);
  return (
    <main className="login-page">
      <div className="login-card">
        <Link className="brand-word" href="/">Veyra</Link>
        <p className="eyebrow">Local workspace</p>
        <h1>Sign in</h1>
        <p className="body-copy">Use the access code configured for this local Veyra workspace.</p>
        <LoginForm nextPath={nextPath} />
        <p className="login-demo-link"><Link href="/demo">View the public simulated demo</Link></p>
        <p className="caption">This single-workspace sign-in is for the local hackathon demo. It is not a production identity provider.</p>
      </div>
    </main>
  );
}