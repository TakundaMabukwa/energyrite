"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ButtonProps } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useApp } from "@/contexts/AppContext";

export function LogoutButton({ children, ...props }: ButtonProps) {
  const { signOut } = useUser();
  const { clearAllData } = useApp();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    
    try {
      console.log('🚪 Starting logout process...');
      
      // Clear local app state immediately so protected UI disappears.
      clearAllData();
      
      // Use the shared auth sign-out flow from context.
      await signOut();
      
      // Clear browser storage in case stale state survives refreshes.
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
      
      router.replace('/auth/login');
      router.refresh();
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      router.replace('/auth/login');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return <Button onClick={logout} disabled={isLoggingOut} {...props}>{children || "Logout"}</Button>;
}
