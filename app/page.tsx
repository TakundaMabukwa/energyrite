import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

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
  
  // Redirect to login page as the default landing page
  redirect("/auth/login");
}
