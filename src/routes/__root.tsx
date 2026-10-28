import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart";
import { Toaster } from "@/components/ui/sonner";
import { getInitialTheme, applyTheme } from "@/lib/theme";
import { registerServiceWorker } from "@/lib/pwa";
import { UniversalRoleBar } from "@/components/universal-role-bar";
import { CustomerMobileNav } from "@/components/customer/customer-mobile-nav";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error: caughtError, reset }: { error: unknown; reset: () => void }) {
  const error = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        {error?.message && (
          <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive font-mono break-all text-start max-h-32 overflow-y-auto">
            {error.message}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FOODHUB | أسرع توصيل بأقل سعر | FAST. FRESH. AFFORDABLE." },
      { name: "description", content: "FOODHUB — أسرع توصيل طعام بأقل سعر في المملكة | Fastest delivery at the lowest rates" },
      { name: "author", content: "FoodHub" },
      { property: "og:title", content: "FOODHUB | أسرع توصيل بأقل سعر" },
      { property: "og:description", content: "أسرع توصيل طعام بأقل سعر في المملكة. وجبات طازجة ومطابخ سحابية متنوعة." },
      { property: "og:image", content: "https://foodhub.delivery/icons/icon-512.png" },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:alt", content: "FOODHUB Platform Logo" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FOODHUB | أسرع توصيل بأقل سعر" },
      { name: "twitter:description", content: "أسرع توصيل طعام بأقل سعر في المملكة." },
      { name: "twitter:image", content: "https://foodhub.delivery/icons/icon-512.png" },
      { name: "theme-color", content: "#FFC72C" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "FoodHub" },
      { name: "google-site-verification", content: "google8b4e72fa2319a9f0" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('foodhub_theme_preference');
                  if (saved === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    applyTheme(getInitialTheme());
    registerServiceWorker();

    // Remove standalone "Edit with Lovable" badge in production (skip when running inside Lovable editor)
    const isInsideLovableEditor =
      typeof window !== "undefined" &&
      (window.location.hostname.includes("lovable") || window.self !== window.top);

    if (!isInsideLovableEditor) {
      const removeLovableBadges = () => {
        const selectors = [
          "#lovable-badge",
          ".lovable-badge",
          "[data-lovable-badge]",
          '[id*="lovable-badge"]',
          '[class*="lovable-badge"]',
        ];
        try {
          selectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) => {
              el.remove();
            });
          });
        } catch {
          // ignore
        }
      };

      removeLovableBadges();
      const observer = new MutationObserver(() => removeLovableBadges());
      try {
        observer.observe(document.body, { childList: true, subtree: true });
      } catch {
        // ignore
      }

      return () => observer.disconnect();
    }
    return undefined;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <CartProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <CustomerMobileNav />
          <Toaster richColors position="top-center" />
        </CartProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

