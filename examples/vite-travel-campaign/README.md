# page-blocks-example-vite-travel-campaign

Editable travel campaign example for the single-package `page-blocks` workspace.

## Commands

From the repository root:

```sh
pnpm --filter page-blocks-example-vite-travel-campaign dev
pnpm --filter page-blocks-example-vite-travel-campaign typecheck
pnpm --filter page-blocks-example-vite-travel-campaign build
```

`dev` starts the Vite app on `http://127.0.0.1:5175`.

This example demonstrates:

- editable filesystem-backed slots
- `path`, `country`, `city`, and `season` context matching
- nested `SlotContext` preloading
- nested block slots
- prop-source search backed by a local mock API
- screenshot-driven archive previews
- read-only production output via `staticOutput: 'lazy-files'`

## Pages

Run the dev server first, then use these routes.

### Landing

Link: [http://127.0.0.1:5175/](http://127.0.0.1:5175/)

What you should see:

- the default landing-page shell with the country, city, and season selectors
- the global `hero`, `seasonal_banner`, `content`, and `offers` slots
- broad fallback travel content that is not yet narrowed by route-specific files
- the editor toggle in development

### Guides

Link: [http://127.0.0.1:5175/guides?country=portugal&city=lisbon](http://127.0.0.1:5175/guides?country=portugal&city=lisbon)

What you should see:

- the `/guides` route hero, which is route-specific and explains the editorial guide layer
- a guide-focused content shelf rather than the landing fallback shelf
- when using `city=lisbon` or `city=kyoto`, the guide content shelf should switch to the city-specific override
- the same selectors and editor controls as the landing page

### Offers

Link: [http://127.0.0.1:5175/offers?country=portugal&city=lisbon](http://127.0.0.1:5175/offers?country=portugal&city=lisbon)

What you should see:

- the `/offers` route hero, which is specific to the offer page
- a route-specific planning note in the `content` slot
- an offer shelf that first resolves by country, then becomes more specific when a matching city-plus-season file exists
- when no season is set, the `@season:none` banner prompting you to choose a season

### Block Archive

Link: [http://127.0.0.1:5175/block-archive?country=portugal&city=lisbon](http://127.0.0.1:5175/block-archive?country=portugal&city=lisbon)

What you should see:

- one live contextual `hero` sample rendered through the travel slot tree
- the full block archive underneath, showing the examples for `CampaignHero`, `ExperienceShelf`, `OfferCard`, and `PlanningNote`
- the page used by screenshot generation for the add-block modal thumbnails

## Context Checks

These links hit the most important matching cases in the slot matrix.

### Guide overrides

- [Lisbon guide override](http://127.0.0.1:5175/guides?country=portugal&city=lisbon)
  What you should see: the Lisbon-specific guide shelf with tram, miradouro, and waterfront pacing copy.
- [Kyoto guide override](http://127.0.0.1:5175/guides?country=japan&city=kyoto)
  What you should see: the Kyoto-specific guide shelf with temple timing, garden districts, and Gion pacing copy.

### Offer overrides

- [Portugal country offer shelf](http://127.0.0.1:5175/offers?country=portugal&city=porto)
  What you should see: the Portugal country-level offer shelf with Lisbon and Porto packages.
- [Japan country offer shelf](http://127.0.0.1:5175/offers?country=japan&city=tokyo)
  What you should see: the Japan country-level offer shelf with Tokyo and Kyoto packages.
- [Lisbon summer exact match](http://127.0.0.1:5175/offers?country=portugal&city=lisbon&season=summer)
  What you should see: the Lisbon summer exact-match offer shelf and the season-active banner instead of the `choose a season` prompt.
- [Kyoto spring exact match](http://127.0.0.1:5175/offers?country=japan&city=kyoto&season=spring)
  What you should see: the Kyoto spring exact-match offer shelf and the season-active banner.

## Editing Notes

- The selector bar updates `country`, `city`, and `season` in the query string while `path` comes from the current route.
- Changing country should clamp city to a valid city for that country.
- Adding an `OfferCard` from the editor should show a search tab backed by `GET /api/travel-search?q=...`.
- Editing nested shelf items should write back into the matching JSON file under `examples/vite-travel-campaign/slots`.
