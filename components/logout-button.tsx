"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ButtonProps } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useApp } from "@/contexts/AppContext";

let isLoggingOut = false;

export function LogoutButton({ children, ...props }: ButtonProps) {
  const { clearAllData } = useApp();

  const logout = async () => {
    if (isLoggingOut) return;
    isLoggingOut = true;
    
    console.log('🚪 Redirecting to login first...');
    window.location.href = '/auth/login';
    
    // Clear sessions after redirect
    setTimeout(async () => {
      try {
        const supabase = createClient();
        clearAllData();
        await supabase.auth.signOut({ scope: 'global' });
        
        const cookiesToClear = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token', 'supabase.auth.token'];
        cookiesToClear.forEach(cookieName => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        console.error('❌ Session cleanup error:', error);
      }
    }, 100);
  };

  return <Button onClick={logout} {...props}>{children || "Logout"}</Button>;
}
