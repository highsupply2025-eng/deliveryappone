<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Build native apps through a customer/captain/kitchen/admin CI matrix using scripts/mobile-apps.ts and FOODHUB_APP before Capacitor sync; each binary must have a matching identity and initial hosted URL.
- Native shells use a generated dist/mobile fallback and load the published TanStack site; SSR build output is not an offline native app.
- Label unsigned iOS outputs as compilation bundles, never installable IPAs; device distribution requires archive/export with valid Apple signing.
- Courier shifts and order actions are persisted through authenticated database RPCs using server time; couriers cannot directly edit attendance or claim arbitrary orders, preventing salary-day and coverage tampering.
- Derive courier availability from server timestamps rather than scheduled polling; RPC synchronization materializes completed shifts and never dispatches after work completion.
- Load native role experiences separately; shared order_live_locations uses courier-authenticated RPC writes, RLS reads and Realtime. All four order-tracking maps share a lazy-loaded MapLibre renderer using Mapbox raster tiles via the public pk. token (OpenFreeMap fallback without it; never combine with Google Maps) with a Vite worker URL and retained attribution; show only validated stored pickup, delivery and courier coordinates, never invented endpoints.
- Coverage uses an exact delivery-neighborhood label and an admin-confirmed adjacency set; only orders with a real pickup address are dispatched to avoid invented locations.
- Keep the public browser presentation in its own storefront module and scope its CSS to .foodhub-web so native role experiences and shared pages retain their designs.
- Public website app previews use captured current customer screens via asset pointers, not synthetic catalog images; recapture when customer presentation changes to prevent stale or misleading previews.
- Keep customer discovery in its own module with always-light tokens scoped to .foodhub-customer; use stored catalog/profile/orders, exclude only verified unclaimed initial catalog fixtures, and never substitute demo data when reads fail. Customer checkout persists pending orders and item rows, not local simulated orders.
- Customer privacy and help routes share CustomerInformationLayout and scoped customer tokens so legal/help navigation keeps the standalone customer presentation without altering other role apps.
- Wrap native courier/restaurant entries and admin login/panel in `.foodhub-staff` with scoped semantic tokens so saved browser themes cannot alter staff screens or leak into other experiences.
