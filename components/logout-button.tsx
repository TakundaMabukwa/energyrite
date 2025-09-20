"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ButtonProps } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useApp } from "@/contexts/AppContext";

export function LogoutButton({ children, ...props }: ButtonProps) {
  const router = useRouter();
  const { signOut } = useUser();
  const { clearAllData } = useApp();

  const logout = async () => {
    try {
      console.log('🚪 Starting logout process...');
      
      // Clear AppContext data first
      clearAllData();
      
      // Use the signOut function from UserContext which handles state cleanup
      await signOut();
      
      console.log('✅ Logout successful, clearing cookies and redirecting...');
      
      // Clear all cookies to ensure clean logout
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      // Add a small delay to ensure cookies are cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force a hard redirect to ensure the page reloads and middleware sees no user
      window.location.href = "/auth/login";
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Clear AppContext data even if logout fails
      clearAllData();
      
      // Clear cookies even if logout fails
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      // Fallback: try direct Supabase logout
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
        
        // Add delay before redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        window.location.href = "/auth/login";
      } catch (fallbackError) {
        console.error('❌ Fallback logout also failed:', fallbackError);
        // Force redirect even if logout fails
        window.location.href = "/auth/login";
      }
    }
  };

  return <Button onClick={logout} {...props}>{children || "Logout"}</Button>;
}
