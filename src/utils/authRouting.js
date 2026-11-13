const PUBLIC_ROUTES = new Set(["/signin", "/reset-password", "/terms", "/privacy", "/community-guidelines", "/confirm-email", "/account-suspended"]);

// Marketplace browsing paths a guest can open without an account
// (App Store Review Guideline 5.1.1).
const GUEST_BROWSING_ROUTES = new Set([
  "/",
  "/home",
  "/search",
  "/featured",
  "/community-impact",
  "/grolo-statuses",
  "/seller-statuses",
  "/comments",
  "/cart",
]);

const GUEST_BROWSING_PREFIXES = [
  "/product/",
  "/listing/",
  "/category/",
  "/seller/",
  "/profile/",
  "/event/",
  "/post/",
  "/promotion/",
  "/promotions/",
  "/founding-member/",
];

export function isGuestBrowsablePath(pathname) {
  if (!pathname) return false;
  if (PUBLIC_ROUTES.has(pathname) || GUEST_BROWSING_ROUTES.has(pathname)) return true;
  return GUEST_BROWSING_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function authRouteDecision({
  authInitialized,
  loading,
  session,
  emailVerified,
  profileStatus,
  onboardingComplete,
  acceptedTerms = true,
  pathname,
  pendingVerificationEmail = "",
  allowSignup = false,
}) {
  const waiting = !authInitialized || loading || profileStatus === "loading" || profileStatus === "unknown";
  if (waiting) return { waiting: true, redirectTo: null, decision: "wait-for-auth-initialization" };

  if (!session) {
    const canShowVerification = pathname === "/verify-email" && Boolean(pendingVerificationEmail);
    const canShowSignup = pathname === "/signup" && allowSignup;
    if (!isGuestBrowsablePath(pathname) && !canShowVerification && !canShowSignup) {
      const redirectTo = pendingVerificationEmail ? "/verify-email" : "/signin";
      return {
        waiting: false,
        redirectTo,
        decision: pendingVerificationEmail ? "redirect-pending-verification-to-verify-email" : "redirect-signed-out-to-signin",
      };
    }
    return { waiting: false, redirectTo: null, decision: "render-public-route" };
  }

  if (!emailVerified && pathname !== "/verify-email" && pathname !== "/confirm-email") {
    return { waiting: false, redirectTo: "/verify-email", decision: "redirect-unverified-to-verify-email" };
  }

  if (emailVerified && !acceptedTerms && !["/terms-acceptance", "/terms", "/privacy", "/community-guidelines"].includes(pathname)) {
    return { waiting: false, redirectTo: "/terms-acceptance", decision: "redirect-to-terms-acceptance" };
  }

  if (emailVerified && (pathname === "/signin" || pathname === "/signup")) {
    const redirectTo = onboardingComplete ? "/" : "/onboarding";
    return {
      waiting: false,
      redirectTo,
      decision: onboardingComplete ? "redirect-complete-user-to-home" : "redirect-incomplete-user-to-onboarding",
    };
  }

  return { waiting: false, redirectTo: null, decision: "render-authenticated-route" };
}
