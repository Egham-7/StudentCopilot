import { Outlet, useNavigate } from 'react-router-dom';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";


const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key');
}


export default function RootLayout() {
  const navigate = useNavigate();
  const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

  return (
    <ClerkProvider
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      signUpForceRedirectUrl={import.meta.env.VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL}
      signInForceRedirectUrl={import.meta.env.VITE_CLERK_SIGN_UP_FORCE_REDIRECT_URL}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <Outlet />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

