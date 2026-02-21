import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/auth/sign-in", "/auth/sign-up"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith("/api/"),
  );

  const hasGuestCookie =
    !!request.cookies.get("nourishme_guest") ||
    !!request.cookies.get("nourishme_guest_id");

  if (!user && !isPublic) {
    if (!hasGuestCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/sign-in";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  const isAuthed = !!user || hasGuestCookie;

  if (isAuthed) {
    let onboardingDone = !!request.cookies.get("nourishme_onboarding_complete");
    let pantryDone = !!request.cookies.get("nourishme_pantry_complete");

    // For authenticated users, check DB if cookies are missing (e.g. returning user after sign-in)
    if (user) {
      if (!onboardingDone) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("zip_code")
          .eq("user_id", user.id)
          .single();
        const hasOnboardingInDb = !!profile?.zip_code?.match(/^\d{5}$/);
        if (hasOnboardingInDb) {
          onboardingDone = true;
          supabaseResponse.cookies.set("nourishme_onboarding_complete", "true", {
            path: "/",
            maxAge: 31536000,
          });
        }
      }
      if (!pantryDone) {
        const { data: budget } = await supabase
          .from("budgets")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (budget) {
          pantryDone = true;
          supabaseResponse.cookies.set("nourishme_pantry_complete", "true", {
            path: "/",
            maxAge: 31536000,
          });
        }
      }
    }

    if ((pathname === "/dashboard" || pathname === "/pantry") && !onboardingDone) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    if (pathname === "/dashboard" && onboardingDone && !pantryDone) {
      const url = request.nextUrl.clone();
      url.pathname = "/pantry";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
