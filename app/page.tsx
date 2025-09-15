import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ConnectSupabaseSteps } from "@/components/tutorial/connect-supabase-steps";
import { SignUpUserSteps } from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  // Check if user is already authenticated
  if (hasEnvVars) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // User is already logged in, redirect to protected dashboard
      redirect("/protected");
    }
  }
  return (
    <main className="flex flex-col items-center min-h-screen">
      <div className="flex flex-col flex-1 items-center gap-20 w-full">
        <nav className="flex justify-center border-b border-b-foreground/10 w-full h-16">
          <div className="flex justify-between items-center p-3 px-5 w-full max-w-5xl text-sm">
            <div className="flex items-center gap-5 font-semibold">
              <Link href={"/"}>Next.js Supabase Starter</Link>
              <div className="flex items-center gap-2">
                <DeployButton />
              </div>
            </div>
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </nav>
        <div className="flex flex-col flex-1 gap-20 p-5 max-w-5xl">
          <Hero />
          <main className="flex flex-col flex-1 gap-6 px-4">
            <h2 className="mb-4 font-medium text-xl">Next steps</h2>
            {hasEnvVars ? <SignUpUserSteps /> : <ConnectSupabaseSteps />}
          </main>
        </div>

        <footer className="flex justify-center items-center gap-8 mx-auto py-16 border-t w-full text-xs text-center">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
