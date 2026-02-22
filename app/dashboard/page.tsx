import { redirect } from 'next/navigation';
import AdminDashboard from '@/app/components/AdminDashboard';
import { getAuthenticatedAdminUser } from '@/lib/adminAuth';

export default async function DashboardPage() {
  const user = await getAuthenticatedAdminUser();
  if (!user) {
    redirect('/');
  }

  return <AdminDashboard />;
}

