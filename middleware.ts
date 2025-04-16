import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from './utils/supabase/middleware';
import { redirect } from 'next/navigation';

export async function middleware(request: NextRequest) {
    const res = NextResponse.next()
    const supabase = createClient(request);
    const {data} = await supabase.auth.getSession();
    console.log({data})
    if (data.session?.user) {
        redirect('/auth/login')
    }
    return res;
}

export const config = {
  matcher: [
    '/studio',
  ],
};