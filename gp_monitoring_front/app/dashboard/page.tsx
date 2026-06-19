import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { TOKEN_COOKIE, USER_COOKIE, isTokenExpired } from "@/lib/api";
import { User } from "@/lib/types";

export default function DashboardPage() {
  const cookieStore = cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;

  if (!token || isTokenExpired(token)) {
    redirect("/");
  }

  const user = parseUser(cookieStore.get(USER_COOKIE)?.value);

  return <Dashboard initialUser={user} />;
}

function parseUser(value?: string): User | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as User;
  } catch {
    return null;
  }
}
