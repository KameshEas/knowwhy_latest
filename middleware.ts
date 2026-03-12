export { auth as middleware } from "./auth"

export const config = {
  // Guard EVERY route except NextAuth handlers, public webhooks, static assets,
  // and the login page. /api/* is now INCLUDED so any new route that forgets
  // to call auth() is blocked at the edge as a defence-in-depth fallback.
  // Webhook endpoints and OAuth callbacks perform their own signature/token
  // verification and must remain publicly reachable.
  matcher: [
    "/((?!api/auth|api/webhooks|_next/static|_next/image|favicon.ico|login).*)",
  ],
}