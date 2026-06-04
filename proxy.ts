// Whitelist level 2: protect all /sales routes — unauthenticated requests
// are redirected to the configured sign-in page by Auth.js.
// (Next.js 16 renamed the "middleware" file convention to "proxy".)
export { auth as proxy } from "@/auth";

export const config = { matcher: ["/sales/:path*"] };
