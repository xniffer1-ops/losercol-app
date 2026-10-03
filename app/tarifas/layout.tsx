import { requirePagePermiso } from "@/src/lib/page-auth";
import type { ReactNode } from "react";

export default async function Layout({ children }: { children: ReactNode }) {
  await requirePagePermiso("tarifas", "ver");
  return children;
}
