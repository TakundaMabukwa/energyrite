import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
// import { FetchDataSteps } from "@/components/tutorial/fetch-data-steps";
import { MainLayout } from '@/components/layout/MainLayout';
import { AppProvider } from '@/contexts/AppContext';
import { UserProvider } from '@/contexts/UserContext';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <UserProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </UserProvider>
  );
}
