import { UpdatePasswordForm } from "@/components/update-password-form";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function Page() {
  // Check if user is authenticated and has first_login=true
  if (hasEnvVars) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // User is not authenticated, redirect to login
      redirect("/auth/login");
    } else {
      // Check if this is a first login
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('first_login')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.first_login) {
        // Not a first login or error occurred, redirect to protected dashboard
        redirect("/protected");
      }
    }
  }
  return (
    <div 
      className="relative flex justify-center items-center p-6 md:p-10 w-full min-h-svh"
      style={{
        backgroundImage: `url('https://energyrite.co.za/wp-content/uploads/energyrite-creative-ideas-for-saving-money-innovation-busin-2022-11-16-17-03-21-utc.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/50"></div>
      
      {/* Update password form with relative positioning to appear above overlay */}
      <div className="z-10 relative w-full max-w-sm">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
