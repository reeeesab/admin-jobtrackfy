import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminSessionToken, getAdminSessionCookieName, getAuthenticatedAdminUser, hasAnyAdminUser, validateAdminCredentials } from '@/lib/adminAuth';

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getAuthenticatedAdminUser();
  if (user) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const invalid = params?.error === 'invalid';
  const missingConfig = params?.error === 'config';

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin Login</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Sign in to access the JobTrackfy admin dashboard.</p>

        {invalid && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">Invalid username or password.</p>
        )}
        {missingConfig && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">Admin users are not configured in environment variables.</p>
        )}

        <form action={loginAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 transition"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}

async function loginAction(formData: FormData) {
  'use server';

  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');

  if (!username || !password) {
    redirect('/?error=invalid');
  }

  if (!(await hasAnyAdminUser())) {
    redirect('/?error=config');
  }

  if (!(await validateAdminCredentials(username, password))) {
    redirect('/?error=invalid');
  }

  const cookieStore = await cookies();
  cookieStore.set(getAdminSessionCookieName(), createAdminSessionToken(username), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  redirect('/dashboard');
}
