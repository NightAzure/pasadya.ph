# Sunlit Field Guide Homepage Direction

Sunlit Field Guide translates the Daylight Explorer reference into a complete
homepage rather than reproducing its search-results workspace. It keeps the
warm paper, ink-blue editorial type, coral wayfinding, teal utility controls,
and travel-journal tactility while using Pasadya's current live homepage
hierarchy.

## Status

- **Current role:** live homepage direction
- **Live route:** `/`
- **Concept route:** `/homepage-concepts/sunlit-field-guide`

## Product hierarchy

1. Search for a place or kind of day.
2. See one factual route-time proof before deciding whether the island fits.
3. Browse focused place categories and three recommended listings.
4. Save promising places and understand price, trust, and location context.
5. Turn the shortlist into a realistic day plan.
6. Read a local guide or enter the owner workflow.

## Hero budget

The first viewport is deliberately limited to the Pasadya brand, one headline,
one supporting sentence, one compact search interaction, a dominant coastal
image, and one factual route proof. It does not include featured listings,
value-chip clusters, promotional badges, or secondary campaign cards.

## Visual system

- **Display type:** Newsreader, including a restrained italic for the hero's
  second thought. It stays large and legible on mobile instead of collapsing
  into the utility typeface.
- **Interface type:** Instrument Sans for controls, labels, metadata, and route
  details.
- **Palette:** warm paper `#F7F0E4`, ink `#0B2344`, route teal `#087F78`,
  marker coral `#E66F50`, and sun yellow `#F1C35B`.
- **Shape language:** compact cards with one generous trailing corner, circular
  route markers, tactile borders, and restrained shadows.
- **Photography:** licensed project photography remains the emotional layer;
  the interface never depends on decorative illustration.

## Responsive behavior

- At desktop widths, the hero uses an editorial split composition with one
  horizontal search bar in the copy column and a route-annotated image on the
  right.
- Tablet moves to a single narrative flow, followed by a two-column place grid.
- Mobile surfaces the image and route proof before the stacked search controls,
  then keeps two scrollable quick links and a compact menu.
- Place cards, planner stops, route metrics, guides, and owner actions collapse
  without hidden product information or required hover interactions.
- Controls meet a 44px minimum target and safe-area padding is respected.

## Motion and accessibility

- The first view enters with a short stagger that reinforces reading order.
- Route markers pulse gently and photography scales only on hover-capable
  devices.
- Cards and controls use short, low-distance feedback rather than large
  parallax effects.
- All motion is removed under `prefers-reduced-motion`.
- Native search, select, links, and a native disclosure menu preserve keyboard
  operation and visible focus.

## Scope

This is a private concept route. Search, place, transport, account, owner, and
legal actions point to the corresponding product routes; no fake booking or
planning persistence is introduced.
