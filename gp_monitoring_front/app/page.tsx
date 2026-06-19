import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/login-panel";
import { TOKEN_COOKIE, isTokenExpired } from "@/lib/api";

export default function HomePage() {
  const token = cookies().get(TOKEN_COOKIE)?.value;

  if (token && !isTokenExpired(token)) {
    redirect("/dashboard");
  }

  return <LoginPanel />;
}
