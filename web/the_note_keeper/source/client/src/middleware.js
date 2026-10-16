import { NextResponse } from "next/server";
import { isAdminFunc } from "./lib/auth";

export const matcher = ['/(?!api|_next/static|_next/image|favicon.ico).*)'];

export function middleware(request) {
  const url = request.nextUrl.clone();

  console.log('Middleware triggered for URL:', url.pathname);

  if (url.pathname.startsWith('/admin')) {
    const isAdmin = isAdminFunc(request);

    if (!isAdmin) {
      return new NextResponse(`<html><body><h1>Unauthorized</h1><p>You're not admin. Please login</p><!--Request Forbidden by Next.js 15.1.1 Middleware--></body></html>`, {
        status: 401,
        headers: {
          'Content-Type': 'text/html'
        }
      });
    }
  }

  if (url.pathname.startsWith('/api')) {
    return NextResponse.next({
      headers: request.headers //required for api routes for decoding Auth Header
    });
  }

  return NextResponse.next();
}
