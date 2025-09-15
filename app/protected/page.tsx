import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
// import { FetchDataSteps } from "@/components/tutorial/fetch-data-steps";
import { MainLayout } from '@/components/layout/MainLayout';
import { AppProvider } from '@/contexts/AppContext';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
