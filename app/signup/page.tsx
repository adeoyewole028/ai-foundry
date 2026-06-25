import { redirect } from "next/navigation";

export const metadata = {
  title: "Create account | AI Foundry"
};

export default function SignupAliasPage() {
  redirect("/auth/signup");
}
