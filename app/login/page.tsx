import { redirect } from "next/navigation";

export const metadata = {
  title: "Log in | AI Foundry"
};

export default function LoginAliasPage() {
  redirect("/auth/login");
}
