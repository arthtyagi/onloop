import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session/constants";
import { HomePage } from "../home-page";

export const metadata: Metadata = {
  title: "App",
  description: "onloop dashboard",
};

export default async function AppPage() {
  const store = await cookies();
  const hasSessionCookie = Boolean(store.get(SESSION_COOKIE_NAME)?.value);

  return <HomePage hasSessionCookie={hasSessionCookie} lastRepo={null} />;
}
