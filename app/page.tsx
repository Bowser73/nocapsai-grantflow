import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Root page — redirect to dashboard if logged in, otherwise to login.
 */
export default async function Home() {
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/auth/login");
  }
}
