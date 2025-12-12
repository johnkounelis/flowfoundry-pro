import { auth } from "./auth-config";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}
