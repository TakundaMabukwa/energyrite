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
  const router = useRouter();

  const logout = async () => {
    if (isLoggingOut) return;
    isLoggingOut = true;
    
    try {
      console.log('🚪 Starting logout process...');
      
      // Clear app data first
      clearAllData();
      
      // Sign out from Supabase
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies
      const cookiesToClear = [
        'sb-access-token', 
        'sb-refresh-token', 
        'supabase-auth-token', 
        'supabase.auth.token',
        'sb-jbactgkcijnkjpyqqzxv-auth-token'
      ];
      
      cookiesToClear.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.energyrite.online`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
      
      console.log('✅ Logout completed, redirecting...');
      
      // Force redirect to login
      window.location.replace('/auth/login');
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Force redirect even on error
      window.location.replace('/auth/login');
    } finally {
      isLoggingOut = false;
    }
  };

  return <Button onClick={logout} {...props}>{children || "Logout"}</Button>;
}
