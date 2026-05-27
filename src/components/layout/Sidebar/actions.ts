'use server';

import { cookies } from 'next/headers';

export async function toggleSidebarAction(collapsed: boolean) {
  const cookieStore = await cookies();
  cookieStore.set('sidebar-collapsed', String(collapsed), {
    path: '/',
    maxAge: 31536000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
}
