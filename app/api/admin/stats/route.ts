import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY or URL not configured' }, { status: 500 });
  }

  const supabase = createClient(url, serviceRole);

  try {
    // First try querying a public `users` table (if your project has one)
    let totalUsers: number | null = null;
    try {
      const { data, error, count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: false });

      if (!error) {
        totalUsers = typeof count === 'number' ? count : (Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      console.warn('Querying public.users failed, will try admin API', err);
    }

    // If still null, try using the Admin API to list auth users (v2 SDK)
    if (totalUsers === null) {
      try {
        // @ts-ignore - auth.admin may exist in supabase-js version used
        if (supabase.auth && supabase.auth.admin && typeof supabase.auth.admin.listUsers === 'function') {
          // listUsers returns { data: { users: [...] }, error } in supabase-js v2
          const list = await supabase.auth.admin.listUsers();
          const usersArr = Array.isArray(list?.data?.users) ? list.data.users : [];
          totalUsers = usersArr.length;
        }
      } catch (err) {
        console.warn('Admin API listUsers call failed', err);
      }
    }

    // Final fallback: if still null, return 0
    if (totalUsers === null) totalUsers = 0;

    return NextResponse.json({ totalUsers });
  } catch (err) {
    console.error('Unexpected error in admin stats route:', err);
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 });
  }
}
