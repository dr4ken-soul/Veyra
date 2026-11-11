import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { requirePageSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requirePageSession();
  if (!session) redirect("/login?next=%2Fapp%2Fcases");
  return <AppShell>{children}</AppShell>;
}