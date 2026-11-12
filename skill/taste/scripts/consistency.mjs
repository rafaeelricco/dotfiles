#!/usr/bin/env node
// consistency.mjs: the faults a reviewer marks by eye, found in a real browser.
//
// Usage (serve the page, or pass the file; use your own Chrome profile folder):
//   node consistency.mjs <url or file> [--widths 1440,1024,820,768,390] --profile <dir>
//     [--category "kettle"] [--audience "small offices"] [--place "Porto,Ribeira"]
//     [--products "Kettle One,Kettle Two"] [--primary "Order a kettle"] [--known-brand] [--page tech|gaming|software|product|place|service]
//     [--tech-subject] [--address-allow "Weserstraße 58|+354 555 0142"] [--rhythm-widths 1440,768,390] [--tiles-tol 24]
//     [--out dir] [--root dir] [--port 5200] [--json] [--quick] [--stops] [--no-sweep] [--no-slow] [--no-reduced] [--no-hidden] [--no-gl-fallback]
//     [--no-visuals] [--no-address] [--no-rhythm] [--no-rhythm-expand] [--no-motion-hooks] [--no-tiles]
// --profile: the Chrome profile, a folder of its own in the OS temp folder or the project's .taste-skill folder, never
// outside the project; a relative one that leads out of the current folder (../prof) is replaced, with a warning, by
// .taste-skill/chrome-consistency.
// The copy flags take comma lists. Without --category the terms come from a <title> written as the starter has it,
// "Name: what it is for whom" ("Larkmoor: electric kettles for small offices"); with neither, the headline check warns.
// --page (or --type) is the page's kind (SKILL.md section 1); without it the kind is read from what the page declares: the
// starter and the layouts write <html data-type>, <meta name="page-type"> (the same value), <meta name="site-kind"> and, on a
// place, <meta name="page-kind" content="place"> (read in that order); a <meta name="taste-kind" content="tech|gaming|software|
// product|place|service"> is only a last alias, read after those and before the title (then the category or the title);
// with none of them effects-fit WARNs. Tech and gaming are judged as software, with the house allowance. On a product
// or a place, a section of prices, rooms or goods needs its pictures like any other, and plan cards warn.
//
// It opens the page in its own headless Chrome (stopped by its own PID), serves a local file on a free port from
// 5200-5299 (or --port and the 9 after it), walks every screen at each width, and prints every finding as FAIL or
// WARN with the element, what is wrong, a crop (red: the element; dashed blue: what it is measured against) and a
// one-line fix, then a table of every check as PASS, WARN or FAIL. FAIL: the builder must fix it (or report why it is false). WARN: look at it.
// Exit 1 when anything FAILs, 0 when clean, 2 when the page could not be checked. Node 22+, no dependencies.
//
// The checks (each element is judged once, on the first screen that shows it whole):
//   layout     off-grid, stagger (rows of a list at different lefts), top-stagger (boxes in a row at different tops),
//              right-edge, centre-axis (centred off its box; centred on the screen when the content column is not),
//              tilt (and text on an SVG curve), row-gap, section-gaps, hole (an empty space inside a section or card),
//              heading-align (one or two section headings centred among left-aligned ones, WARN)
//   containment  spill, off-viewport, fold-card (a card cut by the first screen's bottom), hover-spill (cards hovered
//              one by one), overlap-text (a box over a line of text)
//   text       cut-text, fold-cut (a heading sliced by the fold), marquee (a running line cut mid-word), orphan,
//              contrast, busy-ground (text over a busy part of a picture), heading-scale (h1 > h2 > h3, one size each,
//              and no heading whose letters are smaller than the text under it)
//   nav        nav (the bar against the content; a gap over 24px or pieces past the edges FAIL), nav-covers (a fixed
//              tab, pill or narrow bar over text), nav-family (one type and one form on every screen), nav-labels
//   buttons    button-styles (look, height and label size; a pair at one height), button-shape, same-action,
//              label-centre, button-picture, fake-button, stranded-action, cta (hero, priced cards, closing section),
//              link-styles (text links in 3+ looks, WARN)
//   motion     scroll-linked, scroll-reveal (.enter and [data-hl] are not exempt below the first screen), pinned,
//              loop-pause (anything still moving 5 s after it is seen needs a pause button), webgl (more than 4 live
//              WebGL contexts at once, FAIL: mount effects on view, destroy them off screen)
//   visuals    no-visual, card-visual (3+ text-only cards), hidden-visual (a picture only on hover), card-family (cards
//              of one class in two title faces, 4+ siblings in two fills used twice each, striped rows two ways), ui-fit (a
//              fragment's parts past its box or slot), ui-centre (a compact fragment off its panel's middle),
//              dark-ground (on a dark card, the ground behind UI under 3:1), photo-upscale, photo-set, photo-credit
//   copy       copy-headline (the h1 names the category, and the buyer or the place), copy-fact (a number, price,
//              date, place, platform or game genre on the first screen), copy-headings (every heading names a thing), copy-buttons (a verb
//              and an object; never "Learn more"), copy-actions (2 in the hero, 10 labels, one wording)
//   wiring     links ("#", missing anchors and pages), forms (submitted once with test values on a local page, every
//              request held inside the browser: a form that sends nothing FAILs), assets
//   added in a second pass (faults seen on the first test pages):
//   leftovers  placeholder (a bracketed stand-in, "to be added", Beispielstraße), sample-label (more than two lines that
//              tag figures as samples), caption (a line about the page: how a picture was made, what will follow, what
//              the client has not sent; a licence credit under a picture WARNs: credits go in one footer line)
//   system     effect-repeat (one effect id in more than two sections), card-layout (a kit layout in more than two
//              sections; four cards drawn one way FAIL, a card group in under three placements or on one ground WARNs),
//              nesting (a UI card on a patterned or plain panel in a card, a text box in two boxes), pricing-tiers (plan
//              cards or a ticked price table for what is no subscription, WARN), col-edge (the second column of the
//              page's splits starting at three places or more, WARN), proximity (a caption touching its picture, rows of
//              a grid as close as a picture to its caption, WARN), text-only (a price, quote, question or closing
//              section with no picture, icon or mock at all, WARN)
//   ink        text-contrast (text on a plain ground: body text 7:1, captions, labels and muted lines 4.5:1, large
//              type 4.5 and 3; text inside a drawn mock WARNs), body-size (running text under 16px, WARN)
//   also       copy-actions FAILs more than two hero actions; same-action WARNs a first screen whose nav and hero show
//              two or more actions twice; heading-scale WARNs h3s within 1.3x of the h2s; scroll-reveal also tells a
//              finite animation an IntersectionObserver starts as its box comes on screen. A kit fragment (.ui.ui-*)
//              counts as a drawn mock like [data-ui] (ui-fit, ui-centre, dark-ground judge it).
//   added in a third pass (faults seen on the second test pages; check every width, 1440, 1024, 820, 768 and 390):
//   render     empty-visual (a picture, canvas, effect ground or photo frame showing one colour all over: its ground, a
//              broken or faded picture, a refused effect; judged on the screen showing 60% of it or more), shader-lint
//              (every shader the page compiles or ships, read for GLSL ES reserved words used as names: flat, smooth,
//              centroid, sample, patch, input, output, filter and the rest; a compile or link error FAILs too),
//              gl-fallback (the page again with every shader made to fail: each WebGL piece must show its still
//              fallback, never its bare ground), effects-fit (WebGL on a place, service or plain product page, FAIL; a
//              product with a technical subject, --tech-subject or a tech site-kind, is judged as tech; see v4 below)
//   screens    hero-fill (the next section shows on the first screen; a tablet is 820x1180 and 768x1024), flush (content on an edge
//              where the ground changes: the closing call on the footer, a section's last line on the next band)
//   leftovers  credit-wall (photo credits in more than one footer line), sample-label also FAILs a note that names and
//              figures are examples, caption FAILs a line explaining a picture ("this photo shows", "made in code",
//              "photographs follow"), placeholder FAILs a printed .example address
//   also       nav WARNs a tablet bar left with the wordmark and a menu button (its main action shut in the menu);
//              links WARNs a link to a closed answer or a hidden panel; nav-labels WARNs a dropdown whose 3+ entries share
//              one target; button-styles WARNs phone buttons in two width rules (full width and their own); proximity
//              WARNs a stacked split whose visual sits under 24px from the text above; unit-break, tab-wrap WARN.
//              Measured at rest: the motion layer's link underline (a background line) and tab indicator (a pass-through
//              layer) are no buttons and no fills; a part of a [data-m-loop] or [data-ui-loop] picture that starts on view
//              is a loop, not a reveal; a lit panel (a soft gradient or photograph, no border or tiled pattern) is the
//              card's picture, not a third box; an announcement pill is no button; a box an endless animation moves is
//              not judged for its edges; text in drawn mocks below 4.5:1 is one WARN per width.
//   added in a fourth pass (faults tallied page by page against the earlier test pages):
//   mocks      fade-cut (a row of a mock drawn far fainter than its colour: a mask or a gradient over the mock's edge
//              half-erases it; confirmed on a second picture 1.2 s later, WARN), overlap-text also WARNs a box of a mock
//              laid over the mock's own words (a note card over the manuscript), ui-centre also WARNs one card of a group
//              whose UI sits at another place in its panel than the others', empty-visual also FAILs an effect ground
//              behind its UI card that reads one flat colour while other grounds of the same effect draw
//   pictures   photo-weight (on the phone, a photograph 3x or more wider than drawn, no srcset: its frame shows empty
//              until it arrives, WARN), photo-repeat (one picture shown twice, at every width, WARN: compared by content, so a srcset's width variants and a renamed copy count as one), busy-ground also WARNs detail
//              (|dL*| between neighbouring pixels) or a shadow or bright patch (the 5-95% spread) under words on a photo
//   chrome     nav-current (a bar that stays on screen with 3+ section links, none ever marked for the section you are
//              in, WARN), nav's lopsided check reads a text link by its letters (padding is not seen), fold-cut WARNs the
//              hero's own button cut by the fold, button-contrast (a filled button with no outline under 1.3:1 against the
//              ring of ground round it, WARN), progress-bar (a drag, progress or meter bar: the house rules have none, WARN)
//   copy       copy-length (a headline or section heading of 22+ words or 4+ lines at a desktop width, WARN)
//   spacing    section-gaps also WARNs a band whose padding inside differs from the space outside its edge
//   also       hero-fill is read at every sweep width too (768x1024 is the tablet width); a width the browser cannot
//              walk is tried again, then printed as NOT CHECKED (exit 2), never as a column of PASS; shader-lint knows
//              the GLSL ES 3.00 image and multisample types and, without #version 300 es, switch, default, sampler3D
//   added in v4 (what readers still counted that a script can decide, and two of the house rules)
//   pictures   photo-print (a halftone, dither or engraving canvas drawn over a photograph: FAIL on a product, place or
//              service page, a product with no technical subject or in the hero, else WARN), effects-fit FAILs WebGL on a place or service page (the type read
//              from the title counts) and an effect ground or a print on a product page (a render of the product is fine)
//   layout     split-align (the splits set their text against their visual two ways, top and middle; a picture centred
//              on a text column 120px+ taller, its edges lining up with nothing: WARN), grounds (more than three flat
//              grounds across the page: base, surface, inverse; a lit ground or a photograph is no ground: WARN)
//   screens    fold-action (the hero's main button below the first screen FAILs, a second one WARNs), one-screen (house rule,
//              at a desktop width a section shorter than the screen shows its neighbour's heading or picture, WARN)
//   copy       fact-agree (one day given two opening hours: two ranges FAIL, a range against "from 8 every morning" WARNs; it reads opening
//              hours ONLY, never a product's figures: a unit alone (kg, km/h) is stated for several things on a product page, so two values
//              of it are no disagreement, and no rule may cite fact-agree for a product figure),
//              action-count (the main action on five buttons or more, WARN)
//   chrome     hover (house rule: a filled button, an outlined one, a text link and a nav link hovered once at the first
//              width; a kind whose look does not change within 350 ms WARNs), button-styles WARNs a menu button in a fill
//              no button uses, nav FAILs a tablet bar of wordmark and menu button when the main action would fit (240px+
//              free; read at the top of the page)
//   severity   text-only FAILs a quote or the closing call, and every text-only section when there are two or more (a lone
//              FAQ or price list stays a WARN; a closing call drawn as one great button is its own picture);
//              heading-scale FAILs a figure set over the section headings (1.08x the h2 or more), not only over the h1
//   added in v5 (what the adversarial check found passing)
//   render     empty-visual also shoots each screen again with every picture's, canvas's and effect canvas's own content
//              hidden: the same pixels both times is a visual that shows only its ground, a gradient as much as one
//              colour (confirmed 1.2 s later); a picture loaded but left under 0.1 opacity once the page is scrolled
//              through, still so 1.1 s after it is brought to the middle of the screen (a reveal that never fires); and on
//              a phone over a slow mobile line (1.6 Mbit/s, 400 ms, no cache) a photograph frame still empty 1 s after it came on
//              screen (FAIL over 400 KB, over twice a retina phone's width, or never there; else WARN; --no-slow skips it). gl-fallback also FAILs a host whose look with the
//              shader rejected equals its stylesheet ground with the canvas taken away (no fallback, only a gradient)
//   motion     loop-pause reads every screen by its pixels too (a ticker or a rotating word a script drives) and judges a
//              hero written as <header>; a pause control needs aria-pressed, a label that names pausing or a short label
//              that starts with pause, play or stop. reduced-motion (new): the page again under prefers-reduced-motion:
//              reduce at the first width; anything that animates in on scroll or still moves 1.5 s after it came on screen
//              FAILs (a film with controls WARNs; --no-reduced skips it)
//   screens    hero-fill skips the site's bar before the hero (a sticky <div class="nav">, any block under 200px with a nav
//              or two links); flush measures a section's last item to a rule (a 1px border) between it and the next band
//   leftovers  credit-wall at 1000px and wider FAILs more than one line or block, however many credits the line holds
//              (narrower: a second block, over 220 characters or five lines); placeholder FAILs a printed example.com
//              address and a phone number of zeros, one repeated digit, 555-01xx or 1234567; caption FAILs a line that
//              says where a picture comes from ("not ours", "a similar bar", "stock photo", "for illustration")
//   shaders    shader-lint reads shaders written as arrays of short strings joined with '\n', flags attribute and varying
//              under #version 300 es, the webgl_ and _webgl_ prefixes, gl_ names that are no built-in, and any name with __
//   added in v5 (the house rules and the judges' faults; blocks of their own, --no-<id> skips one)
//   kind       the page's kind from --type, else the page's own marks (<html data-type>, <meta name="page-type">, <meta
//              name="page-kind" content="place">, <meta name="site-kind">), else <meta name="taste-kind"> (a last alias),
//              else the title; on a tech, gaming or software page one big scene ([data-big-scene]) and two scroll moments ([data-scroll-moment], [data-moment])
//              that scroll-linked or pinned would tell are WARNs (house rule: allowed, the reduced-motion pass judges
//              their still)
//   visuals    visual-caption (a caption, description or caption-like line under, over or on a visual of 120x80px or
//              more: a figcaption, a caption class or phrase FAIL; a muted line of 2 rows and 15px or less 32px under
//              it, or a small line over its lower half, WARN)
//   render     visual-empty (every visual of 120x80px or more shot on its own at every width: under 6 colours, 99.8%
//              one colour (a canvas or mount 98%) FAIL, else WARN; a broken picture or background and a diagram mount
//              that never drew FAIL), effect-kind (effects on a place, service or plain product page FAIL; on a tech
//              page more than 4 live contexts, one scene or two moments, or no reduced-motion or phone branch WARN)
//   contact    street-number, postcode, coordinates, company-number, phone-number (a house number, a postcode beside
//              its town, map coordinates, a register, VAT or tax number, a real-format phone or a tel: link in the
//              text, links or JSON-LD, FAIL; --address-allow passes what the brief gives)
//   rhythm     at 1440x900, 768x1024 and 390x844 in its own tab (one screen is exactly 900, 1024 and 844 px, the height shoot.mjs cuts its tiles at: k x 900,
//              the fixed header over the section's top): hero-screen (SR-1: the hero alone on the first screen),
//              section-height (SR-2: one screen or two, 2px either way, also with every answer and tab open),
//              section-air (SR-3), one-section (SR-4: no second section peeking in), one-heading (SR-5: one heading
//              per screen), container-edges (SR-6: equal left and right margins), row-lines (SR-7: card rows on the
//              container lines), split-pair (SR-8: splits top-aligned, text left, one right line), each FAIL
//   motion     motion-layer, count-text, loop-cycle (the motion layer's marks: data-motion without motion.css, a count
//              of no number, a year or a price, a card loop outside 2.5-4 s), hidden-content (text in view that stays
//              hidden until a script reveals it: under reduced motion at the first width, and again with an
//              IntersectionObserver that never calls back, waited 4 s and walked, and with scripts switched off; a closed menu, popup, disclosure,
//              aria-hidden part or an alternate stacked under a shown one is passed; inside a drawn mock WARN, else
//              FAIL; --no-hidden skips the second load)
//   chrome     hover-move (a hovered card or link card that tilts FAIL; one that lifts more than 6px or grows past 1.03,
//              or whose photo zooms past 1.05, WARN: the 2px lift and 1.02-1.03 zoom; first width, with hover-spill)
//   later      (the v5 judges' faults)
//              hover-move also FAILs a linked card or a linked photograph that shows no change at all on hover (its look, its move, its
//              pictures' scale and its parts the same hovered as at rest: the card the motion layer does not reach, or a page that never
//              linked motion.css); a card or photo only the pointer moves is read, a loop or a fragment running by itself is left out
//              credit-wall also FAILs a footer holding more than 2 links that credit photographs (a photographer's page, a source file
//              or a licence), even inside a closed <details>: the footer holds ONE line linking credits.html (photos.mjs credits --write)
//              product-shown FAILs a physical product page whose hero shows no photograph and no render of the product (an img, a picture,
//              a video, a canvas, a [data-object] or [data-print], or a background picture; a UI fragment or a drawn svg is not one).
//              A later pass adds to product-shown the size: the hero product's drawn bounds (the subject inside its still, canvas or
//              photograph, found from its pixels, object-fit and padding applied; the picture's own ground left out) under 60% of the
//              content width of the hero's container FAILs, 60-80% WARNs (at 1000px and wider, in the way the judges read it at 1440).
//              photo-repeat is a FAIL on a product page (one view twice), and there also reads the same VIEW in another colour: two
//              [data-product] frames with one data-product-view (and spec, scene), or two pictures with one file stem less its width and
//              colour suffix, are one picture whatever the colour: WARN, FAIL when they sit in neighbouring sections or share a colour
//              copy-length WARNs a tech, gaming or software page over about 80 words a screen outside the UI mocks (a section over 90, or
//              80 across the page; the words in [data-ui], diagrams, svg and aria-hidden parts are left out; first width, 1000px and wider)
//              same-object WARNs a product, tech, gaming or software page whose object is WHOLE in more than three sections (n >= 4): the
//              section's main visual (the largest picture, render or object in it) shows the object whole. One object is a [data-product]
//              spec in any whole view or colour (and the stills exported from it), a [data-object] or [data-print] id, or a still's file
//              stem less its width, half-size, colour, ground and view suffixes. A use scene (data-product-scene: its setting fills the
//              frame), a detail:<part> close-up, the exploded view and stills named -detail-, -loaded-, -work-, -desk-, -exploded- or by
//              another scene word the page uses are other kinds of picture and are not counted; it names the sections
//   one id     a visual empty-visual tells is not told again by visual-empty, a line caption tells not again by
//              visual-caption, the WebGL effects-fit tells not again by effect-kind
//   added in v5i (what the second adversarial check found)
//   fixed      section-air's divider test passes a box with side borders, a corner radius, a ground or a shadow (a card,
//              a frame, a form box) and a line inside a picture, mock, frame or card; webgl FAILs above 4 live contexts
//              (the cap every skill file states); effects-fit and photo-print judge a product with a technical subject
//              as tech; shader-lint takes a name the source #defines (three.js's "#define attribute in"); the address
//              checks read closed answers, hidden panels and the page head (title, meta description, og:, twitter:),
//              and a bare number in a mock or a stat or spec row, a round figure (4000 Bookings) or a year-led serial
//              (2026-041) is a postcode only beside an address; a mailto: on .example is no stand-in; --no-hidden is
//              shown as not checked; a page with no kind WARNs (effects-fit)
//   added      section-height T-snap (scroll-snap-type anywhere FAILs, ST-02); a scene's section keeps its 1H/2H FAIL
//              with the hold fix, and section-air leaves its held stage out of the gap and the fill; loop-cycle reads
//              [data-ui-loop] fragments and [data-diagram] pulses (CSS, Web Animations and SVG <animate>); effect-kind
//              FAILs a second [data-big-scene] and a data-fx ground beside the big scene (MO-16, MO-23)
//   added later (the tiles block: section-tile)
//   screens    section-tile (a section tile showing two sections: at 1440x900 a section not one or two screens tall,
//              24px either way, whose tile or the screen a whole screen on from its top shows another section's
//              heading, text or picture, FAIL; only its ground, 24px or more, WARN; at 390x844 only a section
//              shorter than the screen; not told again when hero-screen, section-height or one-section tells it)
//   added later (a font the page asks for that never loads)
//   type       font-load (the first family of each stack the type tokens, the h1, the h2s and the body text ask for: a web
//              font no loaded face answers once the fonts are ready, a missing or misspelt font link or a family nothing
//              loads, WARN, named with where it is used; generic families and system faces pass; first width)
//   added in 2.5.1 (the finish gate: fewer false FAILs on the kit's own pages, and what the 44-site test showed)
//   screens    empty-area (its own block, --no-area: per section at every width, the hero included, the rows with no
//              content above and under it and the empty width beside content that covers under half the container
//              for 25% of a screen or more, over 35% of the section's area inside its container WARN, over 50% FAIL; a
//              picture, a visual or a mounted moment holding the space fills it; a ground or frame is no content)
//   motion     every kind deals a hero entrance ([data-enter], motion.md) and one or two moments ([data-moment]): what
//              follows the scroll, holds or enters inside a moment's section is a WARN on every kind (cards, rows or tiles
//              entering one by one stay a FAIL), the entrance is no reveal, effect-kind passes a moment dealt to the
//              page's kind (assets/moments/index.json "pages") and FAILs one off it; hidden-content also walks the page
//              with scripts switched off
//   layout     the centred hero's words stand on the page axis and a box hero's (film, photo) on its box's padding;
//              a [data-product] frame is the box split-pair and T6 measure; a hero's text column may end on a column
//              end before the split line (span-5); a line's top is its block's top when the block trims its leading;
//              stagger leaves drawn mocks (a chat, a diff) alone; heading-scale leaves a dealt moment's display type alone
//   copy       copy-fact also takes the platforms, a game's genre or a place after in, at, near or from
//   basics     (its own block, --no-basics: the professional basics the 44-site test found missing)
//              access: a11y-name, img-alt, field-label, heading-order, tabindex, focus-ring, menu-toggle FAIL,
//              skip-link WARN; keyboard (a Tab walk at the first width through the first screen and the main action):
//              focus-visible (no change, under 3:1 or nothing to see FAIL, a ring that fades in WARN), focus-hidden (under
//              the fixed header or bar); head: lang, page-meta, share-meta; claims: action-repeat (one action 3+ times on
//              a screen FAIL, nav and hero on a desktop WARN), map-link (no street, or a whole town), open-now (from
//              assumed hours), assumed (every data-assumed fact listed for the report), run-on (a heading's grey sentence
//              with no stop before it); forms: form-fields, form-send (a thank-you with nothing to send to FAIL, a mailto
//              stand-in on .example WARN)
//   added in 2.5.1 (the phone: what the 44-site test showed at 390, measured at every width of 600px and less)
//   phone      collide (FAIL: two lines of words laid over each other, the words of one section on a picture, button or
//              card of another (a section too short for what it holds runs into the next), a button with a picture or card
//              laid over it, and, at rest (the top of the page and its end), a fixed bar over words, a button or a picture
//              nothing scrolls out from under it; a line's box is its line-height, the part its clipping boxes leave;
//              drawn mocks, marquees and parts that move with the scroll are left out), tap-size (a link, button, field,
//              summary or tab outside a line of running text, a short sentence included, under 44px tall: under 32 tall
//              or 24 wide with another target less than 8px away FAIL, else WARN; a transparent ::before or ::after laid
//              past the box counts, a checkbox takes its label's box; one finding per look, with the count), and a narrow
//              pass (--narrow 320, the default whenever a width is a phone; --no-narrow skips it): the page at 320x640
//              walked to its foot, collide and tap-size on every screen, the first screen's fold (fold-card, a WARN at
//              320), and every block that runs past the screen's edge (a body clip hides the sideways scroll, never the
//              cut) told as off-viewport with its crop
// Then the first screen at 1280, 1152, 1024, 896 and 768 for cut text, spills, overflow and nav faults (--no-sweep
// skips it). Chrome runs headless on the CPU (--disable-gpu --use-angle=swiftshader), one Chrome at a time, and never
// lets a page hold more than 4 live WebGL contexts: past 4 it frees the oldest one far off screen, or refuses the new
// one (that effect is then measured as its fallback); the webgl check says so. Hover, loop and form passes run at the
// first width only. A fault inside a scroll-linked animation is a
// WARN (the animation is the FAIL). --quick skips the scroll stepping and the reveal walk (an IntersectionObserver reveal,
// a held section and a CSS scroll timeline are still told), the hover, loop, form, reduced-motion and hidden-content
// passes, and names them. --stops
// saves every screen. A part caught mid-move on a sweep screen (measured again 0.9 s later) is not told. report.json,
// rendered.html (the page as the browser built it at the first width, which gate.mjs lints for copy) and
// the crops go to --out, else to .taste-skill/consistency beside the page file (.taste-skill/consistency-<name> for a page
// not named index.html, so two pages in one folder keep their own), or to a temp folder for a URL: never into the current
// directory.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync, statSync, readdirSync, unlinkSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename, extname, relative, sep, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { readCatalogue } from "./moments.mjs";
import { readTaste, assetRoots, climbRoot, itemDir, servable } from "./roots.mjs";
import { sleep, argv, opt, has, TASTE, BUILD_PLAN } from "./consistency/cli.mjs";
import { isTreatment, sceneFitsKind } from "./consistency/fit.mjs";
import { visualMod } from "./consistency/modules/visuals.mjs";
import { addressMod } from "./consistency/modules/address.mjs";
import { rhythmMod } from "./consistency/modules/rhythm.mjs";
import { motionMod } from "./consistency/modules/motion-hooks.mjs";
import { tilesMod } from "./consistency/modules/tiles.mjs";
import { areaMod } from "./consistency/modules/area.mjs";
import { basicsMod } from "./consistency/modules/basics.mjs";
import { launch, Tab, GL_CAP, GL_GUARD, IO_HOOK } from "./consistency/cdp.mjs";
import { startPreviewServer } from "./consistency/browser.mjs";
import { lib, helperLib } from "./consistency/page-lib.mjs";

// the checks kept as blocks of their own: each runs on the walked tab at every width it names (phase 'width') or opens
// its own tab (phase 'pass'); --no-<id> skips one
const MODULES = [visualMod, addressMod, rhythmMod, motionMod, tilesMod, areaMod, basicsMod];

const OUT = opt("out", null);
// --root: a built site's folder, served instead of the page's own so its root-relative links (/style.css) resolve
const ROOT = opt("root", null);
if (ROOT !== null && (ROOT === undefined || !String(ROOT) || String(ROOT).startsWith("--"))) {
  console.error("--root needs a folder");
  process.exit(2);
}
// widths as 1440,390 or with a height, 1440x800
const WIDTHS = opt("widths", "1440,1024,820,768,390")
  .split(",")
  .map(v => {
    const [w, h] = v.split("x").map(Number);
    return { w, h: h || null };
  })
  .filter(v => v.w >= 280);
const PROBE = opt("probe", null); // debugging: an expression evaluated in the page after the first scroll pass
// the Chrome profile: --profile, else $TASTE_SKILL_TMP/chrome/consistency, else a folder under the system temp dir
// a profile stays in the OS temp folder or the project: a relative --profile that leads out of this folder (or the folder
// itself) goes to .taste-skill/chrome-<name>
const inProject = (p, name) => {
  const abs = resolve(p),
    rel = relative(process.cwd(), abs);
  const out = !isAbsolute(p) && (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel));
  if (rel !== "" && !out) return abs;
  const to = join(process.cwd(), ".taste-skill", "chrome-" + name);
  console.error(
    `${name}: --profile ${p} ${out ? "leads outside the project folder" : "is the project folder itself"}; using ${to} (a profile goes in the OS temp folder or the project's .taste-skill folder)`,
  );
  return to;
};
const PROFILE = inProject(
  opt(
    "profile",
    process.env.TASTE_SKILL_TMP ?
      join(process.env.TASTE_SKILL_TMP, "chrome", "consistency")
    : join(tmpdir(), "taste-skill-consistency-chrome"),
  ),
  "consistency",
);
const PORT = Number(opt("port", "5200"));
const asJson = has("json");
const quick = has("quick");
const keepStops = has("stops");
const noSweep = has("no-sweep");
// the narrow pass: the page at 320 wide for collide, tap-size, the fold and what runs past the screen's edge (--narrow <w>;
// --no-narrow skips it); on by default whenever a width of the run is a phone
const NARROW = has("no-narrow") ? 0 : Number(opt("narrow", WIDTHS.some(w => w.w < 700) ? "320" : "0")) || 0;
const noGlFail = has("no-gl-fallback");
const noSlow = has("no-slow"),
  noReduced = has("no-reduced");
const noHidden = has("no-hidden");
// each block's own flags, and --no-<id> to skip it (read here, before the page argument)
const MOD_FLAGS = new Map(
  MODULES.map(M => [
    M.id,
    Object.fromEntries([
      ["skip", has("no-" + M.id)],
      ...(M.flags || []).map(f => [f.name, f.kind === "bool" ? has(f.name) : opt(f.name, f.default ?? "")]),
    ]),
  ]),
);
const modOff = M => MOD_FLAGS.get(M.id).skip || (quick && M.quick === false);
// the copy checks' terms (from a study of fifteen sites): what is sold, for whom, where, the product names, the main action
const CATEGORY = opt("category", ""),
  AUDIENCE = opt("audience", ""),
  PLACE = opt("place", ""),
  PRODUCTS = opt("products", ""),
  PRIMARY = opt("primary", "");
const KNOWN = has("known-brand");
// the page's type (SKILL.md step 1): software, product, place or service; without --type, read from --category or the title
// (--page is its documented name, CK-03; --type is kept)
const PAGE_FLAG = opt("page", ""),
  TYPE_ONLY = opt("type", ""),
  TYPE_FLAG = PAGE_FLAG || TYPE_ONLY;
const target = argv[0];
if (!target) {
  console.error(
    'usage: node consistency.mjs <url or file> [--widths 1440,1024,820,768,390] [--profile dir in the OS temp folder or .taste-skill] [--category ..] [--audience ..] [--place ..] [--products ..] [--primary ..] [--known-brand] [--page tech|gaming|software|product|place|service] [--tech-subject] [--address-allow "a|b"] [--rhythm-widths 1440,768,390] [--tiles-tol 24] [--out dir] [--root dir] [--port 5200] [--json] [--quick] [--stops] [--no-sweep] [--no-slow] [--no-reduced] [--no-hidden] [--no-gl-fallback] [--no-visuals] [--no-address] [--no-rhythm] [--no-rhythm-expand] [--no-motion-hooks] [--no-tiles]',
  );
  process.exit(2);
}
// a tablet is held upright: 820 (an iPad Air) is 1180 tall, 834 is 1194, 768 is 1024 (the judge's tablet: a full walk, not only the sweep's first screen)
const HEIGHTS = {
  1440: 900,
  320: 640,
  1366: 768,
  1280: 800,
  1152: 864,
  1024: 768,
  896: 800,
  834: 1194,
  820: 1180,
  810: 1080,
  800: 1280,
  768: 1024,
  430: 932,
  414: 896,
  390: 844,
  375: 812,
  360: 780,
};
const SWEEP = [1280, 1152, 1024, 896, 768];
// busy-ground on a picture: the mean |dL*| between neighbouring pixels under the words (detail), and the spread of its
// luminance from the 5th to the 95th percentile (a shadow bar or a bright patch behind part of a line)
const BUSY_EDGE = Number(process.env.CC_BUSY_EDGE || 1.4),
  BUSY_RNG = Number(process.env.CC_BUSY_RNG || 0.25);

// ---------------------------------------------------------------- a local file is served over http (port 5200-5299)
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8",
  ".glsl": "text/plain; charset=utf-8",
  ".frag": "text/plain; charset=utf-8",
  ".vert": "text/plain; charset=utf-8",
};
let url = target,
  server = null,
  outDir,
  serveRoot = null,
  serveHome = null;
// the crops and report.json go to --out, else beside the page (a file) or to a temp folder (a URL): never into the
// current directory
const slug = u =>
  String(u)
    .replace(/^https?:\/\//i, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "page";
if (/^https?:\/\//i.test(target)) outDir = resolve(OUT || join(tmpdir(), "taste-skill-consistency", slug(target)));
else {
  let file = resolve(/^file:/i.test(target) ? fileURLToPath(target) : target); // (file:///home/x keeps its slash)
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    console.error("No such file: " + file);
    process.exit(2);
  }
  // serve from high enough that the page's ../ references resolve
  const ups = Math.max(
    0,
    ...[
      ...readFileSync(file, "utf8").matchAll(
        /(?:(?:src|href)\s*=\s*|\bfrom\s*|\bimport\s*\(?\s*|url\(\s*)["']?((?:\.\.\/)+)/g,
      ),
    ].map(m => m[1].length / 3),
  );
  let root = climbRoot(file, ups);
  if (ROOT) {
    root = resolve(ROOT);
    const rel = relative(root, file);
    if (rel.split(sep)[0] === ".." || isAbsolute(rel)) {
      console.error(`The page is not inside --root ${root}: ${file}`);
      process.exit(2);
    }
  }
  serveRoot = root;
  serveHome = dirname(file);
  // the default range is 5200-5299; a --port outside it gets that port and the next 9
  const preview = await startPreviewServer({
    root,
    home: serveHome,
    allowed: servable,
    portStart: PORT,
    portEnd: PORT >= 5200 && PORT <= 5299 ? 5299 : PORT + 9,
    mime: MIME,
    outsideStatus: 403,
    contentLength: true,
    streamFiles: true,
  });
  server = preview.server;
  const port = preview.port;
  url = `http://127.0.0.1:${port}/${relative(root, file).split(sep).map(encodeURIComponent).join("/")}`;
  // index.html keeps .taste-skill/consistency; about.html gets .taste-skill/consistency-about, so it never wipes index's crops
  outDir = resolve(
    OUT
      || join(
        dirname(file),
        ".taste-skill",
        basename(file) === "index.html" ? "consistency" : "consistency-" + slug(basename(file, extname(file))),
      ),
  );
}
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (/^(sweep-)?\d{3,4}-.+\.jpg$/.test(f)) unlinkSync(join(outDir, f));

// a page built on the kit's system.js sets <html data-ready="1"> once its effects and fragments are drawn; a page that
// loads moments.js on its own sets <html data-moments-ready> once its moments are mounted (the checks count a moment
// only when it is mounted, so they wait for it)
async function waitReady(tab) {
  await tab
    .eval(
      `new Promise((res) => { const t0 = performance.now(); const sys = [...document.scripts].some((s) => /system\\.js/.test(s.src)) || !!document.querySelector('[data-fx], [data-ui-load]'); const mo = !!document.querySelector('[data-moment]') && [...document.querySelectorAll('script[src], link[rel="modulepreload"]')].some((s) => /moments\\/moments\\.js/.test(s.src || s.href)); const tick = () => { const d = document.documentElement.dataset; if (((d.ready || !sys) && (!mo || d.momentsReady)) || performance.now() - t0 > 12000) res(1); else setTimeout(tick, 150); }; tick(); })`,
      20000,
    )
    .catch(() => {});
}

const relLum = c => {
  const f = v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
// a page on this machine (a served file, or localhost / 127.0.0.1 / a .localhost or .test name): its forms are
// submitted with test values (every request held in the browser) and its links to other pages are looked up
const isLocal = () => {
  if (server) return true;
  try {
    const h = new URL(url).hostname;
    return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(h) || /\.(localhost|test)$/.test(h);
  } catch {
    return false;
  }
};
async function pageExists(u) {
  try {
    const p = new URL(u);
    if (server && serveRoot) {
      let f = resolve(join(serveRoot, decodeURIComponent(p.pathname)));
      if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
      return [f, f + ".html"].some(g => existsSync(g) && servable(serveRoot, g, serveHome));
    }
    if (!isLocal()) return true;
    const r = await fetch(u, { method: "GET", redirect: "follow" });
    return r.status < 400;
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------- the one-line fix printed under every finding
const FIX = {
  assets: "fix the path, or remove the reference",
  nav: "make the nav one bar from the content's left edge to its right edge, with every link and action inside it",
  "nav-covers": "make the fixed nav one opaque band across the whole screen, or let it scroll away with the page",
  "nav-family": "keep one nav on every screen: the same bar, fill, links and type",
  "nav-labels": "name each nav link after the heading of the section it opens",
  "link-styles": "give text links one look wherever they sit: one underline, one weight",
  "heading-align": "set every section heading in one place: all on the left grid, or all centred",
  spill: "keep the box inside the panel it starts on: shrink it, or grow the panel to hold it",
  "off-viewport": "keep it inside the screen at this width: let it shrink, wrap or stack",
  "row-gap": "fill the row at this width: span the columns, or stack the split",
  "fold-card": "end the card inside the first screen, or start it lower, so its whole edge shows",
  "hover-spill": "keep the hover state inside its column: no growth past the container",
  collide:
    "on a phone nothing lies on anything else: let the section grow with its content (min-height for its screens, never a fixed height; --hm: 2 when it needs two) or cut what it holds; keep pictures and cards off the buttons; pad the page under a fixed bar by the bar's height (top: the first section; end: the footer)",
  "tap-size":
    "make every link and control outside running text 44px tall on a phone: display: inline-flex; align-items: center; min-height: 44px (a footer list then needs no gap), a 44px small button, or a transparent ::before laid past the box",
  "overlap-text": "move the box off the text (or the text off the box)",
  "cut-text": "give the text room: no overflow clipping a line, no line past its box",
  "fold-cut": "size the hero so the heading ends above the fold, or starts below it",
  marquee: "drop the running line, or set it as full words that fit the screen",
  orphan: "rebalance the text (text-wrap: pretty, or a shorter line) so the last line holds more than one short word",
  "scroll-linked": "remove the scroll-driven motion; motion lives inside a visual as a small loop",
  "scroll-reveal": "show it at rest: no fade, rise or unmask when it is scrolled into view",
  pinned: "let the section scroll with the page",
  "no-visual": "give the section a visual: a UI fragment on a ground, real icons, or a photograph that fits",
  "card-visual": "give the cards a visual: an inset panel with a UI fragment, a photograph or real icons",
  "hidden-visual": "show the picture at rest; hover may only add to it",
  "card-family":
    "draw one card part one way: one fill and one title face for every card of a kind (one featured card may differ)",
  "button-styles": "one primary and one secondary button: one shape, one height per size, one label size",
  "button-shape": "square the button up: no skew, rotation or clip-path",
  "same-action": "draw one action the same way everywhere (only the nav copy may be one size smaller)",
  "label-centre": "centre the label in its button, or fill the empty side with an icon",
  "button-picture": "take the picture out of the button: a label, at most an icon",
  "fake-button": "make it a real link or button, or drop its button look",
  stagger: "start every row of the list on one left edge",
  "top-stagger": "align the tops of the boxes in the row (one floor, one ceiling)",
  "off-grid": "move it onto the page margin, or the column edge its section uses",
  "right-edge": "end it on the content's right edge, like the other blocks of its section",
  "centre-axis": "centre the block on its container (margin-inline: auto), or set it on the left grid",
  "stranded-action": "put the button under or beside the text it belongs to",
  tilt: "set it straight",
  contrast: "put the text on a calm part of the picture, or on a solid panel",
  "busy-ground": "move the text to a calm part of the picture, or put it on a panel",
  "section-gaps": "use one gap between sections (all within 25% of each other)",
  hole: "close the empty space: move the content together, or give the space the visual it lacks",
  "heading-scale": "size headings by level: the h1 largest, one size per level, each level below the one above",
  cta: "add the action: a button in the hero, one on every priced item, one in the closing section",
  links: "point every link at a real section, page or file",
  forms: "give the form an action that sends the request (an endpoint, or a mailto) and confirm it on the page",
  "photo-set": "grade the photographs to one look (light, colour, warmth), or replace the odd one out",
  "photo-upscale": "use a source at least as wide as the picture is shown (twice that for sharp screens)",
  "photo-credit":
    "confirm the library photograph shows the client's own product, place or people; otherwise replace it",
  "ui-fit": "give the fragment the width it needs (its meta.json size), or use a smaller fragment",
  "ui-centre": "centre the fragment (equal side gaps), or anchor it at a corner and cut it by the panel's edge",
  "dark-ground": "light the ground behind the UI (a daylight data-fx-palette): at least 3:1 against the card",
  "loop-pause": "add a pause button to the visual, or stop the loop on its finished picture within 5 s",
  webgl: "at most 4 live WebGL contexts: mount each effect when it comes on screen and destroy it when it leaves",
  "copy-headline":
    "say what is sold, and for whom or where, in the hero: the h1 in the form on the voice card (2 to 9 words), the category plain in the lead or the eyebrow",
  "copy-fact":
    "put one hard fact from the brief on the first screen: a number, a price, a date, the place, the platforms it runs on or a game's genre; take it from the brief or remove the claim",
  "copy-headings": "name the thing in every heading: the product, a part, the place or a section noun",
  "copy-buttons": 'label buttons with a verb and what the visitor gets ("Book a room", "Start free trial")',
  "copy-actions":
    "few actions, one wording: at most 2 in the hero, the main action word for word in nav, hero and close",
  placeholder:
    "write the real words: take the name or figure from the brief, or remove the claim; no bracketed placeholder ships",
  "sample-label":
    'drop the "sample" tags and any note that names and figures are examples: take each from the brief, or remove the claim',
  caption:
    "no line under a picture: never how it was made, what it shows, what is missing or what will follow (credits: one footer line)",
  "effect-repeat": "one effect id in two sections at most: deal another effect for the rest",
  "card-layout": "a card layout at most twice on a page: build the other sections another way",
  nesting:
    "two levels at most: a card holds a lit picture (no lines, dots or plain box behind the UI), the picture holds the UI",
  "pricing-tiers":
    "plan cards only for a subscription: show rooms, dishes or goods as themselves (a photograph, what it is, its price, one action)",
  "col-edge": "start the second column of every split on the same one or two grid columns",
  proximity: "leave 8px or more between a picture and its caption, and more between rows than inside a row",
  "text-contrast": "body text in the ink at 7:1 or more; grey (4.5:1 or more) only for captions and labels",
  "body-size": "set running text at 16px or more",
  "text-only": "give the section a visual: a photograph that fits, the real icons, or a UI fragment on a ground",
  "reduced-motion":
    "under prefers-reduced-motion: reduce, show every reveal in its finished state and hold every loop on its finished picture",
  "empty-visual":
    "make the visual draw at every width: a picture that loads, an effect that renders, or its still fallback; never an empty frame",
  "gl-fallback":
    "give the WebGL piece a still fallback (a picture or a CSS ground) that shows when its shader fails to compile or link",
  "shader-lint":
    "rename it (flat, smooth, centroid, sample, patch, input, output, filter and the rest are GLSL ES reserved words)",
  "hero-fill":
    "let the hero fill the first screen alone (min-height: 100svh, less above it): nothing of the next section on load",
  flush:
    "give the section its padding at the edge where the ground changes (the closing call keeps a clear gap above the footer)",
  "credit-wall": "one short credit line in the footer (or the credits on an imprint page): never a block of names",
  "unit-break": "keep a number with its unit: a no-break space (&nbsp;) between them",
  "effects-fit":
    "take the WebGL effects off this page, or keep one quiet treatment dealt by effects.mjs pick --page <kind> (grain-gradient, soft-light-bars, line-engraving, film-light-leak, duotone-grade); shader grounds are for tech, software, AI and gaming pages",
  "tab-wrap": "fit the tabs on one line at this width (shorter labels, a scrolling row), or let them stack evenly",
  "fade-cut":
    "fit the mock's rows inside its panel (fewer rows, a taller panel), or end the fade below the last whole row: no row half-erased",
  "photo-weight": "give each photograph srcset and sizes (an 800px and a 1600px file), or a smaller file",
  "copy-length": "cut the heading to one short line (2 to 12 words) and move the rest into the text under it",
  "button-contrast":
    "give the button a fill that stands at least 1.5:1 off what is around it, or an outline in the ink",
  "photo-repeat": "show each photograph once",
  "same-object":
    "give each section its own kind of visual: the world, the crew, the product in use, its parts, a diagram, a type moment; the object whole in three sections at most",
  "progress-bar": 'show the figure in words or as a number ("2 of 5 done"), not as a bar that fills',
  "nav-current":
    "mark the link of the section on screen (a colour, a weight or a line under it) as the visitor scrolls",
  "photo-print":
    "show the photograph plain (in colour, or greyed into the palette with CSS): no halftone, dither or engraving over it",
  grounds: "three flat grounds at most (the base, one surface, one inverse): lay the other bands on one of them",
  "split-align": "set every split one way: the text to the top of its visual, or every one centred on it",
  "fact-agree": "say each fact once, or the same everywhere: one opening time per day, one price per thing",
  "font-load":
    "load every family the type asks for: name it in the font link as start.mjs prints it, spelt as Google Fonts spells it, or ask for a family the page loads",
  "fold-action":
    "bring the hero's buttons onto the first screen: a shorter headline or line, the picture under the buttons",
  "action-count": "the main action in the nav, the hero and the closing call; give the other sections their own action",
  "one-screen":
    "give each section the screen (min-height: 100svh less the nav, its content centred), or join two short ones",
  "product-shown":
    "show the product itself: the client's photographs of it; a physical product with no photographs: stand-in photographs of its kind (photos.mjs search), a render (assets/objects/product-render, [data-product]) only when the brief asks for 3D, never mood stock in its place; drawn at 80% of the content width or more (60% FAILs), each view of it shown once",
  hover:
    "give buttons and links a small answer to the pointer (the motion layer: a fill change, a drawn underline, an arrow that moves)",
};
FIX["hover-move"] =
  'every linked card and linked photo answers the pointer: give the card class="card" (or the tile its media class) so motion.css lifts it 2px and zooms its photo; hover a linked card up 2px (translateY(-2px)) and zoom its photo to 1.02-1.03 inside its frame; no rotate, no 3D tilt, no growing card';
FIX["hidden-content"] =
  "show the content at rest: the hidden state only under a class the script adds on its live path, never in the plain CSS (prefers-reduced-motion and a script that never runs show the finished page)";
for (const M of MODULES) Object.assign(FIX, M.fixes || {});
const CHECKS = Object.keys(FIX);

// ---------------------------------------------------------------- copy (a study of fifteen company sites)
// terms from --category, --audience, --place, --products, --primary and --known-brand; without them, from a <title>
// written as the starter has it, "Name: what it is for whom" (and the meta description for the place)
const STOP = new Set(
  "a an the and or of for to in on at by with from your you our we it its is are be this that these those as into over under all any every each one two new more most very just about after before than then there their them they who what when where how why which not no yes will can do does did so up out off own per via plus also only near far".split(
    " ",
  ),
);
const norm = s =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[þÞ]/g, "th")
    .replace(/[ðÐ]/g, "d")
    .replace(/æ/gi, "ae")
    .replace(/ø/gi, "o")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const terms = s =>
  String(s || "")
    .split(/[,;|]/)
    .map(norm)
    .filter(Boolean);
const words = s =>
  norm(s)
    .split(" ")
    .filter(w => w.length >= 3 && !STOP.has(w));
// plurals only: "read" is not "reader", and a headline that says "read" does not name the reader it sells
const stem = w =>
  w
    .replace(/ies$/, "y")
    .replace(/([^s])s$/, "$1")
    .slice(0, Math.max(4, Math.min(w.length, 7)));
// does the text hold the term (a word or a phrase; plurals and joined compounds count)
function holds(text, term) {
  const t = norm(text);
  if (!term || !t) return false;
  if ((" " + t + " ").includes(" " + term)) return true;
  if (t.replace(/ /g, "").includes(term.replace(/ /g, "")) && term.replace(/ /g, "").length >= 6) return true;
  const tw = term.split(" ");
  if (tw.length > 1) return false;
  const s = stem(term);
  return s.length >= 4 && t.split(" ").some(w => w.length >= 4 && stem(w) === s);
}
const holdsAny = (text, list) => list.find(x => holds(text, x)) || null;
// copy-fact's other hard facts: the platforms a product or game runs on, written as the brands write them (the names
// that are plain words too, Windows, Chrome, Safari, Steam, Slack, Notion, Stripe, only on a tech, gaming or software
// page), a game's genre (on a gaming page only: "a co-op of farmers" is no genre), and a place named after a preposition
// outside a Title Case run ("rides in the Black Forest", "from Vicosoprano" have one; "Roasted in Every Batch" has none:
// a Title Case headline's place is passed with --place)
const PLATFORMS =
  /\b(iOS|iPadOS|Android|macOS|Linux|Firefox|PlayStation|PS[45]|Xbox|Nintendo Switch|Zendesk|Shopify|GitHub|GitLab|Figma|Salesforce|HubSpot|SumUp|Zettle|Help Scout|VS ?Code|JetBrains)\b/;
const PLATFORM_WORDS = /\b(Windows|Chrome|Safari|Steam|Slack|Notion|Stripe)\b/;
const GENRES =
  /\b(roguelikes?|roguelites?|rpgs?|role-playing game|platformers?|metroidvanias?|shooters?|fps|city-builders?|deck-?builders?|visual novel|mmos?|mobas?|co-?op|multiplayer|single-player|open-world|(strategy|puzzle|racing|survival|horror|sand-?box|simulation|sports|fighting|rhythm|adventure|action) games?)\b/i;
const PLACE_AT =
  /\b(in|at|near|from|across|around)\s+(the\s+)?(?!(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)\b)(\p{Lu}\p{Ll}{2,})/gu;
const placeAt = text => {
  const t = String(text || ""),
    long = w => (w.match(/\p{L}+/gu) || []).join("").length >= 4,
    cap = w => /^[^\p{L}]*\p{Lu}/u.test(w);
  for (const m of t.matchAll(PLACE_AT)) {
    if (STOP.has(m[3].toLowerCase())) continue;
    const near = [
      ...t.slice(0, m.index).trim().split(/\s+/).slice(-3),
      ...t
        .slice(m.index + m[0].length)
        .trim()
        .split(/\s+/)
        .slice(0, 2),
    ].filter(long);
    // two capitalised words around it and no lower-case one: a Title Case run, where every word wears a capital
    if (near.filter(cap).length >= 2 && near.every(cap)) continue;
    return m[0];
  }
  return null;
};
// words of one trade that name the same goods (a category in one of them counts in any)
const KIN = [
  ["ceramics", "ceramic", "pottery", "potter", "stoneware", "porcelain", "tableware"],
  ["coffee", "espresso", "roastery", "roaster", "cafe"],
  ["guesthouse", "guest house", "inn", "b&b", "bed and breakfast", "lodge"],
  ["bakery", "bakehouse", "bread", "sourdough"],
  ["bicycle", "bike", "bikes", "cycle"],
];
const SECTION_NOUNS = terms(
  "features,feature,terms,conditions,privacy,legal,pricing,prices,price,plans,plan,faq,questions,contact,menu,seasons,season,rooms,room,getting here,directions,visit,hours,opening times,location,address,map,about,team,customers,integrations,works with,how it works,reviews,testimonials,booking,book,order,specs,specifications,download,security,support,help,docs,blog,news,changelog,careers,jobs,press,shop,store,delivery,shipping,returns,warranty,gallery,photos,events,history,process,steps,services,products,product,apps,api,partners,compare,comparison,examples,templates,resources",
);
const VERBS = new Set(
  "book buy order pre-order preorder reserve try start get download compare see watch read find join subscribe sign contact add send configure request call email message visit plan check apply create open view copy shop schedule talk chat log register rent hire claim explore ask save pay upgrade choose pick enquire inquire donate install wishlist".split(
    " ",
  ),
);
const BANNED = new Set([
  "learn more",
  "read more",
  "view more",
  "show more",
  "discover",
  "discover more",
  "explore",
  "explore more",
  "more",
  "mehr erfahren",
  "weitere infos",
  "click here",
  "find out more",
  "see more",
  "begin",
  "an example",
  "details",
  "more info",
  "go",
]);
function copyTerms(P) {
  const t = {
    category: terms(CATEGORY),
    audience: terms(AUDIENCE),
    place: terms(PLACE),
    products: terms(PRODUCTS),
    primary: PRIMARY.trim(),
    from: "flags",
  };
  // a category given as a phrase ("coffee roastery and bar") also counts word by word, as the title's does
  for (const k of ["category", "place"])
    for (const c of [...t[k]]) if (c.includes(" ")) for (const w of words(c)) if (!t[k].includes(w)) t[k].push(w);
  // a trade's own words for one thing: "Ceramics studio" names pottery and tableware (a headline need not repeat the flag's noun)
  for (const c of [...t.category])
    for (const g of KIN)
      if (g.includes(c) || g.includes(stem(c))) for (const w of g) if (!t.category.includes(w)) t.category.push(w);
  if (!t.category.length) {
    // "Larkmoor: electric kettles for small offices", "Osk, a ceramics studio in Porto", "Brindle | Shoe repair shop in Leeds"
    const m = String(P.title).match(/^\s*([^:|–—,-]{1,40})\s*[:|–—,-]\s*(.+)$/);
    if (m && !/^\[/.test(m[2])) {
      const brand = norm(m[1]);
      let what = m[2],
        who = "";
      const f = what.match(/^(.*?)\s+for\s+(.+)$/i);
      if (f) {
        what = f[1];
        who = f[2];
      }
      const inP = what.match(/^(.*?)\s+(?:in|on|at|near)\s+(.+)$/i);
      if (inP) {
        what = inP[1];
        t.place.push(...terms(inP[2]).flatMap(x => [x, ...x.split(" ").filter(w => w.length >= 4)]));
      }
      t.category = words(what).filter(w => !brand.split(" ").includes(w)); // each content word of "what it is" names the category
      if (who) t.audience.push(...words(who));
      if (t.category.length) t.from = "the page title";
      // the trade's own words count from the title too ("rye and sourdough" names bread)
      for (const c of [...t.category])
        for (const g of KIN)
          if (g.includes(c) || g.includes(stem(c))) for (const w of g) if (!t.category.includes(w)) t.category.push(w);
    }
  }
  t.brand = norm(P.brand || String(P.title).split(/[:|–—,-]/)[0]);
  // names written with a capital inside a sentence (a town, a river, a product): the page's own proper nouns
  t.names = [];
  for (const src of [P.title, P.description, P.after, P.heroText])
    for (const sent of String(src || "").split(/[.!?:;|–—]\s+/)) {
      for (const w of sent.trim().split(/\s+/).slice(1)) {
        const c = w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
        if (c.length >= 4 && /^\p{Lu}/u.test(c) && !/^\p{Lu}+$/u.test(c)) {
          const k = norm(c);
          if (k && !STOP.has(k) && !t.names.includes(k)) t.names.push(k);
        }
      }
    }
  return t;
}
function copyChecks(P) {
  const F = [],
    T = copyTerms(P);
  const f = (check, sev, x, msg) =>
    F.push({
      check,
      sev,
      id: (x && x.id) || 0,
      sel: (x && x.sel) || "(the page)",
      text: x && (x.text || x.label) ? String(x.text || x.label).slice(0, 48) : "",
      msg,
      doc: (x && x.doc) || null,
    });
  // 1. the hero (h1, eyebrow and lead) names the category (and, for a brand nobody knows, the buyer or the place); the h1
  //    takes the hero form on the voice card (copy.md, rule 1), in 2 to 9 words
  if (!P.h1) f("copy-headline", "FAIL", null, "the page has no visible h1");
  else {
    const n = norm(P.h1.text).split(" ").filter(Boolean).length;
    if (!T.category.length)
      f(
        "copy-headline",
        "WARN",
        P.h1,
        `"${P.h1.text.slice(0, 60)}": no category known to check it against (pass --category, or write the <title> as "Name: what it is for whom")`,
      );
    else {
      const heroAll = `${P.h1.text} ${P.after || ""} ${P.heroText || ""}`;
      const inHero = holdsAny(heroAll, T.category);
      if (!inHero)
        f(
          "copy-headline",
          "FAIL",
          P.h1,
          `"${P.h1.text.slice(0, 60)}": neither the h1, the eyebrow nor the lead names what is sold (${T.category.slice(0, 4).join(", ")}, from ${T.from})`,
        );
      const who = [...T.audience, ...T.place];
      if (inHero && !KNOWN && who.length && !holdsAny(heroAll, who))
        f(
          "copy-headline",
          "FAIL",
          P.h1,
          `the hero (h1, eyebrow and lead) names neither the buyer nor the place (${who.slice(0, 4).join(", ")})`,
        );
    }
    if (n < 2 || n > 9)
      f("copy-headline", "WARN", P.h1, `the h1 has ${n} word${n === 1 ? "" : "s"} (2 to 9 read at a glance)`);
  }
  // 2. one hard fact on the first screen
  // (the platforms a product runs on, a game's genre, or a place named after in, at, near or from count as the fact too)
  const techKind = TYPE === "software" || TECH,
    platform = PLATFORMS.test(P.heroText) || (techKind && PLATFORM_WORDS.test(P.heroText));
  if (
    !/\d/.test(P.heroText)
    && !holdsAny(P.heroText, T.place)
    && !platform
    && !(/^(gaming|game|games)$/.test(KIND) && GENRES.test(P.heroText))
    && !placeAt(P.heroText)
  )
    f("copy-fact", "FAIL", P.h1 || null, "the first screen holds no number, price, date, place, platform or genre");
  // 3. every section heading names a thing (card titles are feature titles, read by the judge)
  const gloss = [
    ...T.category,
    ...T.products,
    ...T.place,
    ...T.audience,
    ...T.names,
    ...SECTION_NOUNS,
    ...(T.brand ? [T.brand] : []),
  ];
  const bareAll = P.heads.filter(
    h =>
      (h.level === 2 || (h.level === 3 && !h.card))
      && !h.foot
      && norm(h.full)
      && !/\d/.test(h.full)
      && !holdsAny(h.full, gloss),
  );
  // an h3 in a step or chapter list ("Baked in the morning", "Finished by hand") names a step of what the h2 names:
  // a WARN at most and never counted toward the FAIL, so good step headings are not flattened into noun labels
  const bare = bareAll.filter(h => !h.step);
  for (const h of bareAll.filter(x => x.step))
    f(
      "copy-headings",
      "WARN",
      h,
      `the step heading "${h.full.slice(0, 60)}" names no product, part or place: fine for a step when the section's h2 names the product`,
    );
  if (bare.length) {
    const sev = bare.length >= 2 && T.category.length ? "FAIL" : "WARN";
    for (const h of bare)
      f(
        "copy-headings",
        sev,
        h,
        `"${h.full.slice(0, 60)}" names no product, part, place or section${bare.length >= 2 ? ` (${bare.length} headings like it; at most one brand line per page)` : " (the one brand line a page may have)"}`,
      );
  }
  const bareCards = P.heads.filter(
    h =>
      h.level === 3
      && h.card
      && !h.foot
      && norm(h.full)
      && !/[0-9]/.test(h.full)
      && !holdsAny(h.full, gloss)
      && !h.full.split(/[ ]+/).every(w => /^[A-ZÀ-ÖØ-Þ]/.test(w)),
  );
  if (bareCards.length >= 2 && T.category.length)
    for (const h of bareCards)
      f(
        "copy-headings",
        "WARN",
        h,
        `the card title "${h.full.slice(0, 50)}" names no product, part, place or section (${bareCards.length} card titles like it)`,
      );
  // 4. button labels: a verb and what the visitor gets
  const labels = new Map();
  for (const c of P.ctas) {
    const k = norm(c.label);
    if (!k) continue;
    if (!labels.has(k)) labels.set(k, []);
    labels.get(k).push(c);
  }
  for (const [k, list] of labels) {
    const c = list[0],
      first = k.split(" ")[0],
      n = k.split(" ").length;
    if (BANNED.has(k)) {
      f(
        "copy-buttons",
        "FAIL",
        c,
        `"${c.label}" says nothing about what comes next${list.length > 1 ? ` (${list.length} buttons)` : ""}`,
      );
      continue;
    }
    const named = holdsAny(k, [...T.products, ...T.category, ...(T.brand ? [T.brand] : [])]);
    if (!VERBS.has(first) && !named)
      f("copy-buttons", "WARN", c, `"${c.label}" does not start with a verb (book, buy, try, start, get, see...)`);
    if (n > 5) f("copy-buttons", "WARN", c, `"${c.label}" is ${n} words (1 to 5)`);
  }
  // 5. few actions, one wording
  // (more than two hero actions: a FAIL, told at every width in runWidth)
  if (labels.size > 10)
    f("copy-actions", "WARN", null, `${labels.size} different button labels on the page (at most 10)`);
  const byHref = new Map();
  for (const c of P.ctas) {
    if (!c.href || /#$/.test(c.href)) continue;
    const k = c.href;
    if (!byHref.has(k)) byHref.set(k, new Set());
    byHref.get(k).add(c.label);
  }
  for (const [h, ls] of byHref)
    if (ls.size > 1)
      f(
        "copy-actions",
        "WARN",
        P.ctas.find(c => c.href === h),
        `${ls.size} labels for one target ${h.replace(/^.*\/\/[^/]+/, "")}: ${[...ls].map(x => `"${x}"`).join(", ")}`,
      );
  for (const [k, list] of labels) {
    const hs = new Set(list.map(c => c.href));
    if (list.length >= 3 && hs.size >= 3 && (BANNED.has(k) || k.split(" ").length === 1))
      f(
        "copy-actions",
        "WARN",
        list[0],
        `"${list[0].label}" on ${list.length} buttons that go to ${hs.size} different places`,
      );
  }
  const primary =
    T.primary
    || (P.ctas.find(c => c.where === "nav" && c.fill) || P.ctas.find(c => c.where === "hero" && c.fill) || {}).label
    || "";
  if (primary && P.last) {
    const inTop = P.ctas.some(c => (c.where === "nav" || c.where === "hero") && norm(c.label) === norm(primary));
    const inLast = P.ctas.some(c => c.where === "last" && norm(c.label) === norm(primary));
    if (!inTop || !inLast)
      f(
        "copy-actions",
        "WARN",
        null,
        `the main action "${primary}" does not read word for word the same in ${!inTop ? "the nav or hero" : ""}${!inTop && !inLast ? " and " : ""}${!inLast ? "the closing section" : ""}`,
      );
  }
  // nav labels: share a word with the heading of the section they open
  for (const l of P.navLinks) {
    if (T.brand && norm(l.label) === T.brand) continue;
    const lw = words(l.label).map(stem),
      hw = words(l.heading).map(stem);
    if (lw.length && !lw.some(w => hw.includes(w)))
      f("nav-labels", "WARN", l, `"${l.label}" opens a section headed "${l.heading.slice(0, 50)}"`);
  }
  return { F, T };
}

// ---------------------------------------------------------------- second pass: faults of the first test pages
// the effect families from the skill's own library (a pattern ground under a UI card in a card reads as three boxes)
const FAMILIES = (() => {
  const o = {};
  for (const root of assetRoots(TASTE).reverse()) {
    const dir = join(root, "effects"); // the kit first, so a pack's item of the same id wins
    try {
      for (const d of readdirSync(dir)) {
        try {
          const m = JSON.parse(readFileSync(join(dir, d, "meta.json"), "utf8"));
          if (m.id && m.family) o[m.id] = m.family;
        } catch {}
      }
    } catch {}
  }
  return o;
})();
// the page's type: --type, or read from --category and the title ("Larkmoor: a guesthouse in ..." is a place)
const PLACE_W =
  /\b(guest ?houses?|hotels?|hostels?|inns?|lodges?|cabins?|b ?& ?b|bed and breakfast|caf[eé]s?|coffee (bar|shop|house)|roaster(y|ies)|bars?|pubs?|restaurants?|bistros?|brasserie|bakery|bakeries|patisserie|deli|winery|brewery|distillery|gallery|museum|spa|salon|barber(shop)?|gym|venue|campsite|camping|apartments?|holiday homes?|chalets?|boutique|florist|bookshop|market hall|shop in|store in)\b/i;
const SOFT_W =
  /\b(app|apps|software|saas|platform|api|sdk|tool|tools|plugin|extension|dashboard|analytics|ai|assistant|editor|checker|proofreader|analysis|cloud|database|crm|automation)\b/i;
const PRODUCT_W =
  /\b(bikes?|bicycles?|e-?bikes?|scooters?|kettles?|lamps?|chairs?|sofas?|speakers?|headphones?|earbuds?|watch(es)?|shoes?|sneakers?|bags?|backpacks?|mattress(es)?|cameras?|phones?|cars?|strollers?|prams?|knives|cookware|furniture|rings?|glasses|helmets?|tents?|boards?|grinders?|machines?|printers?|keyboards?|drones?)\b/i;
let TYPE = "",
  KIND = "",
  KIND_FROM = "",
  TECH = false,
  NOKIND_TOLD = false;
// the kinds a page states (data-type, page-type, site-kind; taste-kind as a last alias) and the type the checks judge them as: tech and gaming are software
const KIND_OF = {
  tech: "software",
  gaming: "software",
  game: "software",
  games: "software",
  software: "software",
  ai: "software",
  saas: "software",
  app: "software",
  product: "product",
  place: "place",
  service: "service",
};
function pageKind(title, mk) {
  mk = mk || {};
  const site = /^(tech|software|gaming|game|games|ai|saas|app)$/.test(mk.siteKind || "") ? mk.siteKind : "";
  const order = [
    [TYPE_FLAG, "--type"],
    [mk.dataType, "<html data-type>"],
    [mk.pageType, '<meta name="page-type">'],
    [mk.pageKind === "place" ? "place" : "", '<meta name="page-kind">'],
    [site, '<meta name="site-kind">'],
    [mk.taste, '<meta name="taste-kind">'],
  ];
  for (const [v, from] of order) {
    const k = String(v || "")
      .trim()
      .toLowerCase();
    if (KIND_OF[k]) return { kind: k, from };
  }
  const t = pageType(title);
  return {
    kind: t,
    from:
      t ?
        CATEGORY ? "--category"
        : "read from the title"
      : "",
  };
}
function pageType(title) {
  if (TYPE_FLAG) return TYPE_FLAG.toLowerCase();
  const t = CATEGORY || String(title || "").replace(/^\s*[^:|–—]{1,40}[:|–—]\s*/, "");
  return (
    PLACE_W.test(t) ? "place"
    : SOFT_W.test(t) ? "software"
    : PRODUCT_W.test(t) ? "product"
    : ""
  );
}
function auditFindings(A, first, later) {
  const push = (check, sev, x, msg, extra) =>
    later.push(
      Object.assign(
        {
          check,
          sev,
          id: x ? x.id || 0 : 0,
          sel: x ? x.sel : "(the page)",
          text: x ? String(x.text || "").slice(0, 48) : "",
          msg,
          doc: x ? x.doc || null : null,
        },
        extra || {},
      ),
    );
  if (first) {
    for (const p of A.placeholders)
      push(
        "placeholder",
        "FAIL",
        p,
        `"${p.what}" is a placeholder left on the page${p.drawn ? " (in a drawn mock)" : ""}`,
      );
    for (const p of A.stand)
      push("placeholder", "WARN", p, `${p.n} link${p.n > 1 ? "s go" : " goes"} to a stand-in address (${p.href})`, {
        fix: "put in the real address, domain and number before the page ships",
      });
    if (A.samples.length > 2)
      push(
        "sample-label",
        "FAIL",
        A.samples[0],
        `${A.samples.length} lines tag the page's figures as samples: ${A.samples
          .slice(0, 4)
          .map(x => `"${x.text.slice(0, 36)}"`)
          .join(", ")}${A.samples.length > 4 ? ", ..." : ""}; one quiet note at most`,
        { more: A.samples.slice(1, 6).map(x => x.doc) },
      );
    for (const c of A.notes)
      push("caption", "FAIL", c, `a line about the page, not the client: "${c.what.slice(0, 60)}"`);
    for (const c of A.credits)
      push("caption", "WARN", c, `a licence credit under the picture ("${c.text.slice(0, 40)}")`, {
        fix: "put every credit in one line in the footer, never under the picture",
      });
    for (const e of A.effects)
      push(
        "effect-repeat",
        "FAIL",
        e,
        `the effect ${e.fx} is used ${e.n} times in ${e.secs.length} sections (${e.secs.join(", ")}); one effect id in two sections at most`,
        { more: e.more },
      );
    const byKey = new Map();
    for (const s of A.sections) {
      if (!byKey.has(s.key)) byKey.set(s.key, []);
      byKey.get(s.key).push(s);
    }
    for (const [k, list] of byKey)
      if (list.length > 2)
        push(
          "card-layout",
          "FAIL",
          list[0],
          `one layout (.${k.split(" ").join(" .")}) in ${list.length} sections: ${list.map(x => x.sel).join(", ")}; a card layout at most twice`,
          { more: list.slice(1).map(x => x.doc) },
        );
    for (const t of A.tiers) {
      if (t.sub || (t.table && !/^(place|product)$/.test(TYPE))) continue;
      push(
        "pricing-tiers",
        "WARN",
        t,
        t.table ?
          `a comparison table with ${t.n} prices and ticks, the shape of a software plan table, on a ${TYPE} page`
        : `${t.n} priced cards laid out as plans${t.feat ? ` (one marked "${t.feat.slice(0, 24)}")` : ""}${t.night ? ", priced per night" : ""}, with no subscription to choose${TYPE === "place" ? ": a place shows its rooms, menu or goods as themselves" : ""}`,
      );
    }
  }
  for (const g of A.groups) {
    const key = c => [c.cls, c.ground, c.place, c.frag].join("|");
    const cnt = new Map();
    for (const c of g.cards) cnt.set(key(c), (cnt.get(key(c)) || 0) + 1);
    const most = Math.max(...cnt.values()),
      places = new Set(g.cards.map(c => c.place)).size,
      grounds = new Set(g.cards.map(c => c.ground)).size;
    const oneGround = grounds === 1 && !!g.cards[0].ground;
    if (most >= 4)
      push(
        "card-layout",
        "FAIL",
        g,
        `${most} of ${g.n} cards drawn one way (one panel, ground, placement and fragment): copies of one card`,
      );
    else if (g.n >= 4 && (places < 3 || oneGround))
      push(
        "card-layout",
        "WARN",
        g,
        `${g.n} cards${places < 3 ? ` with ${places} placement${places > 1 ? "s" : ""} of their UI (vary them: rise, corner, a low stack, right)` : ""}${places < 3 && oneGround ? " and" : ""}${oneGround ? ` one ground on all of them (${g.cards[0].ground.split(" ")[0]})` : ""}`,
        { fix: "vary the cards of a group: at least three placements, and the ground in its own light on each" },
      );
  }
  const toldSec = new Set();
  for (const x of A.nests) {
    if (toldSec.has(x.sec)) continue;
    toldSec.add(x.sec);
    const same = A.nests.filter(y => y.sec === x.sec && y !== x);
    push(
      "nesting",
      "FAIL",
      x,
      `${x.depth} boxes deep: ${x.chain.join(" > ")} (${x.why})${same.length ? `; ${same.length} more like it in this section` : ""}`,
      { more: same.slice(0, 4).map(y => y.doc) },
    );
  }
  if (A.splits.length >= 3) {
    const xs = [];
    for (const s of A.splits) {
      const c = xs.find(q => Math.abs(q.x - s.x) <= 6);
      if (c) c.list.push(s);
      else xs.push({ x: s.x, list: [s] });
    }
    if (xs.length >= 3) {
      xs.sort((a, b) => a.x - b.x);
      push(
        "col-edge",
        "WARN",
        xs[0].list[0],
        `the second column starts at ${xs.length} places: ${xs.map(q => `${q.x}px (${q.list.map(s => s.secSel).join(", ")})`).join(", ")}`,
        { more: xs.slice(1).map(q => q.list[0].doc) },
      );
    }
  }
  for (const t of A.touch)
    push("proximity", "WARN", t, `touches the picture or panel above it (${t.gap}px)`, { more: [t.ref] });
  for (const r of A.rows)
    push(
      "proximity",
      "WARN",
      r,
      `the rows sit ${r.gap}px apart, about as close as a picture to its own caption (${r.inner}px): a caption reads with the row below`,
      { fix: "set the gap between rows at twice the gap between a picture and its caption or more" },
    );
}

// ---------------------------------------------------------------- second pass, later: faults of the second test pages
function extrasFindings(X, PG, AU, first, later, vw) {
  const push = (check, sev, x, msg, extra) =>
    later.push(
      Object.assign(
        {
          check,
          sev,
          id: x ? x.id || 0 : 0,
          sel: x ? x.sel : "(the page)",
          text: x ? String(x.text || "").slice(0, 48) : "",
          msg,
          doc: x ? x.doc || null : null,
        },
        extra || {},
      ),
    );
  for (const u of X.units.filter(x => !x.drawn).slice(0, 4))
    push(
      "unit-break",
      "WARN",
      u,
      `"${u.what}" breaks across two lines: the number ends one line and its unit starts the next`,
    );
  for (const t of X.tabWraps)
    push(
      "tab-wrap",
      "WARN",
      t,
      `the row of ${t.n} tabs wraps onto ${t.rows} lines and leaves "${t.text.slice(0, 30)}" alone on the last`,
    );
  // figures: one larger than the h1 (a FAIL), figures of the page in sizes far apart (a WARN)
  const figs = X.figures.filter(f => !f.foot && !f.head);
  const h1s = PG ? PG.heads.filter(h => h.level === 1 && !h.foot).map(h => h.fs) : [];
  const top = h1s.length ? Math.max(...h1s) : null;
  for (const f of figs.filter(x => top && x.fs > top + 0.5).slice(0, 2))
    push("heading-scale", "FAIL", f, `the figure "${f.text}" is set at ${f.fs}px, larger than the h1 (${top}px)`, {
      fix: "set figures below the h1: a stat reads as data, not as the headline",
    });
  // a figure over the section headings (the readers counted every one: "6 hours" at 64px over 48px h2s), told once
  {
    const h2s =
      PG ?
        PG.heads
          .filter(h => h.level === 2 && !h.foot && !h.card && !h.moment)
          .map(h => h.fs)
          .sort((a, b) => a - b)
      : [];
    const m2 = h2s.length ? h2s[Math.floor(h2s.length / 2)] : null;
    // (a price in its plan or product card is the card's own figure: the readers never counted one)
    const over =
      m2 ?
        figs.filter(
          x => x.fs >= m2 * 1.08 && !(top && x.fs > top + 0.5) && !/[€$£¥]|\b(EUR|USD|GBP|CHF|ISK|kr)\b/.test(x.text),
        )
      : [];
    if (over.length)
      push(
        "heading-scale",
        "FAIL",
        over[0],
        `the figure "${over[0].text}" is set at ${over[0].fs}px, larger than the section headings (h2 ${m2}px)${over.length > 1 ? `; ${over.length - 1} more like it` : ""}`,
        {
          more: over.slice(1, 4).map(x => x.doc),
          fix: "set figures at the h2 size or under: a stat reads as data, not as the heading",
        },
      );
  }
  if (figs.length >= 2) {
    const sizes = [...new Set(figs.map(f => Math.round(f.fs)))].sort((a, b) => a - b);
    if (sizes[sizes.length - 1] / sizes[0] > 1.35) {
      const big = figs.find(f => Math.round(f.fs) === sizes[sizes.length - 1]),
        small = figs.find(f => Math.round(f.fs) === sizes[0]);
      push(
        "heading-scale",
        "WARN",
        big,
        `figures in ${sizes.length} sizes, ${sizes.join(", ")}px ("${small.text}" at ${small.fs}px, "${big.text}" at ${big.fs}px)`,
        { more: [small.doc], fix: "set the page's figures (stats, measures, prices) in one or two sizes" },
      );
    }
  }
  // credits: one short line in the footer
  if (X.credits) {
    // the house rule is one footer line: at a desktop width more than one line or more than one block is a wall, however
    // many credits the line holds (a licence may need five names); narrower, the one line wraps, so a wall is a second
    // block, over 220 characters, or five lines and more
    const c = X.credits,
      wall = vw >= 1000 ? c.blocks >= 2 || c.lines >= 2 : c.blocks >= 2 || c.chars > 220 || c.lines >= 5;
    if (wall)
      push(
        "credit-wall",
        "FAIL",
        c,
        `the photo credits fill ${c.lines} line${c.lines > 1 ? "s" : ""} in ${c.blocks} block${c.blocks > 1 ? "s" : ""} (${c.entries} credits, ${c.chars} characters): a wall of credits`,
      );
  }
  if (X.btnWidth) {
    const a = X.btnWidth.auto[0];
    push(
      "button-styles",
      "WARN",
      a,
      `on the phone ${X.btnWidth.full} buttons run the full width of their column, but ${X.btnWidth.auto.length > 1 ? `${X.btnWidth.auto.length} keep their own width, like` : ""} "${a.text.slice(0, 30)}" is ${a.w}px of ${a.inner}px: one action in two sizes`,
      {
        more: X.btnWidth.auto.slice(1, 4).map(x => x.doc),
        fix: "give every button the same width rule on the phone: all full width, or all at their own width",
      },
    );
  }
  for (const p of (X.fragPlaces || []).slice(0, 2))
    if (vw >= 700)
      push(
        "ui-centre",
        "WARN",
        p,
        `in a group of ${p.n} cards, the UI of ${p.odd} sits ${Math.abs(p.off)}% of its panel's width to the ${p.off > 0 ? "right" : "left"} of where the others sit (${p.med === 0 ? "the middle" : `${p.med}% off the middle`}): one card group, two placements`,
        {
          more: p.more,
          fix: "place the UI the same way in every card of the group: all centred, or all pinned to the same edge",
        },
      );
  if (first && X.progress && X.progress.length) {
    const p = X.progress[0];
    push(
      "progress-bar",
      "WARN",
      p,
      `${X.progress.length > 1 ? `${X.progress.length} progress or meter bars` : "a progress or meter bar"} on the page${p.fixed ? " (fixed to the screen)" : ""}, like the one in "${p.text.slice(0, 30)}": the house rules have no drag or progress bars`,
      { more: X.progress.slice(1).map(x => x.doc) },
    );
  }
  // on a product page one view twice is a fault (the same side view in two sections reads as a page with few pictures), not a hint; elsewhere a WARN
  for (const p of (X.repeats || []).slice(0, 3))
    push(
      "photo-repeat",
      TYPE === "product" ? "FAIL" : "WARN",
      p,
      `the photograph ${p.text} is shown ${p.n} times on the page: a picture the visitor has already seen`,
      {
        more: p.more,
        fix:
          TYPE === "product" ?
            "show each view of the product once: the hero side, the product section three-quarter, the use scene, the parts as close-ups or the exploded view, the order rear-quarter"
          : "show each photograph once: a different picture of what this section names, or none",
      },
    );
  // the same VIEW in another colour is the same picture (product pages only): a recoloured side view is still the side view; WARN, FAIL when the
  // two sit in neighbouring sections (or the same colour twice)
  if (TYPE === "product")
    for (const p of (X.viewRepeats || []).slice(0, 3))
      push(
        "photo-repeat",
        p.adjacent || p.sameColour ? "FAIL" : "WARN",
        p,
        `the ${p.text} view of the product is shown ${p.n} times (${p.where.join(", ")})${p.colours.length ? ` in ${p.colours.join(", ")}` : ""}: another colour is not another picture${p.adjacent ? ", and two of them sit in neighbouring sections" : ""}`,
        {
          more: p.more,
          fix: "give every picture of the product its own view: the hero side, the product section three-quarter, the use scene, the parts as close-ups or the exploded view, the order rear-quarter; the product whole in three sections at most",
        },
      );
  // same-object (a product, tech or gaming page): one object shown WHOLE (a render's spec in a whole view or colour, or one still's stem; no use scene,
  // close-up or exploded view) as the main visual of more than three sections is one picture told again and again (the hero and two more are allowed)
  if (first && (TYPE === "product" || TECH) && X.sameObject && X.sameObject.n >= 4) {
    const o = X.sameObject;
    push(
      "same-object",
      "WARN",
      o,
      `one object, ${o.text}, is shown whole as the main visual of ${o.n} of the page's ${o.total} sections (${o.where.join(", ")}): the page shows one thing again and again in other views`,
      {
        more: o.more,
        fix: "give each section its own kind of visual: the world it lives in, the crew or the people who use it, the product in use, its parts as close-ups, a diagram of how it works, or a type moment (a large word or figure); the object whole in three sections at most (the hero and two more)",
      },
    );
  }
  if (vw < 700 && X.heavy && X.heavy.length) {
    const h = [...X.heavy].sort((a, b) => b.kb - a.kb)[0];
    push(
      "photo-weight",
      "WARN",
      h,
      `${X.heavy.length > 1 ? `${X.heavy.length} photographs are` : "a photograph is"} 3x or more wider than drawn on the phone, with no srcset: ${h.text} is ${h.nw}px (${h.kb} KB${h.lazy ? ", lazy" : ""}) for a ${h.w}px frame; on a phone it arrives late and its frame shows only its ground until then`,
      {
        more: X.heavy.slice(1, 5).map(x => x.doc),
        fix: "give each photograph srcset and sizes (a 800px and a 1600px file), or a smaller file: the frame never shows empty",
      },
    );
  }
  for (const s of (X.stackGap || []).slice(0, 3))
    push(
      "proximity",
      "WARN",
      s,
      `stacked at this width, the visual starts ${s.d}px under the text and buttons above it ("${s.text.slice(0, 30)}"): it reads glued to them`,
      { fix: "give the stacked split the section's own gap between text and visual (40px or more on a phone)" },
    );
  if (!first) return;
  // credit links: one footer line; the list of photographers and licences is a page of its own, never a link per photograph in the footer
  if (X.creditLinks && X.creditLinks.n > 2 && !later.some(l => l.check === "credit-wall" && l.sev === "FAIL")) {
    const c = X.creditLinks;
    push(
      "credit-wall",
      "FAIL",
      c,
      `the footer holds ${c.n} links that credit photographs${c.hidden ? ` (${c.hidden} of them hidden in a closed list)` : ""}: a credit wall; the footer holds one line, and the list of photographers and licences is a page of its own`,
      {
        fix: 'one footer line ("Photographs via Unsplash and Wikimedia Commons") linking credits.html; the list is that page: node <skill>/scripts/photos.mjs credits --out <site folder> --write',
      },
    );
  }
  for (const m of X.menuDup || [])
    push(
      "nav-labels",
      "WARN",
      m,
      `${m.n} entries of one menu go to the same place (${m.href}): ${m.labels.map(t => `"${t}"`).join(", ")}`,
      { fix: "give each menu entry its own target (its section, its tab, its page), or show fewer entries" },
    );
  const told = new Set([...(AU ? AU.notes : []), ...(AU ? AU.placeholders : [])].map(x => x.id));
  for (const e of X.examples)
    if (!told.has(e.id))
      push(
        "sample-label",
        "FAIL",
        e,
        `a note that the page's names or figures are examples ("${e.what.slice(0, 50)}"): it reads as an apology and undercuts every claim`,
      );
  for (const e of X.explain)
    if (!told.has(e.id))
      push("caption", "FAIL", e, `a caption that explains the picture ("${e.what.slice(0, 40)}")`, { more: [e.ref] });
  if (X.captions.length) {
    const c = X.captions[0];
    push(
      "caption",
      "WARN",
      c,
      `${X.captions.length > 1 ? `${X.captions.length} lines of words sit` : "a line of words sits"} right under a picture, like "${c.text.slice(0, 40)}": the section's text says it, or the picture speaks for itself`,
      { more: X.captions.slice(1, 5).map(x => x.doc) },
    );
  }
  for (const p of X.printed.slice(0, 3))
    push("placeholder", "FAIL", p, `a stand-in contact printed on the page ("${p.what}"): no visitor can use it`, {
      fix: "print the real address and number, or a form or a button that names the action: never an example.com address or a number of zeros",
    });
  for (const f of X.formNest)
    push("nesting", "WARN", f, `the form sits ${f.chain.length} boxes deep: ${f.chain.join(" > ")}`, {
      fix: "set the form on the section or on one card: its fields are the second box",
    });
}
// ---------------------------------------------------------------- v4: what the readers still counted
// photo-print, grounds, split-align, fact-agree, the menu button's fill, one-screen (read in the page by moreChecks),
// fold-action and action-count (read from the page's actions)
function moreFindings(M, PG, first, later, vw, vh, T) {
  const push = (check, sev, x, msg, extra) =>
    later.push(
      Object.assign(
        {
          check,
          sev,
          id: x ? x.id || 0 : 0,
          sel: x ? x.sel : "(the page)",
          text: x ? String(x.text || "").slice(0, 48) : "",
          msg,
          doc: x ? x.doc || null : null,
        },
        extra || {},
      ),
    );
  if (PG) {
    // fold-action: the hero's buttons on the first screen (a second hero button under the phone's fold)
    const heroC = PG.ctas.filter(c => c.where === "hero");
    // (a button showing less than 8px above the fold is not seen either; one cut further up is fold-cut's)
    heroC.forEach((c, i) => {
      if (c.doc.top >= vh - 8)
        push(
          "fold-action",
          i === 0 ? "FAIL" : "WARN",
          c,
          `the hero's ${i === 0 ? "main" : "second"} button "${c.label.slice(0, 30)}" ${c.doc.top >= vh ? `starts ${Math.round(c.doc.top - vh)}px below` : `shows only ${Math.round(vh - c.doc.top)}px of itself at the bottom of`} the first screen (${vh}px tall): it is not seen on load`,
        );
    });
    // action-count: the main action shown on five or more buttons (figma.com shows its own three times)
    if (first) {
      const main =
        PRIMARY.trim()
        || (PG.ctas.find(c => c.where === "nav" && c.fill) || PG.ctas.find(c => c.where === "hero" && c.fill) || {})
          .label
        || "";
      const same = main ? PG.ctas.filter(c => norm(c.label) === norm(main)) : [];
      const key = String(main)
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, " ")
          .trim(),
        all = Math.max(same.length, (M && M.labels && M.labels[key]) || 0);
      if (all >= 5 && same.length)
        push(
          "action-count",
          "WARN",
          same[same.length - 1],
          `the main action "${main.slice(0, 30)}" is on ${all} buttons and links: the nav, the hero and the closing call carry it; elsewhere a section has its own action`,
          { more: same.slice(0, -1).map(c => c.doc) },
        );
    }
    // the menu button in a fill no button of the page uses
    if (M && M.toggle) {
      const fills = [...new Set(PG.ctas.filter(c => c.fill && /^#/.test(c.fill)).map(c => c.fill))];
      const hx = s => ({
        r: parseInt(s.slice(1, 3), 16),
        g: parseInt(s.slice(3, 5), 16),
        b: parseInt(s.slice(5, 7), 16),
      });
      const near = fills.some(f => {
        const a = hx(f),
          b = hx(M.toggle.fill);
        return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b)) <= 12;
      });
      if (!near && fills.length)
        push(
          "button-styles",
          "WARN",
          M.toggle,
          `the menu button is filled in ${M.toggle.fill}, a fill none of the page's buttons use (${fills.slice(0, 3).join(", ")}): one more button look`,
          { fix: "draw the menu button as the secondary button (an outline in the ink) or as a bare icon" },
        );
    }
  }
  if (!M) return;
  // product-shown (house rule: a product page never hides its product): on a product page, no picture says it shows the product
  // (no alt text, picture label, object or print names its noun or a product name): mood stock stands in for it
  // words a screen (house rule: professional sites say little; the inspector counted 117 on a fintech page): on a tech, gaming or software page, a
  // section of more than about 80 words a screen, the words in UI mocks left out, WARNs; one finding names the heaviest
  if (first && TECH && vw >= 1000 && M.words && M.words.length) {
    const rows = M.words.map(w => ({ ...w, per: Math.round(w.words / w.screens) })),
      heavy = rows.filter(w => w.per > 90 && w.words > 60).sort((a, b) => b.per - a.per);
    const total = rows.reduce((a, w) => a + w.words, 0),
      screens = rows.reduce((a, w) => a + w.screens, 0),
      avg = Math.round(total / Math.max(1, screens));
    if (heavy.length || avg > 80) {
      const w = heavy[0] || [...rows].sort((a, b) => b.per - a.per)[0];
      push(
        "copy-length",
        "WARN",
        w,
        `${
          heavy.length ?
            `${heavy.length} section${heavy.length > 1 ? "s" : ""} over 90 words a screen outside the UI mocks (${heavy
              .slice(0, 3)
              .map(h => `"${h.text.slice(0, 24)}" ${h.per}`)
              .join(", ")})`
          : "the page"
        }; ${avg} words a screen across the page (${total} words in ${Math.round(screens * 10) / 10} screens): a tech page says it in about 80 or fewer`,
        {
          fix: "cut every section to its heading, one line and the product UI: the UI says the rest; no second paragraph, no list of feature sentences",
        },
      );
    }
  }
  // a physical product's page shows the product in its hero (a photograph, a video or a render the page mounts); a page that leads with type on a
  // ground and shows the product nowhere in its hero FAILs, whatever else the page says
  let heroBare = false;
  if (first && TYPE === "product" && M.hero && !(M.heroMedia || []).length) {
    heroBare = true;
    push(
      "product-shown",
      "FAIL",
      M.hero,
      `the hero of this product page shows no photograph and no render of the product: ${
        (M.picLabels || []).length ?
          `the page's pictures (${M.picLabels
            .slice(0, 3)
            .map(l => `"${l.slice(0, 30)}"`)
            .join(", ")}) sit below it`
        : "the page has no picture of it at all"
      }`,
      {
        fix: "lead with the product itself: the client's photograph of it, else stand-in photographs of its kind (photos.mjs search), a render (assets/objects/product-render, [data-product], data-product-place=hero) only when the brief asks for 3D; never a drawing, never mood stock, never another maker's product",
      },
    );
  }
  // A product hero shows the product at the size the judges read it: the drawn bounds of its picture (the subject, not the frame round it)
  // under 60% of the container's content width FAILs, 60-80% WARNs (at a desktop width: 1440 and 1024, where the stage is a wide box)
  if (vw >= 1000 && !heroBare && TYPE === "product" && M.heroProduct && M.heroProduct.frac < 0.8) {
    const h = M.heroProduct,
      fail = h.frac < 0.6,
      pc = Math.round(h.frac * 100);
    push(
      "product-shown",
      fail ? "FAIL" : "WARN",
      h,
      `the hero's product is drawn ${h.w} x ${h.h}px, ${pc}% of the ${h.content}px content width at ${vw}px (its ${h.tag} is ${h.boxW}px wide${h.how === "estimate" ? "; the product inside a live canvas is estimated from its frame" : ""}): a product page shows the product at 80% of the content width or more (under 60% FAILs)`,
      {
        more: h.more,
        fix: "make the product the hero: the picture across the full content width (a stage as wide as the container, the product filling it, not a rounded box with the product at its middle); a render's still cropped to the product (data-product-fill up to 1.2, a wide view such as side), or the client's photograph at full width",
      },
    );
  }
  if (first && !heroBare && TYPE === "product" && T && T.category && T.category.length) {
    // any word of the category names the product ("roasted coffee beans": coffee, beans), not only its last; a miss is a
    // WARN, since the alt text may name the thing in other words (a cappuccino on a coffee page)
    const noun = T.category[T.category.length - 1];
    const names = [
      ...new Set([
        ...T.category.filter(
          w => w.length > 2 && !/^(and|for|the|with|from|our|your|made|hand|small|fine|best|new|own|good)$/i.test(w),
        ),
        ...(T.products || []),
      ]),
    ];
    const shows = (M.picLabels || []).filter(
      l => holdsAny(l, names) && !/\b(drawing|stand(s|ing)? in|placeholder|until (the )?photo)/i.test(l),
    );
    if (!shows.length)
      push(
        "product-shown",
        "WARN",
        null,
        `no picture on this product page shows the ${noun}: ${
          (M.picLabels || []).length ?
            `its ${M.picLabels.length} pictures are ${M.picLabels
              .slice(0, 3)
              .map(l => `"${l.slice(0, 40)}"`)
              .join(", ")}${M.picLabels.length > 3 ? ", ..." : ""}`
          : "none of its pictures says what it shows (no alt text)"
        }`,
        {
          fix: `show the ${noun} itself: the client's photographs, a render or a print object of it (assets/objects), never mood stock in its place`,
        },
      );
  }
  // photo-print: a print over a photograph (house rule: no print over the hero photo; a place or a product shows its
  // photographs plain)
  for (const p of M.prints.slice(0, 3)) {
    const fail = !TECH || p.hero;
    push(
      "photo-print",
      fail ? "FAIL" : "WARN",
      p,
      `the photograph ${p.text} is drawn over by a print (a halftone, dither or engraving canvas)${p.hero ? " in the hero" : ""}${TYPE && !TECH ? ` on a ${TYPE} page` : ""}: its sky and light parts drop out to the page's ground`,
      {
        fix: "show the photograph plain (in colour, or greyed into the palette with CSS); a print belongs on a software page's secondary picture at most",
      },
    );
  }
  // grounds: base, surface and inverse; a fourth flat ground across the page reads as one more system
  if (M.grounds.length > 3) {
    const g = [...M.grounds].sort((a, b) => a.n - b.n)[0];
    push(
      "grounds",
      "WARN",
      g,
      `${M.grounds.length} flat grounds across the page (${M.grounds.map(x => `${x.hex} ${x.what}${x.n > 1 ? ` x${x.n}` : ""}`).join(", ")}): three at most (the base, a surface, an inverse)`,
      {
        more: M.grounds
          .filter(x => x !== g)
          .slice(0, 4)
          .map(x => x.doc),
      },
    );
  }
  // split-align: the splits set their text against their visual two ways (one to the top, one to the middle)
  if (vw >= 1000) {
    const kinds = new Map();
    for (const s of M.splits) {
      if (s.how === "loose") continue;
      if (!kinds.has(s.how)) kinds.set(s.how, []);
      kinds.get(s.how).push(s);
    }
    if (kinds.size >= 2) {
      const [few] = [...kinds.values()].sort((a, b) => a.length - b.length);
      push(
        "split-align",
        "WARN",
        few[0],
        `the splits sit two ways: ${[...kinds]
          .map(
            ([k, l]) =>
              `${l.length} to the ${k} of the taller side (${l
                .slice(0, 3)
                .map(s => `"${s.text.slice(0, 22)}"`)
                .join(", ")})`,
          )
          .join("; ")}`,
        {
          more: few.slice(1, 4).map(s => s.doc),
          fix: "set every split one way: the text to the top of its visual, or every one centred on it",
        },
      );
    }
    // a picture floating in the middle of a taller column of text: its top and bottom line up with nothing (the readers'
    // road photo 57px under its heading, the map centred on the visit list)
    const fl = M.splits.filter(s => s.short === "visual" && s.how !== "top" && s.gap >= 120);
    if (fl.length)
      push(
        "split-align",
        "WARN",
        fl[0],
        `the picture beside "${fl[0].text.slice(0, 30)}" sits ${fl[0].how === "middle" ? "centred on" : "loose against"} a text column ${fl[0].gap}px taller: its top and bottom line up with nothing${fl.length > 1 ? ` (${fl.length - 1} more like it)` : ""}`,
        {
          more: fl.slice(1, 4).map(s => s.doc),
          fix: "set the picture's top on the heading's top (align-items: start), or let it run the column's full height",
        },
      );
  }
  // links that say "this" (this room, this plan) from several cards, all to one place: none picks its own card's thing
  if (first)
    for (const l of (M.thisLinks || []).slice(0, 2))
      push(
        "links",
        "WARN",
        l,
        `${l.n} "${l.text}" links in ${l.n} cards all go to ${l.href}: none says which one was chosen`,
        {
          more: l.more,
          fix: 'let each link carry its choice (#booking?room=fjara, a preset the form reads), or name the shared target ("Book a room")',
        },
      );
  // fact-agree: one day, two opening hours
  if (first)
    for (const h of M.hours.slice(0, 2))
      push(
        "fact-agree",
        h.two ? "FAIL" : "WARN",
        h,
        `the opening hours disagree for ${h.days.map(d => d[0].toUpperCase() + d.slice(1)).join(", ")}: ${h.say[0]} against ${h.say.slice(1).join(", ")}`,
        {
          more: h.more,
          fix: "say each opening time once, or the same everywhere (a table of the week, and the same figures in the hero and the visit block)",
        },
      );
  // one-screen: a section shorter than the screen, its neighbour's heading or picture in view with it (at a desktop width)
  if (vw >= 1000 && M.short.length) {
    const s = M.short[0];
    push(
      "one-screen",
      "WARN",
      s,
      `${M.short.length} section${M.short.length > 1 ? "s are" : " is"} shorter than the screen, so the next one's heading or picture shows with ${M.short.length > 1 ? "them" : "it"}: "${s.text}" is ${s.h}px of the ${s.room}px under the nav, and "${s.next}" shows below it${
        M.short.length > 1 ?
          ` (${M.short
            .slice(1, 4)
            .map(x => `"${x.text.slice(0, 20)}"`)
            .join(", ")})`
        : ""
      }`,
      {
        more: M.short.slice(1, 4).map(x => x.doc),
        fix: "give each section the screen (min-height: 100svh less the nav, its content centred), or join two short ones into one",
      },
    );
  }
}
// shader-lint: GLSL ES reserved words used as names. SwiftShader (the checker's CPU WebGL) compiles some of them; a strict
// GPU driver rejects the whole shader and the visual stays empty (a struct field named flat left a hero blank)
const GLSL_RESERVED = new Set(
  (
    "input output filter sample patch active common partition resource subroutine coherent restrict readonly writeonly noperspective atomic_uint "
    + "asm class union enum typedef template this packed goto inline noinline volatile public static extern external interface long short double half fixed unsigned superp "
    + "cast namespace using sizeof hvec2 hvec3 hvec4 dvec2 dvec3 dvec4 fvec2 fvec3 fvec4 sampler1D sampler1DShadow sampler1DArray sampler1DArrayShadow sampler2DRect sampler2DRectShadow "
    + "sampler3DRect isampler1D usampler1D samplerBuffer isamplerBuffer usamplerBuffer image1D image2D image3D imageCube imageBuffer iimage2D uimage2D "
    + "iimage1D iimage3D iimageCube uimage1D uimage3D uimageCube image1DArray image2DArray iimage1DArray iimage2DArray uimage1DArray uimage2DArray iimageBuffer uimageBuffer "
    + "isampler1DArray usampler1DArray isampler2DRect usampler2DRect sampler2DMS isampler2DMS usampler2DMS sampler2DMSArray isampler2DMSArray usampler2DMSArray"
  ).split(" "),
);
// reserved in GLSL ES 1.00 (WebGL 1) and keywords or types in 3.00: a name only in a shader without #version 300 es
const GLSL_RESERVED_ES1 = new Set(["switch", "default", "sampler3D", "sampler2DShadow"]);
const GLSL_QUAL = new Set(["flat", "smooth", "centroid"]); // qualifiers: only before in, out or varying
const GLSL_MACROS = new Set(["__LINE__", "__FILE__", "__VERSION__"]);
const GL_BUILTIN =
  /^gl_(Position|PointSize|FragCoord|FrontFacing|FragColor|FragData|PointCoord|FragDepth(EXT)?|VertexID|InstanceID|DepthRange|DepthRangeParameters|Max\w+|LastFragData|LastFragColor(ARM)?|ViewID_OVR|SecondaryFragColorEXT|SecondaryFragDataEXT)$/;
const isGLSL = s =>
  /\bvoid\s+main\s*\(/.test(s)
  || ((
    s.match(
      /\b(vec[234]|mat[234]|float|uniform|varying|gl_FragColor|gl_Position|sampler2D|texture2D|smoothstep|fract|mix|clamp)\b/g,
    ) || []
  ).length >= 4
    && /;/.test(s)
    && /\b(vec[234]|float)\b/.test(s));
function glslIn(js) {
  const out = [];
  for (const m of js.matchAll(/`((?:\\[\s\S]|\$\{(?:[^{}]|\{[^{}]*\})*\}|[^`\\])*)`/g)) {
    const s = m[1].replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, x => " ".repeat(x.length));
    if (s.length > 40 && isGLSL(s)) out.push(s);
  }
  for (const m of js.matchAll(/(["'])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    if (m[2].length < 60) continue;
    const s = m[2].replace(/\\n/g, "\n");
    if (isGLSL(s)) out.push(s);
  }
  // a shader written as short lines in an array joined with '\n', or strings added with +: the run of literals is read
  // as one source (a shader compiled only on a click is never seen by the runtime lint)
  for (const m of js.matchAll(/(?:(["'])(?:\\.|(?!\1)[^\\\n])*\1\s*[,+]\s*){2,}(["'])(?:\\.|(?!\2)[^\\\n])*\2/g)) {
    const parts = [...m[0].matchAll(/(["'])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map(x => x[2].replace(/\\n/g, "\n"));
    const s = parts.join("\n");
    if (s.length > 40 && isGLSL(s)) out.push(s);
  }
  return out;
}
function lintGLSL(src) {
  const blank = x => x.replace(/[^\n]/g, " ");
  // a macro the source defines is replaced before the compiler reads the name: three.js's own prefix writes
  // "#define attribute in" and "#define varying out" under #version 300 es, and real GPUs take it. The defined names are
  // legal in the body, and the "#define NAME" itself is not read (its replacement text is)
  const macros = new Set([...src.matchAll(/^[ \t]*#[ \t]*define[ \t]+([A-Za-z_]\w*)/gm)].map(m => m[1]));
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/[^\n]*/g, blank)
    .replace(
      /^[ \t]*#[ \t]*(version|extension|pragma|line|if|ifdef|ifndef|else|elif|endif|error|undef)\b[^\n]*/gm,
      blank,
    )
    .replace(/^[ \t]*#[ \t]*define[ \t]+[A-Za-z_]\w*(?:\([^)\n]*\))?/gm, blank);
  const toks = [...code.matchAll(/[A-Za-z_]\w*|[^\sA-Za-z_\w]/g)];
  const hits = [],
    es3 = /^[ \t]*#[ \t]*version[ \t]+3\d\d[ \t]+es\b/m.test(src);
  toks.forEach((m, i) => {
    const t = m[0];
    if (macros.has(t)) return;
    let bad = GLSL_RESERVED.has(t) || (!es3 && GLSL_RESERVED_ES1.has(t));
    if (!bad && GLSL_QUAL.has(t)) {
      const nx = toks[i + 1] && toks[i + 1][0];
      bad = !/^(in|out|varying|centroid|smooth|flat|inout)$/.test(nx || "");
    }
    // removed in GLSL ES 3.00: attribute and varying under #version 300 es fail to compile
    if (!bad && es3 && (t === "attribute" || t === "varying")) bad = true;
    // reserved prefixes: webgl_ and _webgl_ (WebGL), gl_ for anything that is not a built-in, and any name holding __
    if (
      !bad
      && (/^_?webgl_/.test(t) || (/__/.test(t) && !GLSL_MACROS.has(t)) || (/^gl_/.test(t) && !GL_BUILTIN.test(t)))
    )
      bad = true;
    if (!bad) return;
    // a field or a swizzle after a dot is a name too; a word inside a string is not GLSL at all
    const line = code.slice(0, m.index).split("\n").length;
    if (!hits.some(h => h.word === t))
      hits.push({ word: t, line, text: (src.split("\n")[line - 1] || "").trim().slice(0, 90) });
  });
  return hits;
}
async function shaderLint(GI, base) {
  const srcs = GI.shaders.map(s => ({ src: s.src, from: `compiled by ${s.host}` }));
  const origin = (() => {
    try {
      return new URL(base).origin;
    } catch {
      return "";
    }
  })();
  for (const u of GI.files) {
    try {
      const x = new URL(u);
      if (x.origin !== origin) continue; // a library from a CDN is its own maker's
      let text = null;
      if (server && serveRoot) {
        const f = resolve(join(serveRoot, decodeURIComponent(x.pathname)));
        if (servable(serveRoot, f, serveHome) && statSync(f).size < 3e6) text = readFileSync(f, "utf8");
      } else {
        const r = await fetch(u);
        if (r.ok) text = (await r.text()).slice(0, 3e6);
      }
      if (!text) continue;
      const name = x.pathname.split("/").slice(-2).join("/");
      if (/\.(glsl|frag|vert|vs|fs)$/i.test(x.pathname)) srcs.push({ src: text, from: name });
      else for (const s of glslIn(text)) srcs.push({ src: s, from: name });
    } catch {}
  }
  for (const t of GI.inline) for (const s of glslIn(t)) srcs.push({ src: s, from: "an inline script" });
  const out = [],
    seen = new Set();
  for (const s of srcs)
    for (const h of lintGLSL(s.src)) {
      const k = h.word + "|" + h.text;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(Object.assign(h, { from: s.from }));
    }
  return { hits: out, n: srcs.length };
}
// gl-fallback: the page again with every shader made to fail, as a GPU that rejects them would leave it; each WebGL host
// must still show a picture (its still fallback), never only its ground
async function glFallbackPass(cdp, helper, { w: width, h }) {
  const height = h || HEIGHTS[width] || (width < 700 ? 844 : 900);
  const tab = await Tab.open(cdp, { width, height, mobile: width < 700 });
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: "window.__ccglFail = true;" }).catch(() => {});
  const F = [],
    errors = [],
    seen = new Set();
  let hosts = 0,
    asked = 0,
    n = 0;
  try {
    await tab.goto(url);
    await tab.eval("document.fonts ? document.fonts.ready.then(() => 1) : 1", 15000).catch(() => {});
    await waitReady(tab);
    await sleep(1200);
    await tab.eval(`(${lib.toString()})()`);
    let s = 0;
    for (let k = 0; k < 60; k++) {
      const y = await tab.eval(`window.__cc.scrollTo(${Math.round(s)})`);
      await sleep(1100);
      const H = ((await tab.eval("window.__cc.glHosts()").catch(() => [])) || []).filter(x => !seen.has(x.id));
      if (H.length) {
        H.forEach(x => seen.add(x.id));
        hosts += H.length;
        const shot = await tab.shot();
        await helper.eval(`window.__h.use("gl", ${JSON.stringify(shot)})`);
        const fl = await helper.eval(
          `window.__h.flat("gl", ${JSON.stringify(H.map(x => ({ rect: x.rect, holes: x.holes })))})`,
        );
        // a host that is not one colour may still show only its stylesheet ground (a radial gradient under a canvas that
        // draws nothing): shot again with its canvases, the pictures over them and any background a script set taken
        // away; the same pixels both times is no fallback at all (an effect kit's CSS fallback is set by script, so it
        // goes away in the second shot and the host passes)
        const rest = H.map((x, i) => ({ x, i })).filter(({ i }) => fl[i] && fl[i].n >= 150 && fl[i].share < 0.985);
        const bare = new Set();
        if (rest.length) {
          const areas =
            (await tab
              .eval(`[${rest.map(o => o.x.id).join(",")}].map((i) => window.__cc.canvasArea(i))`)
              .catch(() => [])) || [];
          await tab.eval(`window.__cc.stripHost(${JSON.stringify(rest.map(o => o.x.id))}, true)`).catch(() => {});
          const B = await tab.shot();
          await tab.eval("window.__cc.stripHost([], false)").catch(() => {});
          await helper.eval(`window.__h.use("glA", ${JSON.stringify(shot)})`);
          await helper.eval(`window.__h.keep("glB", ${JSON.stringify(B)})`);
          const d =
            (await helper
              .eval(
                `window.__h.diffH("glA", "glB", ${JSON.stringify(rest.map((o, j) => ({ rect: areas[j] || o.x.rect, holes: [] })))}, 3)`,
              )
              .catch(() => [])) || [];
          rest.forEach((o, j) => {
            if (d[j] && d[j].n >= 150 && d[j].share < 0.004) bare.add(o.i);
          });
        }
        for (const [i, x] of H.entries()) {
          const f = fl[i];
          if (!f || f.n < 150) continue;
          if (f.share < 0.985 && !bare.has(i)) continue;
          const it = {
            check: "gl-fallback",
            sev: "FAIL",
            id: x.id,
            sel: x.sel,
            text: x.fx || x.text,
            rects: [x.rect],
            msg:
              f.share >= 0.985 ?
                `with its shader rejected (as a strict GPU rejects a reserved word) the ${x.fx ? `effect ${x.fx}` : "WebGL picture"} shows only its ground (${Math.round(f.share * 100)}% one colour, ${f.mode}): it needs a still fallback picture`
              : `with its shader rejected (as a strict GPU rejects a reserved word) the ${x.fx ? `effect ${x.fx}` : "WebGL picture"} shows only the ground its stylesheet gives it (the same pixels with the canvas taken away): it needs a still fallback picture, not a bare gradient`,
          };
          await cropTo(helper, shot, it, width, height, `${width}-gl-${String(++n).padStart(2, "0")}-gl-fallback.jpg`);
          F.push(it);
        }
      }
      const mx = await tab.eval("Math.max(0, document.scrollingElement.scrollHeight - innerHeight)");
      if (y >= mx - 2) break;
      s = Math.min(y + 0.85 * height, mx);
    }
    asked = (await tab.eval("window.__ccgl ? window.__ccgl.asked : 0").catch(() => 0)) || 0;
  } catch (e) {
    lose(errors, "gl-fallback", e);
  } finally {
    await tab.close();
  }
  return { F, errors, hosts, asked };
}

// empty-visual on a phone line: the page at 390 over a slow mobile line (Chrome's "Slow 4G": 1.6 Mbit/s, 400 ms, no
// cache), walked one screen at a time; a photograph frame still empty 1 s after it came on screen is what a visitor on
// mobile data sees (an empty frame). FAIL when the file is the cause (over 400 KB, or more than twice
// as wide as a retina phone draws it) or it never arrives, else WARN
async function slowPass(cdp, helper) {
  const width = 390,
    height = HEIGHTS[390];
  const tab = await Tab.open(cdp, { width, height, mobile: true });
  const F = [],
    errors = [];
  let n = 0,
    stopsN = 0;
  try {
    await tab.send("Network.enable").catch(() => {});
    await tab.send("Network.setCacheDisabled", { cacheDisabled: true }).catch(() => {});
    await tab
      .send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 400,
        downloadThroughput: Math.round(1.6e6 / 8),
        uploadThroughput: Math.round(0.75e6 / 8),
        connectionType: "cellular4g",
      })
      .catch(() => {});
    await tab.goto(url, 90000);
    await tab.eval("document.fonts ? document.fonts.ready.then(() => 1) : 1", 15000).catch(() => {});
    await sleep(600);
    await tab.eval(`window.__ccslow = { seen: new Map() }; 1`);
    const probe = `(() => {
      const S = window.__ccslow, vh = innerHeight, vw = innerWidth, out = [];
      const sz = (u) => { try { const e = performance.getEntriesByName(u)[0]; return e ? Math.round((e.encodedBodySize || e.transferSize || 0) / 1024) : 0; } catch (x) { return 0; } };
      for (const i of document.images) {
        const src = i.currentSrc || i.getAttribute('src'); if (!src) continue;
        const r = i.getBoundingClientRect(); if (r.width < 120 || r.height < 80) continue;
        const c = getComputedStyle(i); if (c.display === 'none' || c.visibility === 'hidden') continue;
        if (i.closest('dialog, [hidden], [aria-hidden="true"], nav, header [role="menu"]')) continue;
        const vis = Math.min(r.bottom, vh) - Math.max(r.top, 0); if (vis < 0.6 * Math.min(r.height, vh)) continue;
        if (!S.seen.has(i)) S.seen.set(i, { t: performance.now(), told: false });
        const s = S.seen.get(i);
        if (!s.told && performance.now() - s.t >= 900 && !(i.complete && i.naturalWidth)) { s.told = true; out.push({ src: src.split('/').pop().slice(0, 60), url: src, rect: { left: Math.max(0, Math.round(r.left)), top: Math.max(0, Math.round(r.top)), width: Math.round(Math.min(r.right, vw) - Math.max(r.left, 0)), height: Math.round(Math.min(r.bottom, vh) - Math.max(r.top, 0)) }, idx: [...document.images].indexOf(i) }); }
      }
      return out.map((o) => Object.assign(o, { kb: sz(o.url) }));
    })()`;
    let y = 0;
    for (let k = 0; k < 40; k++) {
      await tab.eval(`(scrollTo({ top: ${y}, behavior: 'instant' }), 1)`);
      await tab.eval(probe).catch(() => []); // marks what came on screen now
      await sleep(1000);
      const late = (await tab.eval(probe).catch(() => [])) || [];
      stopsN++;
      if (late.length) {
        const shot = await tab.shot();
        for (const o of late) {
          // its size, once it has arrived (or what the server says it is)
          F.push({
            check: "empty-visual",
            sev: "WARN",
            id: 0,
            sel: `img (${o.src})`,
            text: o.src,
            rects: [o.rect],
            idx: o.idx,
            url: o.url,
            shot,
            msg: "",
          });
        }
      }
      const mx = await tab.eval("Math.max(0, document.scrollingElement.scrollHeight - innerHeight)");
      if (y >= mx - 2) break;
      y = Math.min(y + Math.round(0.85 * height), mx);
    }
    // what each late picture weighed, once the line has brought it (read in the document that showed it)
    const weigh = async (list, how) => {
      await sleep(2500);
      for (const f of list) {
        const kb = (await tab
          .eval(
            `(() => { const i = document.images[${f.idx}]; const e = performance.getEntriesByName(${JSON.stringify(f.url)})[0]; return { kb: e ? Math.round((e.encodedBodySize || e.transferSize || 0) / 1024) : 0, done: !!(i && i.complete && i.naturalWidth), nw: i ? i.naturalWidth : 0 }; })()`,
          )
          .catch(() => null)) || { kb: 0, done: false, nw: 0 };
        f.sev = kb.kb > 400 || !kb.done || kb.nw > 4 * f.rects[0].width ? "FAIL" : "WARN";
        f.msg = `on a phone over a slow mobile line (1.6 Mbit/s) the frame of ${f.text} is still empty 1 s after ${how}${kb.kb ? `: the file is ${kb.kb} KB${kb.nw ? `, ${kb.nw}px wide for a ${f.rects[0].width}px frame` : ""}` : ""}${kb.done ? "" : ", and 3.5 s later it has not arrived"}`;
        f.fix =
          "serve the photograph at the size it is drawn (srcset and sizes: an 800px file for the phone), load it before it is reached (no loading=lazy on the next screen), or give the frame a blurred still of it";
        await cropTo(helper, f.shot, f, width, height, `390-slow-${String(++n).padStart(2, "0")}-empty-visual.jpg`);
        delete f.shot;
        delete f.idx;
        delete f.url;
      }
    };
    await weigh(F, "it comes on screen (scrolled to at a reading pace)");
    // a tap on a menu link: the page loaded afresh and moved at once to the section the link names (as a visitor who
    // opens the menu and taps "Roastery"); up to three such sections that hold a photograph, each judged 1 s after it
    // is reached
    const targets =
      (await tab
        .eval(
          `(() => { const out = []; for (const a of document.querySelectorAll('header a[href^="#"], nav a[href^="#"], [role="navigation"] a[href^="#"]')) { const id = decodeURIComponent(a.getAttribute('href').slice(1)); if (!id || out.some((o) => o.id === id)) continue; const t = document.getElementById(id); if (!t) continue; const pics = [...t.querySelectorAll('img')].filter((i) => { const r = i.getBoundingClientRect(); return r.width >= 120 && r.height >= 80; }); if (!pics.length) continue; out.push({ id, label: (a.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30), top: t.getBoundingClientRect().top + scrollY }); } return out.sort((p, q) => q.top - p.top).slice(0, 3); })()`,
        )
        .catch(() => [])) || [];
    for (const t of targets) {
      await tab.goto(url, 90000);
      await tab
        .eval(
          `window.__ccslow = { seen: new Map() }; (() => { const t = document.getElementById(${JSON.stringify(t.id)}); if (t) t.scrollIntoView({ block: 'start', behavior: 'instant' }); return 1; })()`,
        )
        .catch(() => {});
      await tab.eval(probe).catch(() => []);
      await sleep(1000);
      let late = ((await tab.eval(probe).catch(() => [])) || []).filter(o => !F.some(f => f.text === o.src));
      // and reads on: one more screen down at once (the section's photograph often sits under its heading and text)
      if (!late.length) {
        await tab.eval(`(scrollBy({ top: ${Math.round(0.85 * height)}, behavior: 'instant' }), 1)`).catch(() => {});
        await tab.eval(probe).catch(() => []);
        await sleep(1000);
        late = ((await tab.eval(probe).catch(() => [])) || []).filter(o => !F.some(f => f.text === o.src));
      }
      if (!late.length) continue;
      const shot = await tab.shot(),
        list = late.map(o => ({
          check: "empty-visual",
          sev: "WARN",
          id: 0,
          sel: `img (${o.src})`,
          text: o.src,
          rects: [o.rect],
          idx: o.idx,
          url: o.url,
          shot,
          msg: "",
        }));
      await weigh(list, `a tap on "${t.label}" in the menu brings it on screen`);
      F.push(...list);
    }
  } catch (e) {
    lose(errors, "slow line", e);
  } finally {
    await tab.close();
  }
  return { F, errors, stops: stopsN };
}
// reduced motion (the house rule: loops hold their finished picture, nothing animates in on scroll): the page at the
// first width with prefers-reduced-motion: reduce, every screen read for what starts to animate as it arrives and for
// what still moves 1.5 s after it
async function reducedPass(cdp, helper, { w: width, h }) {
  const height = h || HEIGHTS[width] || (width < 700 ? 844 : 900);
  const tab = await Tab.open(cdp, { width, height, mobile: width < 700 });
  const F = [],
    errors = [],
    told = new Set();
  let n = 0,
    read = 0,
    missed = 0;
  try {
    await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await tab.goto(url);
    await tab.eval("document.fonts ? document.fonts.ready.then(() => 1) : 1", 15000).catch(() => {});
    await waitReady(tab);
    await sleep(1500);
    await tab.eval(`(${lib.toString()})()`);
    let y = 0;
    for (let k = 0; k < 14; k++) {
      const sy = await tab.eval(`window.__cc.scrollTo(${Math.round(y)})`);
      await sleep(160);
      const starts = ((await tab.eval("window.__cc.motionNow()").catch(() => [])) || []).filter(x => !x.loop);
      await sleep(1500);
      // a screen the browser cannot shoot in time (a page heavy with CPU WebGL) is tried once more, then skipped and counted
      let A = null,
        B = null,
        C = null;
      for (let t = 0; t < 2 && !C; t++) {
        try {
          A = await tab.shot(92);
          await sleep(1200);
          B = await tab.shot(92);
          await sleep(1300);
          C = await tab.shot(92);
        } catch (e) {
          A = B = C = null;
          if (t) lose(errors, "reduced motion", e, `screen ${k} not read (${e.message})`);
        }
      }
      if (!C) {
        missed++;
        const mx0 = await tab.eval("Math.max(0, document.scrollingElement.scrollHeight - innerHeight)").catch(() => 0);
        if (sy >= mx0 - 2) break;
        y = Math.min(sy + height, mx0);
        continue;
      }
      read++;
      await helper.eval(`window.__h.use("rmA", ${JSON.stringify(A)})`);
      await helper.eval(`window.__h.keep("rmB", ${JSON.stringify(B)})`);
      await helper.eval(`window.__h.keep("rmC", ${JSON.stringify(C)})`);
      const boxes =
        (await safe2(errors, "reduced", () =>
          helper.eval(`window.__h.moving("rmA", "rmB", "rmC", ${width}, ${height}, true)`),
        )) || [];
      let at = null;
      const shotFor = f => {
        if (!at) at = A;
        f.shot = at;
      };
      for (const s of starts) {
        if (told.has("s" + s.id)) continue;
        told.add("s" + s.id);
        const f = {
          check: "reduced-motion",
          sev: "FAIL",
          id: s.id,
          sel: s.sel,
          text: s.text,
          rects: [s.rect],
          msg: `with reduced motion asked for, it still animates in as it comes on screen (${s.name}, ${s.dur} ms)`,
        };
        shotFor(f);
        F.push(f);
      }
      // text in view that reduced motion leaves hidden (a reveal that waits for an animation that never runs)
      {
        const hid = (await hiddenNow(tab)).filter(x => !told.has("h" + x.key));
        hid.forEach(x => told.add("h" + x.key));
        for (const [grp, sev] of [
          [hid.filter(x => !x.mock), "FAIL"],
          [hid.filter(x => x.mock), "WARN"],
        ]) {
          if (!grp.length) continue;
          const x = grp[0];
          const f = {
            check: "hidden-content",
            sev,
            id: 0,
            sel: x.sel,
            text: x.text,
            rects: grp.slice(0, 6).map(g => g.rect),
            msg: `with reduced motion asked for, ${grp.length > 1 ? `${grp.length} lines stay` : "it stays"} hidden ${sy < 2 ? "on the first screen" : "on this screen"} (${x.why})${x.mock ? " inside a drawn mock" : ""}${
              grp.length > 1 ?
                `: ${grp
                  .slice(1, 4)
                  .map(g => `"${g.text.slice(0, 20)}"`)
                  .join(", ")}`
              : ""
            }: reduced motion must show the finished page`,
          };
          shotFor(f);
          F.push(f);
        }
      }
      for (const b of boxes) {
        const e = await tab.eval(`window.__cc.moverAt(${JSON.stringify(b)})`).catch(() => null);
        if (!e || told.has("m" + e.id)) continue;
        told.add("m" + e.id);
        const vid = await tab
          .eval(
            `(() => { const x = document.elementsFromPoint(${Math.round(b.left + b.width / 2)}, ${Math.round(b.top + b.height / 2)}).find((q) => q.tagName === 'VIDEO'); return x ? (x.controls ? 2 : 1) : 0; })()`,
          )
          .catch(() => 0);
        const f = {
          check: "reduced-motion",
          sev: vid === 2 ? "WARN" : "FAIL",
          id: e.id,
          sel: e.sel,
          text: e.text,
          rects: [b],
          msg: `with reduced motion asked for, it still moves 1.5 s after it came on screen (${b.width}x${b.height}px of the screen changed${vid ? ", a film" : ""}): a loop must hold its finished picture`,
        };
        shotFor(f);
        F.push(f);
      }
      const mx = await tab.eval("Math.max(0, document.scrollingElement.scrollHeight - innerHeight)");
      if (sy >= mx - 2) break;
      y = Math.min(sy + height, mx);
    }
    for (const f of F.slice(0, 12)) {
      await cropTo(helper, f.shot, f, width, height, `${width}-rm-${String(++n).padStart(2, "0")}-${f.check}.jpg`);
    }
    for (const f of F) delete f.shot;
  } catch (e) {
    lose(errors, "reduced motion", e);
  } finally {
    await tab.close();
  }
  return { F, errors, read, missed };
}
// hidden-content: text on this screen that is not seen: an
// opacity under 0.1 up its ancestors, visibility hidden, scaled to nothing, transparent letters, a clip-path that hides
// it, or pushed out of an overflow-hidden mask by a transform (words that "rise" into view). Passed: the nav, closed
// menus, popups, dialogs, an unopened details, aria-hidden, [hidden], inert and screen-reader-only parts, and an
// alternate stacked under a shown sibling (a rotating word, a collage set). A drawn mock's rows ([data-ui], .ui,
// [data-m-loop], [data-ui-loop]) are told apart. Viewport boxes, at most 40.
function hiddenProbe() {
  const H = innerHeight,
    W = document.documentElement.clientWidth || innerWidth;
  const cs = e => getComputedStyle(e);
  const sel = el => {
    const parts = [];
    for (
      let e = el;
      e && e.nodeType === 1 && e !== document.body && e !== document.documentElement && parts.length < 4;
      e = e.parentElement
    ) {
      const tag = e.tagName.toLowerCase();
      if (e.id && /^[A-Za-z][\w-]*$/.test(e.id)) {
        parts.unshift(tag + "#" + e.id);
        break;
      }
      const cls = [...e.classList].filter(c => /^[A-Za-z_][\w-]*$/.test(c) && !/^(is|js|has)-/.test(c)).slice(0, 2);
      let s = tag + cls.map(c => "." + c).join("");
      const p = e.parentElement;
      if (p) {
        const same = [...p.children].filter(x => x.tagName === e.tagName);
        if (same.length > 1 && (!cls.length || same.filter(x => cls.every(c => x.classList.contains(c))).length > 1))
          s += ":nth-of-type(" + (same.indexOf(e) + 1) + ")";
      }
      parts.unshift(s);
    }
    return parts.join(" > ");
  };
  const alphaOf = c => {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return c === "transparent" ? 0 : 1;
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    return p.length > 3 ? parseFloat(p[3]) : 1;
  };
  const EX =
    'nav,.nav,header nav,[role=navigation],[aria-hidden="true"],[hidden],[inert],dialog:not([open]),template,noscript,[role=menu],[role=tooltip],[role=dialog],[role=tabpanel][aria-hidden],[class*="sr-only"],[class*="visually-hidden"],[class*="skip"]';
  const POP = /(?:^|[\s_-])(?:menu|dropdown|popover|tooltip|modal|drawer|offcanvas|lightbox|toast|mega)(?:$|[\s_-])/i;
  const MOCK = '[data-ui],[data-ui-loop],[data-m-loop],.ui,[class*="ui-"]';
  const shown = e => {
    let op = 1;
    for (let x = e; x && x !== document.documentElement; x = x.parentElement) {
      const s = cs(x);
      op *= parseFloat(s.opacity);
      if (s.visibility === "hidden" || op < 0.1) return false;
    }
    return true;
  };
  const out = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|BR|WBR|OPTION)$/i.test(el.tagName) || el instanceof SVGElement) continue;
    // words, and photographs of 120x80px or more (a photo left at opacity 0 by a reveal that never fires: the readers'
    // an empty frame on a test page)
    const pic = /^(IMG|VIDEO)$/.test(el.tagName);
    if (!pic && ![...el.childNodes].some(n => n.nodeType === 3 && /\S/.test(n.data))) continue;
    if (!el.getClientRects().length) continue;
    const r = el.getBoundingClientRect();
    if (pic && (r.width < 120 || r.height < 80)) continue;
    if (r.width < 4 || r.height < 4 || r.bottom < 30 || r.top > H - 30 || r.right < 0 || r.left > W) continue;
    if (el.closest(EX)) continue;
    const det = el.closest("details:not([open])");
    if (det && !el.closest("summary")) continue;
    const tp = el.closest("[role=tabpanel]");
    if (tp && (tp.hidden || tp.getAttribute("aria-hidden") === "true")) continue;
    let why = "",
      op = 1,
      popup = false,
      grad = false,
      tx = 0,
      ty = 0;
    const share = (a, dx, dy) => {
      const ix = Math.max(0, Math.min(a.right, r.right + dx) - Math.max(a.left, r.left + dx)),
        iy = Math.max(0, Math.min(a.bottom, r.bottom + dy) - Math.max(a.top, r.top + dy));
      return r.width * r.height > 0 ? (ix * iy) / (r.width * r.height) : 1;
    };
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = cs(e);
      op *= parseFloat(s.opacity);
      if (typeof e.className === "string" && POP.test(e.className)) popup = true;
      // (a clip per background layer: "text, text" for a tint over a photograph clipped to the glyphs)
      if (/(^|,)\s*text\s*(,|$)/.test(String(s.backgroundClip || "") + "," + String(s.webkitBackgroundClip || "")))
        grad = true;
      if (e !== el && /hidden|clip/.test(s.overflowX + " " + s.overflowY)) {
        const a = e.getBoundingClientRect();
        if (a.width >= 20 && a.height >= 8 && !why && share(a, 0, 0) < 0.15 && share(a, -tx, -ty) >= 0.15)
          why = "pushed out of its overflow-hidden mask by a transform";
      }
      if (s.clipPath && /inset\(\s*(?:100|9\d)%/.test(s.clipPath) && !why) why = "clip-path " + s.clipPath.slice(0, 30);
      if (s.transform && s.transform !== "none") {
        try {
          const m = new DOMMatrix(s.transform);
          tx += m.e;
          ty += m.f;
          if (Math.abs(m.a * m.d - m.b * m.c) < 0.01 && !why) why = "scaled to nothing";
        } catch (x) {
          /* odd transform */
        }
      }
    }
    if (popup) continue;
    const s0 = cs(el);
    if (!why && op < 0.1) why = "opacity " + Math.round(op * 100) / 100;
    if (!why && s0.visibility === "hidden") why = "visibility hidden";
    if (!why && !pic && !grad && alphaOf(s0.color) < 0.05 && alphaOf(s0.webkitTextFillColor || s0.color) < 0.05)
      why = "transparent letters";
    if (!why) continue;
    // an alternate under a shown sibling (a rotating word, a set of a collage): the sibling is what is seen
    let alt = false;
    for (let a = el, d = 0; a && a.parentElement && d < 3 && !alt; a = a.parentElement, d++)
      for (const sib of a.parentElement.children) {
        if (sib === a || !shown(sib)) continue;
        const q = sib.getBoundingClientRect();
        const ix = Math.max(0, Math.min(q.right, r.right) - Math.max(q.left, r.left)),
          iy = Math.max(0, Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top));
        if (ix * iy >= 0.5 * r.width * r.height) {
          alt = true;
          break;
        }
      }
    if (alt) continue;
    const vis = {
      left: Math.round(Math.max(0, r.left)),
      top: Math.round(Math.max(0, r.top)),
      width: Math.round(Math.min(W, r.right) - Math.max(0, r.left)),
      height: Math.round(Math.min(H, r.bottom) - Math.max(0, r.top)),
    };
    out.push({
      key: sel(el) + "|" + (el.textContent || "").trim().slice(0, 30),
      sel: sel(el),
      text:
        pic ?
          "the photograph "
          + String(el.currentSrc || el.getAttribute("src") || el.getAttribute("poster") || "")
            .split(/[?#]/)[0]
            .split("/")
            .pop()
            .slice(0, 40)
        : (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50),
      why,
      mock: !!el.closest(MOCK),
      first: scrollY < 2,
      rect: vis,
    });
    if (out.length >= 40) break;
  }
  return out;
}
// what stays hidden on this screen: read twice 500 ms apart, only what is hidden both times
async function hiddenNow(tab) {
  const a = (await tab.eval(`(${hiddenProbe.toString()})()`, 30000).catch(() => [])) || [];
  if (!a.length) return [];
  await sleep(500);
  const keys = new Set(
    ((await tab.eval(`(${hiddenProbe.toString()})()`, 30000).catch(() => [])) || []).map(x => x.key),
  );
  return a.filter(x => keys.has(x.key));
}
// hidden-content with an IntersectionObserver that never calls back (a script that is blocked, slow or failed, or a
// screenshot taken without scrolling): the page at the first width, waited 4 s at the top (past every fallback timer),
// then walked a screen at a time; text a visitor would not see is told, once per element
// Then the page once more with its scripts switched off (motion.md: without script the hero stands and every moment shows
// its finished state): what stays hidden there is told the same way
async function deadIoPass(cdp, helper, size) {
  const a = await hiddenWalk(cdp, helper, size, "io");
  const b = await hiddenWalk(cdp, helper, size, "nojs", new Set(a.F.map(f => f.sel)));
  return { F: [...a.F, ...b.F], errors: [...a.errors, ...b.errors], read: a.read + b.read };
}
async function hiddenWalk(cdp, helper, { w: width, h }, how, skip = new Set()) {
  const height = h || HEIGHTS[width] || (width < 700 ? 844 : 900);
  const tab = await Tab.open(cdp, { width, height, mobile: width < 700 });
  const F = [],
    errors = [],
    told = new Set();
  let n = 0,
    read = 0;
  const said =
    how === "nojs" ? "with scripts switched off (a blocked or failed script)"
    : how === "reduced" ? "with reduced motion asked for"
    : "with no IntersectionObserver callback (a script that never gets that far)";
  try {
    if (how === "nojs") await tab.send("Emulation.setScriptExecutionDisabled", { value: true });
    else if (how === "reduced")
      await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    else
      await tab
        .send("Page.addScriptToEvaluateOnNewDocument", {
          source:
            "window.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }; window.IntersectionObserverEntry = window.IntersectionObserverEntry || function () {};",
        })
        .catch(() => {});
    await tab.goto(url);
    await tab.eval("document.fonts ? document.fonts.ready.then(() => 1) : 1", 15000).catch(() => {});
    if (how !== "nojs") await waitReady(tab);
    await sleep(
      how === "nojs" ? 1500
      : how === "reduced" ? 2000
      : 4000,
    );
    let y = 0;
    for (let k = 0; k < 40; k++) {
      const sy = await tab.eval(
        `(document.documentElement.style.scrollBehavior = 'auto', scrollTo({ top: ${Math.round(y)}, left: 0, behavior: 'instant' }), Math.round(scrollY))`,
      );
      await sleep(k ? 700 : 100);
      const list = (await hiddenNow(tab)).filter(x => !told.has(x.key) && !skip.has(x.sel));
      read++;
      if (list.length) {
        list.forEach(x => told.add(x.key));
        const shot = await tab.shot();
        const plain = list.filter(x => !x.mock),
          mock = list.filter(x => x.mock);
        for (const [grp, sev] of [
          [plain, "FAIL"],
          [mock, "WARN"],
        ]) {
          if (!grp.length) continue;
          const x = grp[0];
          F.push({
            check: "hidden-content",
            sev,
            id: 0,
            sel: x.sel,
            text: x.text,
            rects: grp.slice(0, 6).map(g => g.rect),
            shot,
            msg: `${said} ${grp.length > 1 ? `${grp.length} lines stay` : "it stays"} hidden ${k ? `on screen ${k + 1}` : "on the first screen"}, ${
              how === "nojs" ? "1.5 s after load"
              : how === "reduced" ? "0.7 s after it was scrolled to"
              : "4 s after load"
            } (${x.why})${x.mock ? " inside a drawn mock" : ""}${
              grp.length > 1 ?
                `: ${grp
                  .slice(1, 4)
                  .map(g => `"${g.text.slice(0, 20)}"`)
                  .join(", ")}`
              : ""
            }: the page shows it only when a script reveals it`,
          });
        }
      }
      const mx = await tab.eval("Math.max(0, document.scrollingElement.scrollHeight - innerHeight)");
      if (sy >= mx - 2) break;
      y = Math.min(sy + height, mx);
    }
    for (const f of F.slice(0, 10))
      await cropTo(
        helper,
        f.shot,
        f,
        width,
        height,
        `${width}-${how}-${String(++n).padStart(2, "0")}-hidden-content.jpg`,
      );
    for (const f of F) delete f.shot;
  } catch (e) {
    lose(errors, "hidden content", e);
  } finally {
    await tab.close();
  }
  return { F, errors, read };
}
// a probe that timed out or threw hands its caller null, 0 or an empty list, and the check it feeds would read PASS
// for what nobody measured: the failing call is kept by name (errors.lost) and told as a WARN on the checks it feeds
const LOST_FIX =
  "run the check again on a quieter machine; if it keeps failing, the probe error line says what stopped it";
const LOST_CHECKS = {
  "visual probe": [
    ["visual-caption", "visual-empty"],
    "the visuals of the page (their captions and whether they draw)",
  ],
  "effect-kind": [["effect-kind"], "the effect files and the WebGL and mount counts"],
  "effect-kind particle rate": [["effect-kind"], "the particle rate (canvas 2D shapes a second)"],
  "effect-kind drift walk": [["effect-kind"], "the parts that drift off the scroll"],
  "empty-visual": [["empty-visual"], "whether the visuals show one colour all over"],
  ghosts: [["empty-visual"], "pictures that load but stay empty"],
  gl: [["shader-lint"], "the shaders the page compiled"],
  "shader-lint": [["shader-lint"], "the shader code"],
  seams: [["flush"], "the seams between sections"],
  seam: [["section-gaps"], "the gaps between sections"],
  timelines: [["scroll-linked"], "the scroll timelines"],
  hold: [["scroll-linked", "pinned"], "the held sections"],
  reveal: [["scroll-reveal"], "the parts that reveal on scroll"],
  "io-reveal": [["scroll-reveal"], "the reveals that wait for the viewport"],
  hover: [["hover", "hover-move", "hover-spill"], "the hover states"],
  "hover-kinds": [["hover-move"], "the kinds of hover"],
  hidden: [["hidden-visual"], "what a hover shows or hides"],
  loops: [["loop-pause"], "the loops and their pause"],
  forms: [["forms"], "the forms"],
  webgl: [["webgl"], "the WebGL counts"],
  moments: [["effects-fit"], "the scroll moments"],
  place: [["effects-fit"], "where the effect parts sit"],
  "no-visual": [["no-visual"], "the sections without a visual"],
  "hero-fill": [["hero-fill"], "the hero against the screen"],
  "nav-collapse": [["nav"], "the nav collapse"],
  anchors: [["links"], "the in-page links"],
  fades: [["fade-cut"], "the fades"],
  "reduced motion": [["reduced-motion"], "the page under reduced motion"],
  reduced: [["reduced-motion"], "the moving parts under reduced motion"],
  "hidden content": [["hidden-content"], "content hidden until a script reveals it"],
  "gl-fallback": [["gl-fallback"], "the WebGL fallback"],
  "first screen": [["spill", "off-viewport", "cut-text", "nav", "hero-fill"], "the first screen"],
  tilt: [["tilt"], "tilted parts"],
  spill: [["spill"], "spill"],
  marquee: [["marquee"], "marquees"],
  cut: [["cut-text"], "cut text"],
  stagger: [["stagger"], "stagger"],
  orphan: [["orphan"], "orphan words"],
  contrast: [["contrast"], "contrast"],
  "top-stagger": [["top-stagger"], "the top edges"],
  extras: [
    [
      "same-object",
      "photo-repeat",
      "photo-weight",
      "button-styles",
      "caption",
      "credit-wall",
      "heading-scale",
      "nav-labels",
      "nesting",
      "placeholder",
      "progress-bar",
      "proximity",
      "sample-label",
      "tab-wrap",
      "ui-centre",
      "unit-break",
    ],
    "the page-wide reads (repeated objects and photographs, picture weight, buttons, captions, credits, headings, nav labels, nesting, stand-in text, progress bars, tabs, units)",
  ],
  audit: [
    [
      "caption",
      "card-layout",
      "col-edge",
      "effect-repeat",
      "nesting",
      "placeholder",
      "pricing-tiers",
      "proximity",
      "sample-label",
    ],
    "the page audit (captions, card layouts, column edges, repeated effects, nesting, stand-in text, price tiers, spacing)",
  ],
  more: [
    [
      "action-count",
      "button-styles",
      "copy-length",
      "fact-agree",
      "fold-action",
      "grounds",
      "links",
      "one-screen",
      "photo-print",
      "product-shown",
      "split-align",
    ],
    "the page-wide reads (the main action, buttons, copy length, facts, the first fold, grounds, links, prints on photographs, the product shown, split alignment)",
  ],
};
function lose(errors, name, e, msg) {
  const why = msg ?? (e && e.message) ?? String(e);
  errors.push(`${name}: ${why}`);
  (errors.lost ||= []).push({ name, why: String(why).split("\n")[0].slice(0, 90) });
}
// what the page's own probe could not read ("spill: TypeError ..."): told by its part's name
const takePage = (to, list, pre = "") => {
  for (const e of list) {
    const name = String(e).split(":")[0];
    to.push(pre + e);
    (to.lost ||= []).push({
      name,
      why: String(e)
        .slice(name.length + 2)
        .slice(0, 90),
    });
  }
};
const takeErrors = (to, from) => {
  to.push(...from);
  if (from.lost) (to.lost ||= []).push(...from.lost);
};
// the lost calls, as one WARN a check a width: "partly measured: <what>"; `have` are the findings of that width
function lostFindings(lost, have) {
  const by = new Map();
  for (const l of lost || []) {
    const mid = String(l.name).split(" ")[0],
      mod = MODULES.find(m => m.id === l.name) || MODULES.find(m => m.id === mid);
    const t =
      (Object.hasOwn(LOST_CHECKS, l.name) ? LOST_CHECKS[l.name] : null)
      || (mod ? [mod.checks.map(c => c.id), `the ${l.name} block`]
      : ORDER.includes(l.name) ? [[l.name], `the ${l.name} probe`]
      : null);
    if (!t) continue;
    for (const c of t[0]) {
      if (!by.has(c)) by.set(c, new Set());
      by.get(c).add(`${t[1]} (${l.why})`);
    }
  }
  return [...by]
    .filter(([c]) => !have.some(f => f.check === c && /^partly measured/.test(f.msg)))
    .map(([check, what]) =>
      clean({
        check,
        sev: "WARN",
        id: 0,
        sel: "(the page)",
        text: "",
        msg: `partly measured: ${[...what].join("; ")}`,
        fix: LOST_FIX,
      }),
    );
}
async function safe2(errors, name, fn) {
  try {
    return await fn();
  } catch (e) {
    lose(errors, name, e);
    return null;
  }
}

// ---------------------------------------------------------------- one width
const near = (a, b) =>
  a === b
  || (a
    && b
    && a !== "gradient"
    && b !== "gradient"
    && Math.max(...[1, 3, 5].map(i => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16))))
      <= 28);
const sameLook = (a, b) => a.shape === b.shape && near(a.fill, b.fill) && near(a.stroke, b.stroke);
// the same button inverted for a coloured band: one fills with the colour the other stands on (cream on the brand band, brand on the page)
const invertedLook = (a, b) =>
  a.shape === b.shape
  && !!(
    (a.bd && b.fill && b.fill !== "gradient" && near(a.bd, b.fill))
    || (b.bd && a.fill && a.fill !== "gradient" && near(b.bd, a.fill))
  );
const lookName = s =>
  [
    s.shape === "slanted" ? `slanted (${s.slant})` : s.shape,
    s.fill ? `fill ${s.fill}` : null,
    s.stroke ? `outline ${s.stroke}` : null,
  ]
    .filter(Boolean)
    .join(", ");
function clusterLooks(list) {
  const styles = [];
  for (const b of list) {
    const s = styles.find(x => sameLook(x, b));
    if (s) s.items.push(b);
    else styles.push(Object.assign({}, b, { items: [b] }));
  }
  return styles;
}
function region(rects, vw, vh) {
  let l = Math.min(...rects.map(r => r.left)),
    t = Math.min(...rects.map(r => r.top));
  let r_ = Math.max(...rects.map(r => r.left + r.width)),
    b = Math.max(...rects.map(r => r.top + r.height));
  l = Math.max(0, l - 36);
  t = Math.max(0, t - 36);
  r_ = Math.min(vw, r_ + 36);
  b = Math.min(vh, b + 36);
  if (r_ - l < 8 || b - t < 8) return null;
  const mw = Math.min(vw, 300),
    mh = Math.min(vh, 170);
  if (r_ - l < mw) {
    const c = (l + r_) / 2;
    l = Math.max(0, Math.min(vw - mw, c - mw / 2));
    r_ = l + mw;
  }
  if (b - t < mh) {
    const c = (t + b) / 2;
    t = Math.max(0, Math.min(vh - mh, c - mh / 2));
    b = t + mh;
  }
  return { left: Math.round(l), top: Math.round(t), width: Math.round(r_ - l), height: Math.round(b - t) };
}
const median = a => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// a card running off its panel leaves its text floating past the panel: that text is told with the spill, once
function mergeCut(F) {
  for (const f of [...F]) {
    if (f.check !== "cut-text" || !f.merge) continue;
    const s = F.find(x => x.check === "spill" && x.id === f.merge);
    if (s) {
      s.msg += `, and ${f.lines} line${f.lines > 1 ? "s" : ""} of its text float past the panel`;
      F.splice(F.indexOf(f), 1);
    }
  }
}
// boxes of one row or grid that run off the same way (the same side, by the same amount, past the same panel) are one
// fault: told once, with the others named
function groupLike(F) {
  const parentOf = s => s.split(" > ").slice(0, -1).join(" > ");
  const firsts = [];
  for (const f of [...F]) {
    if ((f.check !== "spill" && f.check !== "off-viewport") || !parentOf(f.sel)) continue;
    const by = +(f.msg.match(/^runs (\d+)px/) || [])[1];
    if (!by) continue;
    const k = f.check + "|" + parentOf(f.sel) + "|" + f.msg.replace(/^runs \d+px/, "");
    const g = firsts.find(x => x.k === k && Math.abs(x.by - by) <= 2);
    if (!g) {
      firsts.push({ k, by, f, more: [] });
      continue;
    }
    g.more.push(f);
    F.splice(F.indexOf(f), 1);
  }
  for (const g of firsts)
    if (g.more.length)
      g.f.msg += ` (and ${g.more.length} more like it: ${g.more
        .slice(0, 3)
        .map(x => x.sel.split(" > ").pop())
        .join(", ")}${g.more.length > 3 ? ", ..." : ""})`;
}
// one fault repeated on parts of one kind (a picture in every button, the same off-centre label, the fields of one form
// past the edge, several h3s as large as the h2s, headings with no noun) is told once, with the others named
const SAME = new Set([
  "placeholder",
  "caption",
  "proximity",
  "spill",
  "cut-text",
  "tilt",
  "button-picture",
  "label-centre",
  "right-edge",
  "heading-scale",
  "copy-headings",
  "copy-buttons",
  "fake-button",
  "orphan",
  "busy-ground",
  "contrast",
  "stranded-action",
  "overlap-text",
  "empty-visual",
  "unit-break",
]);
function groupSame(F) {
  const shape = f =>
    f.check === "spill" ?
      /^lies across the edge/.test(f.msg) ?
        "spill|" + f.sev + "|across|" + f.sel.split(" > ").slice(0, -1).join(" > ")
      : "spill|" + f.sel + "|" + f.msg
    : f.check
      + "|"
      + f.sev
      + "|"
      + f.msg
        .replace(/"[^"]*"/g, '"*"')
        .replace(/\(\d+ headings like it[^)]*\)/, "")
        .replace(/\bh([1-6])\b/g, (m, d) => "h" + "abcdef"[d - 1])
        .replace(/\d+(\.\d+)?/g, "#");
  const firsts = new Map();
  for (const f of [...F]) {
    if (!SAME.has(f.check)) continue;
    const k = shape(f),
      g = firsts.get(k);
    if (!g) {
      firsts.set(k, { f, more: [] });
      continue;
    }
    g.more.push(f);
    F.splice(F.indexOf(f), 1);
    if (f.stop != null && f.stop === g.f.stop && f.rects && g.f.rects) g.f.rects.push(...f.rects.filter(r => !r.ref));
  }
  for (const g of firsts.values())
    if (g.more.length)
      g.f.msg += ` (and ${g.more.length} more like it: ${g.more
        .slice(0, 4)
        .map(x => (x.text ? `"${x.text.slice(0, 24)}"` : x.sel.split(" > ").pop()))
        .join(", ")}${g.more.length > 4 ? ", ..." : ""})`;
}
const ORDER = [
  "assets",
  "shader-lint",
  "gl-fallback",
  "empty-visual",
  "hero-fill",
  "flush",
  "placeholder",
  "sample-label",
  "caption",
  "credit-wall",
  "nav",
  "nav-covers",
  "spill",
  "off-viewport",
  "fold-card",
  "hover-spill",
  "overlap-text",
  "row-gap",
  "cut-text",
  "fold-cut",
  "marquee",
  "scroll-linked",
  "scroll-reveal",
  "pinned",
  "loop-pause",
  "reduced-motion",
  "webgl",
  "no-visual",
  "text-only",
  "card-visual",
  "hidden-visual",
  "card-family",
  "card-layout",
  "nesting",
  "effect-repeat",
  "ui-fit",
  "ui-centre",
  "dark-ground",
  "button-styles",
  "button-shape",
  "same-action",
  "button-picture",
  "cta",
  "pricing-tiers",
  "copy-headline",
  "copy-fact",
  "copy-headings",
  "copy-buttons",
  "copy-actions",
  "heading-scale",
  "stagger",
  "top-stagger",
  "off-grid",
  "col-edge",
  "right-edge",
  "centre-axis",
  "tilt",
  "contrast",
  "text-contrast",
  "body-size",
  "busy-ground",
  "section-gaps",
  "proximity",
  "hole",
  "links",
  "forms",
  "photo-upscale",
  "photo-set",
  "photo-credit",
  "nav-family",
  "nav-labels",
  "link-styles",
  "heading-align",
  "label-centre",
  "fake-button",
  "stranded-action",
  "orphan",
  "unit-break",
  "tab-wrap",
  "effects-fit",
  "fade-cut",
  "photo-weight",
  "copy-length",
  "nav-current",
  "progress-bar",
  "photo-repeat",
  "button-contrast",
  "photo-print",
  "grounds",
  "split-align",
  "fact-agree",
  "fold-action",
  "action-count",
  "one-screen",
  "hover",
  "product-shown",
  "same-object",
  "font-load",
];
ORDER.splice(ORDER.indexOf("reduced-motion") + 1, 0, "hidden-content");
ORDER.splice(ORDER.indexOf("hover") + 1, 0, "hover-move");
ORDER.splice(ORDER.indexOf("overlap-text") + 1, 0, "collide", "tap-size");
for (const M of MODULES) for (const c of M.checks) if (!ORDER.includes(c.id)) ORDER.push(c.id);
const bySev = (a, b) =>
  (a.sev === b.sev ? 0
  : a.sev === "FAIL" ? -1
  : 1) || ORDER.indexOf(a.check) - ORDER.indexOf(b.check);
const clean = ({ id, rects, merge, lines, ...rest }) => Object.assign(rest, { fix: rest.fix || FIX[rest.check] || "" });
async function cropTo(helper, shot, f, vw, vh, name) {
  const reg = region(f.rects, vw, vh);
  if (!reg) return;
  await helper.eval(`window.__h.use("shot", ${JSON.stringify(shot)})`);
  const b64 = await helper.eval(`window.__h.crop("shot", ${JSON.stringify(reg)}, ${JSON.stringify(f.rects)})`);
  f.crop = name;
  writeFileSync(join(outDir, name), Buffer.from(b64, "base64"));
}

const MOD_DONE = new Set(); // blocks told once a page
// one fault under two ids: a visuals-block finding that empty-visual, caption or effects-fit (in list L) already tells
const sameFault = (f, L) => {
  const as = g => g.sev === "FAIL" || f.sev === "WARN";
  if (f.check === "visual-empty") return L.some(g => g.check === "empty-visual" && g.sel === f.sel && as(g));
  if (f.check === "visual-caption")
    return L.some(
      g =>
        g.check === "caption"
        && (g.sel === f.sel || (g.text && f.text && g.text.slice(0, 24) === f.text.slice(0, 24)))
        && as(g),
    );
  // one cause, one finding: effects-fit already tells the WebGL, the shader code and the effect parts on a no-effect page
  if (f.check === "effect-kind" && /contexts live at once/.test(f.msg) && L.some(g => g.check === "webgl")) return true; // (the host's webgl FAIL tells it)
  if (f.check === "effect-kind")
    return /WebGL context|shader code|shader source|effect parts/.test(f.msg) && L.some(g => g.check === "effects-fit");
  // a section tile showing two sections that hero-screen, section-height or one-section already tells on that section
  if (f.check === "section-tile") return tilesMod.dupOf(f, L);
  return false;
};
async function runWidth(cdp, helper, { w: width, h }, first) {
  const height = h || HEIGHTS[width] || (width < 700 ? 844 : 900);
  const mobile = width < 700;
  const tab = await Tab.open(cdp, { width, height, mobile, net: first });
  await tab.send("Page.bringToFront").catch(() => {});
  const F = [],
    shots = [],
    stopY = [],
    grid = [],
    buttons = new Map(),
    screenLooks = [],
    pairs = new Map(),
    navs = [],
    errors = [],
    linked = [];
  const navSigs = [],
    grades = [],
    fakes = [],
    credits = new Map(),
    later = [],
    centred = [],
    inks = [],
    bodies = [];
  let glMax = { n: 0, stop: null, items: [] },
    glAsked = 0; // the screen with the most live WebGL contexts
  const fxObs = []; // every effect ground seen, with how flat it read
  const btnSeen = new Set(); // buttons already read against their ground (button-contrast)
  let vw = width,
    vh = height,
    docWidth = width,
    stops = 0,
    held = [],
    PG = null,
    copy = null,
    secCount = 0;
  let tm0 = Date.now();
  const TM = n => {
    if (process.env.CC_TIMING) {
      console.error(`  [${width}] ${n}: ${((Date.now() - tm0) / 1000).toFixed(1)} s`);
    }
    tm0 = Date.now();
  };
  const safe = async (name, fn) => {
    try {
      return await fn();
    } catch (e) {
      lose(errors, name, e);
      return null;
    }
  };
  // a box in page coordinates, put on the measured screen that shows the most of it
  const place = d => {
    let best = -1,
      ov = 0;
    for (let i = 0; i < stopY.length; i++) {
      const o = Math.min(d.top + d.height, stopY[i] + vh) - Math.max(d.top, stopY[i]);
      if (o > ov) {
        ov = o;
        best = i;
      }
    }
    if (best < 0) return { stop: null, rects: [] };
    const y = stopY[best],
      top = Math.max(0, d.top - y),
      bottom = Math.min(vh, d.top + d.height - y);
    return { stop: best, rects: [{ left: d.left, top, width: d.width, height: Math.max(2, bottom - top) }] };
  };
  try {
    await tab.goto(url);
    await tab.eval("document.fonts ? document.fonts.ready.then(() => 1) : 1", 15000).catch(() => {});
    await waitReady(tab);
    await sleep(1800);
    await tab.eval(`(${lib.toString()})()`);
    // the whole page once (lazy parts load); without --quick, what animates in when scrolled to is noted on the way
    TM("load");
    await tab.eval(`window.__cc.prescroll(${!quick})`, 600000);
    TM("prescroll");
    // the page as the browser built it, for copy-lint (gate.mjs): a dev server or a built app writes its words with
    // a script, so its file or served shell holds none of them
    if (first)
      await safe("rendered page", async () =>
        writeFileSync(
          join(outDir, "rendered.html"),
          "<!doctype html>\n" + (await tab.eval("document.documentElement.outerHTML")),
        ),
      );
    await sleep(quick ? 1200 : 400);
    held = (await safe("held", () => tab.eval("window.__cc.findHeld()"))) || [];
    if (PROBE) console.log(`probe @${width}:`, JSON.stringify(await tab.eval(PROBE).catch(e => e.message), null, 1));
    // the page as a whole: headings, actions, prices, links and the copy (placed on a screen once the walk is done)
    PG = await safe("page", () => tab.eval("window.__cc.pageInfo()", 60000));
    if (PG) {
      // heading-scale: the h1 largest, every h2 one size, every h3 one size below the h2; display type inside a dealt
      // moment's section (letters-assemble, liquid-type, a statement) is set at the moment's own size and not ranked
      const hs = PG.heads.filter(x => !x.foot && !(x.moment && x.level > 1));
      const lv = n => hs.filter(x => x.level === n);
      const h1 = lv(1),
        h2 = lv(2),
        h3 = lv(3).filter(x => !x.card),
        h3all = lv(3);
      const top = h1.length ? Math.max(...h1.map(x => x.fs)) : null;
      if (!h1.length)
        later.push({
          check: "heading-scale",
          sev: "WARN",
          id: 0,
          sel: "(the page)",
          text: "",
          msg: "the page has no visible h1",
          doc: null,
        });
      if (top)
        for (const x of h2.filter(x => x.fs >= top - 0.5).slice(0, 3))
          later.push({
            check: "heading-scale",
            sev: "FAIL",
            id: x.id,
            sel: x.sel,
            text: x.text,
            msg: `an h2 at ${x.fs}px, as large as the h1 (${top}px) or larger`,
            doc: x.doc,
          });
      if (h2.length) {
        const m2 = Math.min(...h2.map(x => x.fs));
        for (const x of h3all.filter(x => x.fs >= m2 - 0.5).slice(0, 3))
          later.push({
            check: "heading-scale",
            sev: "FAIL",
            id: x.id,
            sel: x.sel,
            text: x.text,
            msg: `an h3 at ${x.fs}px, as large as the smallest h2 (${m2}px) or larger`,
            doc: x.doc,
          });
      }
      for (const [n, list] of [
        [2, h2],
        [3, h3],
      ]) {
        if (list.length < 2) continue;
        const mx = Math.max(...list.map(x => x.fs)),
          mn = Math.min(...list.map(x => x.fs)),
          k = mx / mn;
        if (k > 1.15) {
          const big = list.find(x => x.fs === mx),
            small = list.find(x => x.fs === mn);
          later.push({
            check: "heading-scale",
            sev: k > 1.3 ? "FAIL" : "WARN",
            id: big.id,
            sel: big.sel,
            text: big.text,
            msg: `h${n} headings in ${new Set(list.map(x => x.fs)).size} sizes, ${mn}px ("${small.text.slice(0, 24)}") to ${mx}px (x${k.toFixed(2)})`,
            doc: big.doc,
          });
        }
      }
      if (h2.length) {
        const med = median(h2.map(x => x.fs));
        const odd = PG.big.filter(x => x.fs > med + 0.5 && norm(x.text) !== norm(PG.brand));
        // (a figure over the h2, a stat or a price, is told with the figures: a FAIL)
        const rest = odd.filter(x => !(/\d/.test(x.text) && x.text.length <= 16));
        if (rest.length)
          later.push({
            check: "heading-scale",
            sev: "WARN",
            id: rest[0].id,
            sel: rest[0].sel,
            text: rest[0].text,
            msg: `${rest.length} line${rest.length > 1 ? "s" : ""} of plain text set larger than the section headings (${rest[0].fs}px against h2 ${med}px)`,
            doc: rest[0].doc,
          });
      }
      // a heading the text under it outranks (heading-scale), one card part in two looks (card-family), text set on a
      // curve (tilt), text links in more than two looks (link-styles)
      for (const x of PG.outranked || [])
        later.push({
          check: "heading-scale",
          sev: x.sev,
          id: x.id,
          sel: x.sel,
          text: x.text,
          msg: x.msg,
          doc: x.doc,
          fix: "set the heading larger than the text under it, or that text smaller: the heading reads first",
        });
      // heading-align: the section headings left-aligned, but one or two centred (a heading's place is part of its look)
      {
        const h2s = hs.filter(x => x.level === 2 && !x.card),
          cen = h2s.filter(x => x.centred),
          left = h2s.length - cen.length;
        if (cen.length && left >= 2 && cen.length <= left / 2)
          later.push({
            check: "heading-align",
            sev: "WARN",
            id: cen[0].id,
            sel: cen[0].sel,
            text: cen[0].text,
            msg: `${left} section headings sit on the left, ${cen.length} centred: ${cen
              .slice(0, 3)
              .map(x => `"${x.text.slice(0, 24)}"`)
              .join(", ")}`,
            doc: cen[0].doc,
          });
      }
      for (const x of PG.cardFam || [])
        later.push({
          check: "card-family",
          sev: x.sev,
          id: x.id,
          sel: x.sel,
          text: x.text,
          msg: x.msg,
          doc: x.doc,
          more: x.ref ? [x.ref] : undefined,
        });
      const ll = PG.linkLooks || [];
      for (const x of (PG.twoLooks || []).slice(0, 3))
        later.push({
          check: "same-action",
          sev: "WARN",
          id: x.id,
          sel: x.sel,
          text: x.text,
          msg: `"${x.text.slice(0, 30)}" is a button in one place and a text link in another: one action in two looks`,
          doc: x.doc,
          more: [x.other],
          fix: "show one action one way: the same button wherever it repeats, or a text link everywhere",
        });
      if (ll.length >= 3) {
        const l0 = [...ll].sort((a, b) => a.n - b.n)[0].first;
        later.push({
          check: "link-styles",
          sev: "WARN",
          id: l0.id,
          sel: l0.sel,
          text: l0.text,
          msg: `text links in ${ll.length} looks: ${ll.map(x => `${x.look} (${x.n}, like "${x.first.text.slice(0, 20)}")`).join("; ")}`,
          doc: l0.doc,
        });
      }
      // cta: the hero, every priced card, the closing section
      if (PG.hero && !PG.ctas.some(c => c.where === "hero"))
        later.push({
          check: "cta",
          sev: "FAIL",
          id: 0,
          sel: PG.hero.sel,
          text: "",
          msg: "the hero has no button (the nav's does not count)",
          doc: PG.hero.doc,
        });
      const bySec = new Map();
      for (const p of PG.priced) {
        if (!bySec.has(p.sec)) bySec.set(p.sec, []);
        bySec.get(p.sec).push(p);
      }
      for (const list of bySec.values())
        later.push({
          check: "cta",
          sev: "FAIL",
          id: list[0].id,
          sel: list[0].sel,
          text: list[0].text,
          msg:
            list[0].whole ?
              "the pricing section shows prices but has no button or link to choose or buy one"
            : `${list.length} priced card${list.length > 1 ? "s" : ""} with no action in or under ${list.length > 1 ? "them" : "it"}${
                list.length > 1 ?
                  ": "
                  + list
                    .slice(0, 4)
                    .map(p => `"${p.text.slice(0, 20)}"`)
                    .join(", ")
                : ""
              }`,
          doc: list[0].doc,
          more: list.slice(1).map(p => p.doc),
        });
      if (PG.last && !PG.ctas.some(c => c.where === "last"))
        later.push({
          check: "cta",
          sev: "FAIL",
          id: 0,
          sel: PG.last.sel,
          text: PG.last.text,
          msg: "the last section before the footer ends with no button",
          doc: PG.last.doc,
        });
      for (const s2 of PG.longBare)
        later.push({
          check: "cta",
          sev: "WARN",
          id: s2.id,
          sel: s2.sel,
          text: s2.text,
          msg: "a section over 1.5 screens long with no link or button in it",
          doc: s2.doc,
        });
      // links (once: they do not change with the width)
      if (first) {
        for (const l of PG.links)
          later.push({
            check: "links",
            sev: l.sev,
            id: l.id,
            sel: l.sel,
            text: l.label,
            msg: `"${l.label || l.href}" ${l.why}`,
            doc: l.doc,
          });
        const missing = [];
        for (const pg of PG.pages)
          if (!missing.some(x => x.url === pg.url) && !(await pageExists(pg.url))) missing.push(pg);
        for (const pg of missing.slice(0, 8))
          later.push({
            check: "links",
            sev: "WARN",
            id: pg.id,
            sel: pg.sel,
            text: pg.label,
            msg: `"${pg.label}" goes to ${pg.href}, which does not exist here`,
            doc: pg.doc,
          });
        if (PG.credits.length)
          for (const c of [...new Set(PG.credits.map(x => x.toLowerCase()))])
            credits.set("text:" + c, { id: 0, sel: "(the page text)", name: `the page credits ${c}`, host: c });
      }
      // hero actions: at most two (a study of fifteen sites: 0 to 2 on all of them)
      const heroC = PG.ctas.filter(c => c.where === "hero");
      // the nav's buttons repeating the hero's: two or more targets reached by both on the first screen (one shared main
      // action is the norm: figma.com and x.ai both do it)
      {
        const navC = PG.ctas.filter(c => c.where === "nav" && c.href && c.doc.top < vh),
          dup = [
            ...new Set(
              heroC.filter(c => c.href && c.doc.top < vh && navC.some(d => d.href === c.href)).map(c => c.href),
            ),
          ];
        if (dup.length >= 2) {
          const c0 = heroC.find(c => c.href === dup[0]);
          later.push({
            check: "same-action",
            sev: "WARN",
            id: c0.id,
            sel: c0.sel,
            text: c0.label,
            msg: `the first screen shows ${dup.length} actions twice, in the nav and in the hero (${dup.map(h => `"${heroC.find(c => c.href === h).label}"`).join(", ")})`,
            doc: c0.doc,
            more: navC.filter(d => dup.includes(d.href)).map(d => d.doc),
            fix: "one action twice at most: the main one in the nav and the hero; give the hero's second button its own job or drop the nav's",
          });
        }
      }
      if (heroC.length > 2)
        later.push({
          check: "copy-actions",
          sev: "FAIL",
          id: heroC[2].id,
          sel: heroC[2].sel,
          text: heroC[2].label,
          msg: `${heroC.length} actions in the hero (${heroC.map(c => `"${c.label}"`).join(", ")}); at most 2`,
          doc: heroC[2].doc,
          more: heroC.slice(0, 2).map(c => c.doc),
        });
      // heading steps: a card title a clear step over the text under it, an h2 a clear step over the h3s
      {
        const h2 = PG.heads.filter(x => x.level === 2 && !x.foot && !x.card && !x.moment),
          h3c = PG.heads.filter(x => x.level === 3 && !x.foot && !x.moment);
        if (h2.length >= 2 && h3c.length >= 2) {
          const a = median(h2.map(x => x.fs)),
            b = median(h3c.map(x => x.fs));
          if (b < a && a / b < 1.3)
            later.push({
              check: "heading-scale",
              sev: "WARN",
              id: h3c[0].id,
              sel: h3c[0].sel,
              text: h3c[0].text,
              msg: `the h3s (${b}px) are only ${(a / b).toFixed(2)}x smaller than the h2s (${a}px): one level a clear step (1.3x or more) below the other`,
              doc: h3c[0].doc,
            });
        }
      }
      // copy-length: a paragraph set as a heading (a study of fifteen sites: headlines of 1 to 19 words, median 4; the readers' 27- and
      // 31-word statements and a five-line display paragraph), at a desktop width
      if (width >= 1000)
        for (const x of PG.heads
          .filter(x => x.level <= 2 && !x.foot && !x.card && x.fs >= 28 && (x.words >= 22 || x.lines >= 4))
          .slice(0, 3))
          later.push({
            check: "copy-length",
            sev: "WARN",
            id: x.id,
            sel: x.sel,
            text: x.text,
            msg: `a ${x.level === 1 ? "headline" : "section heading"} of ${x.words} words on ${x.lines} lines at ${x.fs}px: a paragraph set in display type`,
            doc: x.doc,
          });
    }
    // second pass: what a builder leaves on the page, effects and card layouts used too often, boxes three deep, plan cards,
    // column edges, captions touching their picture, rows closer than a picture to its caption
    if (first) {
      const mk =
        (await safe("kind", () =>
          tab.eval(
            `(() => { const m = (n) => { const e = document.querySelector('meta[name="' + n + '"]'); return e ? String(e.getAttribute('content') || '').trim().toLowerCase() : ''; }; return { taste: m('taste-kind'), pageType: m('page-type'), pageKind: m('page-kind'), siteKind: m('site-kind'), dataType: String(document.documentElement.getAttribute('data-type') || '').trim().toLowerCase() }; })()`,
          ),
        )) || {};
      const k = pageKind(PG ? PG.title : "", mk);
      KIND = k.kind;
      KIND_FROM = k.from;
      TYPE = KIND_OF[KIND] || KIND;
      // a product with a technical subject (hardware, a device: --tech-subject or a tech site-kind) is judged as tech, as
      // effect-kind's kindFrom judges it: effects-fit and photo-print read this one verdict
      TECH =
        TYPE === "software"
        || (TYPE === "product"
          && (!!(MOD_FLAGS.get("visuals") || {})["tech-subject"]
            || /^(tech|software|gaming|game|games|ai|saas|app|hardware)$/.test(mk.siteKind || "")));
      if (!KIND && !NOKIND_TOLD) {
        NOKIND_TOLD = true;
        later.push({
          check: "effects-fit",
          sev: "WARN",
          id: 0,
          sel: "(the page)",
          text: "",
          msg: 'no page kind found (--page or --type, <html data-type>, <meta name="page-type">, <meta name="site-kind">, or a title written "Name: what it is for whom"): effects, prices and pictures were not judged against what the page is',
          doc: null,
          fix: 'mark the kind as the starter does: <html data-type="tech|product|place|service"> and <meta name="site-kind">, or pass --page <kind>',
        });
      }
      // the copy checks once the kind is known (copy-fact reads platforms on software pages and genres on gaming pages)
      if (PG) {
        copy = copyChecks(PG);
        for (const x of copy.F) later.push(x);
      }
    }
    TM("pageInfo");
    const AU = await safe("audit", () => tab.eval(`window.__cc.audit(${JSON.stringify(FAMILIES)})`, 120000));
    if (AU) auditFindings(AU, first, later);
    // the first screen shows the hero alone; numbers kept with their units, rows of tabs, figures, credits, notes and
    // captions, printed stand-in addresses, forms three boxes deep (read at the top of the page)
    TM("audit");
    const HF = await safe("hero-fill", () => tab.eval("window.__cc.heroFill()"));
    if (HF)
      later.push({
        check: "hero-fill",
        sev: "FAIL",
        id: HF.id,
        sel: HF.sel,
        text: HF.text,
        msg: `the next section shows on the first screen: it starts at ${HF.top}px on a ${HF.vh}px screen (the hero ends at ${HF.heroBottom}px)`,
        doc: HF.doc,
      });
    const EX = await safe("extras", () => tab.eval("window.__cc.extras()", 60000));
    if (EX) extrasFindings(EX, PG, AU, first, later, width);
    // a tablet's bar with only the wordmark and a menu button, its main action shut in the menu
    if (width >= 700 && width < 1100) {
      const NC = await safe("nav-collapse", () => tab.eval("window.__cc.navCollapse()"));
      // (a FAIL when the action would fit: the readers counted it on five pages of six)
      if (NC)
        later.push({
          check: "nav",
          sev: NC.free >= 240 ? "FAIL" : "WARN",
          id: NC.id,
          sel: NC.sel,
          text: NC.text,
          msg: `at ${width}px the bar shows only the wordmark and a menu button: its main action "${NC.text}" is shut in the menu, with ${NC.free}px of the bar free`,
          doc: NC.doc,
          fix: "keep the main action in the bar beside the menu button down to the phone width",
        });
    }
    // prints over photographs, grounds, splits, opening hours, the menu button's fill, short sections, the hero's
    // buttons under the fold, the main action on too many buttons
    {
      const MC = await safe("more", () => tab.eval("window.__cc.moreChecks()", 60000));
      moreFindings(MC, PG, first, later, width, height, copy && copy.T);
    }
    // links that land on a closed answer or a hidden panel (once)
    if (first)
      for (const x of (await safe("anchors", () => tab.eval("window.__cc.closedAnchors()", 30000))) || [])
        later.push({
          check: "links",
          sev: "WARN",
          id: x.id,
          sel: x.sel,
          text: x.text,
          msg: `"${x.text.slice(0, 40)}" goes to #${x.target}, ${x.kind} that stays shut when the link is followed`,
          doc: null,
          fix: "open the target when its hash is followed (details.open = true on hashchange), or link to the section",
        });
    // web fonts the type asks for that never loaded (once)
    if (first)
      for (const x of (await safe("font-load", () => tab.eval("window.__cc.fontLoad()", 30000))) || [])
        later.push({
          check: "font-load",
          sev: "WARN",
          id: x.id,
          sel: x.sel,
          text: x.family,
          msg: `"${x.family}" is asked for by ${x.where} but never loaded (${x.why}): it shows in its fallback`,
          doc: x.doc,
        });
    TM("hero+extras");
    const late = new Map(); // pictures still loading 3 s after they came on screen
    let s = 0;
    for (let k = 0; k < 80; k++) {
      await tab.eval(`window.__cc.scrollTo(${Math.round(s)})`);
      if (quick) await sleep(900);
      else await tab.eval("window.__cc.arrive()", 60000);
      for (const p of (await safe("pictures", () => tab.eval("window.__cc.picsReady(3000)", 20000))) || [])
        if (!late.has(p.id)) late.set(p.id, p);
      const m = await tab.eval(`window.__cc.measure(${k})`, 120000);
      vw = m.vw;
      vh = m.vh;
      docWidth = Math.max(docWidth, m.docWidth);
      stopY[k] = m.scrollY;
      stops = k + 1;
      if (k === 0) secCount = m.sections.length;
      shots[k] = await tab.shot();
      if (keepStops)
        writeFileSync(join(outDir, `${width}-stop-${String(k).padStart(2, "0")}.jpg`), Buffer.from(shots[k], "base64"));
      takePage(errors, m.errors, `stop ${k}: `);
      for (const f of m.findings) F.push(Object.assign(f, { stop: k }));
      for (const x of m.ink) inks.push(Object.assign(x, { stop: k }));
      for (const x of m.body) bodies.push(Object.assign(x, { stop: k }));
      {
        const gl = (await tab.eval("window.__ccgl ? window.__ccgl.now() : []").catch(() => [])) || [];
        if (gl.length > glMax.n) glMax = { n: gl.length, stop: k, items: gl };
      }
      for (const g of m.grid) grid.push(Object.assign(g, { stop: k }));
      for (const c of m.centred) if (!centred.some(x => x.id === c.id)) centred.push(Object.assign(c, { stop: k }));
      if (m.nav) navs.push(Object.assign(m.nav, { stop: k }));
      navSigs.push(m.navSig ? Object.assign(m.navSig, { stop: k }) : null);
      for (const c of m.credits) if (!credits.has(c.name)) credits.set(c.name, Object.assign(c, { stop: k }));
      for (const x of m.fakes) if (!fakes.some(y => y.id === x.id)) fakes.push(Object.assign(x, { stop: k }));
      // the grounds behind UI (dark-ground) and the photographs (photo-set), read from this screen's picture
      if (m.grounds.length || m.photos.length) {
        await helper.eval(`window.__h.use("stop", ${JSON.stringify(shots[k])})`);
        if (m.grounds.length) {
          const gs = await helper.eval(
            `window.__h.ground("stop", ${JSON.stringify(m.grounds.map(g => ({ rect: g.rect, holes: g.holes })))})`,
          );
          m.grounds.forEach((g, i) => {
            const lg = gs[i];
            if (lg == null) return;
            const lc = relLum(g.card);
            if (lc < 0.06) {
              const k2 = (lg + 0.05) / (lc + 0.05);
              if (k2 < 3)
                F.push({
                  check: "dark-ground",
                  sev: "FAIL",
                  id: g.id,
                  sel: g.sel,
                  text: "",
                  stop: k,
                  rects: [g.rect],
                  msg: `the ground behind the UI is ${lg < lc ? "darker than" : `only ${k2.toFixed(1)}:1 lighter than`} its card (${(lg * 100).toFixed(1)}% against ${(lc * 100).toFixed(1)}% luminance; needs 3:1)`,
                });
            } else if (g.frag && relLum(g.frag) > 0.6 && (relLum(g.frag) + 0.05) / (lg + 0.05) < 1.15) {
              F.push({
                check: "dark-ground",
                sev: "WARN",
                id: g.id,
                sel: g.sel,
                text: "",
                stop: k,
                rects: [g.rect],
                msg: "the ground behind the UI is nearly as light as the UI on it (white on near-white)",
              });
            }
          });
        }
        if (m.photos.length) {
          const gr = await helper.eval(`window.__h.grade("stop", ${JSON.stringify(m.photos.map(p => p.rect))})`);
          m.photos.forEach((p, i) => {
            if (gr[i] && !grades.some(x => x.id === p.id)) grades.push(Object.assign({}, p, gr[i], { stop: k }));
          });
        }
      }
      // empty-visual: a picture, canvas, effect ground or frame that shows one colour all over (its ground, or nothing)
      if (m.visuals && m.visuals.length) {
        await helper.eval(`window.__h.use("vis", ${JSON.stringify(shots[k])})`);
        const fl =
          (await safe("empty-visual", () =>
            helper.eval(
              `window.__h.flat("vis", ${JSON.stringify(m.visuals.map(v => ({ rect: v.rect, holes: v.holes })))})`,
            ),
          )) || [];
        // the same screen again with each visual's own content hidden: a picture, canvas or effect canvas whose screen
        // does not change when it is hidden shows only its ground, a gradient as much as one flat colour (an image left
        // at opacity 0 by a reveal that never fires, a shader that failed over a radial ground). Confirmed once more
        // 1.2 s later (a canvas still fading in is not told)
        const hv = m.visuals
          .map((v, i) => ({ v, i }))
          .filter(
            ({ v, i }) =>
              v.hide
              && !v.broken
              && !(fl[i] && fl[i].n >= 150 && fl[i].share >= 0.985)
              && v.rect.width >= 64
              && v.rect.height >= 48,
          );
        if (hv.length) {
          const still = async (list, A) => {
            await tab.eval(`window.__cc.hideVis(${JSON.stringify(list.map(x => x.v.id))}, true)`);
            const B = await tab.shot(92);
            await tab.eval("window.__cc.hideVis([], false)");
            await helper.eval(`window.__h.use("hvA", ${JSON.stringify(A)})`);
            await helper.eval(`window.__h.keep("hvB", ${JSON.stringify(B)})`);
            const d =
              (await safe("empty-visual", () =>
                helper.eval(
                  `window.__h.diffH("hvA", "hvB", ${JSON.stringify(list.map(x => ({ rect: x.v.rect, holes: x.v.holes })))}, 3)`,
                ),
              )) || [];
            return list
              .filter((x, j) => d[j] && d[j].n >= 150 && d[j].share < 0.004)
              .map((x, j) => Object.assign(x, { d: d[list.indexOf(x)] }));
          };
          let sus = (await safe("empty-visual", async () => still(hv, await tab.shot(92)))) || [];
          if (sus.length) {
            await sleep(1200);
            sus = (await safe("empty-visual", async () => still(sus, await tab.shot(92)))) || [];
          }
          for (const { v, i, d } of sus) {
            fl[i] = { n: d.n, share: 1, mode: "unchanged", hid: true };
          }
        }
        m.visuals.forEach((v, i) => {
          const f = fl[i];
          // a ground with UI or words over a good part of it is that UI's backdrop, flat or not: the visual shows
          // something (a ground behind nothing is what is judged; a shader that fails is the gl-fallback pass's)
          const area = Math.max(1, v.rect.width * v.rect.height);
          const covered = Math.min(
            1,
            (v.holes || []).reduce(
              (s, o) =>
                s
                + Math.max(0, Math.min(o.left + o.width, v.rect.left + v.rect.width) - Math.max(o.left, v.rect.left))
                  * Math.max(0, Math.min(o.top + o.height, v.rect.top + v.rect.height) - Math.max(o.top, v.rect.top)),
              0,
            ) / area,
          );
          // (an effect ground behind its UI card still has to draw: the ground left around the card is judged at the end
          // against the other hosts of the same effect, fxObs)
          if (v.kind === "fx" && f && f.n >= 150) fxObs.push({ v, f, k, covered });
          if (!v.broken && !(f && f.hid) && (v.kind === "fx" || v.kind === "bg") && covered >= 0.3) return;
          const empty = v.broken || (f && f.n >= 150 && f.share >= (v.kind === "fx" ? 0.99 : 0.985));
          if (!empty) return;
          const what =
            {
              img: "picture",
              canvas: "canvas",
              fx: `effect ground${v.fx ? ` (${v.fx})` : ""}`,
              bg: "background picture",
              frame: "frame",
            }[v.kind] || "visual";
          const why =
            v.broken ?
              `its image ${v.src} did not load`
            : v.why
              || (v.refused ?
                "the checker held the page to 4 live WebGL contexts and refused this one, and its fallback is empty too"
              : "");
          F.push({
            check: "empty-visual",
            sev: "FAIL",
            id: v.id,
            sel: v.sel,
            text: v.fx || v.src || "",
            stop: k,
            rects: [v.rect],
            msg:
              f && f.hid ?
                `the ${what} shows nothing here: with it hidden the screen looks the same (${v.kind === "img" ? "the picture is there but invisible: faded out, clipped or covered" : "it draws nothing over its ground"}), so the visitor sees only the ground behind it${why ? `; ${why}` : ""}`
              : `the ${what} shows nothing here: ${f && f.n ? `${Math.round(f.share * 100)}% of it is one colour (${f.mode})` : "no picture"}${why ? `; ${why}` : ""}`,
          });
        });
      }
      // fade-cut: lines of a mock drawn far fainter than their colour says (a mask or a gradient over the mock's edge),
      // confirmed on a second picture 1.2 s later (a row of a loop caught mid-change is not told); a line under another
      // box of the mock (overlap-text)
      if (m.fades && m.fades.length) {
        await helper.eval(`window.__h.use("fade", ${JSON.stringify(shots[k])})`);
        const items = m.fades.flatMap((x, i) => x.rects.map(r => ({ i, r })));
        const got =
          (await safe("fades", () =>
            helper.eval(`window.__h.inkRange("fade", ${JSON.stringify(items.map(o => o.r))})`),
          )) || [];
        const faint = new Map();
        items.forEach((o, j) => {
          const x = m.fades[o.i],
            g = got[j];
          if (g == null || x.exp < 0.15 || x.cover) return;
          if (g < 0.35 * x.exp) faint.set(o.i, Math.min(faint.get(o.i) ?? 1, g));
        });
        // a mock whose every line is faint is no fade at its edge (a veil, a mock still drawing): only a part of a host
        const byHost = new Map();
        m.fades.forEach((x, i) => {
          if (!byHost.has(x.host)) byHost.set(x.host, []);
          byHost.get(x.host).push(i);
        });
        for (const [, list] of byHost) if (list.every(i => faint.has(i))) for (const i of list) faint.delete(i);
        if (faint.size) {
          await sleep(1200);
          const again = await tab.shot();
          await helper.eval(`window.__h.use("fade2", ${JSON.stringify(again)})`);
          const idx = [...faint.keys()],
            rr = idx.map(i => m.fades[i].rects[m.fades[i].rects.length - 1]);
          const g2 =
            (await safe("fades", () => helper.eval(`window.__h.inkRange("fade2", ${JSON.stringify(rr)})`))) || [];
          const still = idx.filter((i, j) => g2[j] != null && g2[j] < 0.35 * m.fades[i].exp);
          const hosts = new Map();
          for (const i of still) {
            const x = m.fades[i];
            if (!hosts.has(x.host)) hosts.set(x.host, []);
            hosts.get(x.host).push(x);
          }
          for (const [, list] of hosts) {
            const x = list[0];
            F.push({
              check: "fade-cut",
              sev: "WARN",
              id: x.id,
              sel: x.sel,
              text: x.text,
              stop: k,
              rects: [...list.flatMap(y => y.rects).slice(0, 8), Object.assign({}, x.hostRect, { ref: true })],
              msg: `${list.length > 1 ? `${list.length} lines` : "a line"} of ${x.hostSel.split(" > ").pop()} fade${list.length > 1 ? "" : "s"} out under its edge (${list
                .slice(0, 3)
                .map(y => `"${y.text.slice(0, 22)}"`)
                .join(", ")}): drawn at a fraction of ${x.fg} on ${x.bg}, half-erased`,
            });
          }
        }
        // a box of the mock laid over its own text (a note card over the page's words)
        const covered = new Map();
        for (const x of m.fades) if (x.cover && !covered.has(x.cover.id)) covered.set(x.cover.id, x);
        for (const [, x] of [...covered].slice(0, 3))
          F.push({
            check: "overlap-text",
            sev: "WARN",
            id: x.cover.id,
            sel: x.cover.sel,
            text: x.cover.text,
            stop: k,
            rects: [...x.rects, Object.assign({}, x.hostRect, { ref: true })],
            msg: `inside ${x.hostSel.split(" > ").pop()}, a box sits on the mock's own text and hides it mid-line ("${x.text.slice(0, 30)}")`,
          });
      }
      // button-contrast: a filled button with no outline that hardly stands off what is around it (a dark-olive button on
      // a near-black photograph), read from the pixels of a 10px ring round it
      {
        const bf = m.buttons.filter(
          b =>
            !b.mock
            && b.real
            && b.fill
            && b.fill !== "gradient"
            && !b.stroke
            && !b.faint
            && !btnSeen.has(b.id)
            && b.rect.top >= 10
            && b.rect.top + b.rect.height <= vh - 10
            && b.rect.left >= 10
            && b.rect.left + b.rect.width <= vw - 10,
        );
        if (bf.length) {
          await helper.eval(`window.__h.use("btn", ${JSON.stringify(shots[k])})`);
          const strips = bf.flatMap(b => {
            const q = b.rect;
            return [
              { left: q.left - 10, top: q.top - 10, width: q.width + 20, height: 9 },
              { left: q.left - 10, top: q.top + q.height + 1, width: q.width + 20, height: 9 },
              { left: q.left - 10, top: q.top, width: 9, height: q.height },
              { left: q.left + q.width + 1, top: q.top, width: 9, height: q.height },
            ].map(rect => ({ rect, holes: [] }));
          });
          const gl =
            (await safe("button-contrast", () => helper.eval(`window.__h.ground("btn", ${JSON.stringify(strips)})`)))
            || [];
          bf.forEach((b, i) => {
            btnSeen.add(b.id);
            const rgb = {
                r: parseInt(b.fill.slice(1, 3), 16),
                g: parseInt(b.fill.slice(3, 5), 16),
                b: parseInt(b.fill.slice(5, 7), 16),
              },
              lb = relLum(rgb);
            const ks = gl
              .slice(i * 4, i * 4 + 4)
              .filter(v => v != null)
              .map(lg => (Math.max(lg, lb) + 0.05) / (Math.min(lg, lb) + 0.05))
              .sort((p, q) => p - q);
            if (ks.length < 4) return;
            const kk = (ks[1] + ks[2]) / 2; // the median side
            if (process.env.CC_DEBUG_BUSY)
              console.error(
                `  [btn ${width} stop ${k}] ${b.fill} sides ${ks.map(v => v.toFixed(2)).join(" ")} median ${kk.toFixed(2)} "${b.text.slice(0, 30)}"`,
              );
            if (kk < 1.3)
              F.push({
                check: "button-contrast",
                sev: "WARN",
                id: b.id,
                sel: b.sel,
                text: b.text,
                stop: k,
                rects: [b.rect],
                msg: `the button "${b.text.slice(0, 30)}" (${b.fill}) stands only ${kk.toFixed(2)}:1 off the ground around it: it reads as part of the ground, or as switched off`,
              });
          });
        }
      }
      // buttons: the page's family, and what one screen shows together (judged at the end, against the family)
      for (const b of m.buttons) if (!buttons.has(b.id)) buttons.set(b.id, Object.assign({}, b, { stop: k }));
      // (a screen whose button-like parts all sit in drawn mocks shows the mocks' own chips and pills, not the page's
      // buttons beside them)
      const onScreen = clusterLooks(m.buttons);
      if (onScreen.length > 2 && m.buttons.some(b => !b.mock)) screenLooks.push({ k, looks: onScreen });
      // gaps between sections, measured where both edges are on screen
      for (const p of m.pairs) {
        const had = pairs.get(p.i);
        if (!had || (!had.on && (p.on || p.off < had.off))) pairs.set(p.i, Object.assign(p, { stop: k }));
      }
      // body text over a picture or an effect: read the ground with the text hidden
      if (m.contrast.length) {
        await tab.eval("window.__cc.hideText(true)");
        const plate = await tab.shot(95);
        await tab.eval("window.__cc.hideText(false)");
        await helper.eval(`window.__h.use("plate", ${JSON.stringify(plate)})`);
        const items = m.contrast.flatMap((c, ci) => c.lines.map(l => ({ ci, rect: l, color: c.color })));
        const st = await helper.eval(`window.__h.stats("plate", ${JSON.stringify(items)})`);
        m.contrast.forEach((c, ci) => {
          const mine = st.filter((x, i) => x && items[i].ci === ci);
          if (!mine.length) return;
          const worst = Math.min(...mine.map(x => x.p10)),
            sd = Math.max(...mine.map(x => x.sd)),
            edge = Math.max(...mine.map(x => x.edge || 0)),
            rng = Math.max(...mine.map(x => x.rng || 0));
          const need = c.large ? 3 : 4.5;
          if (process.env.CC_DEBUG_BUSY)
            console.error(
              `  [busy ${width} stop ${k}] ${c.kind} sd ${sd.toFixed(3)} edge ${edge.toFixed(2)} rng ${rng.toFixed(2)} p10 ${worst.toFixed(2)} fs ${c.fs} "${c.text.slice(0, 40)}"`,
            );
          if (worst < need)
            F.push({
              check: "contrast",
              sev: c.large ? "WARN" : "FAIL",
              id: c.id,
              sel: c.sel,
              text: c.text,
              stop: k,
              rects: c.lines,
              msg: `${c.large ? "large" : "body"} text over a ${c.kind} reads at ${worst.toFixed(1)}:1 at its worst tenth (needs ${need}:1)${sd > 0.04 ? ", on a busy ground" : ""}`,
            });
          // busy-ground: the picture under the words changes a lot even where the contrast holds
          else if (sd > 0.12)
            F.push({
              check: "busy-ground",
              sev: sd > 0.2 && c.fs >= 24 ? "FAIL" : "WARN",
              id: c.id,
              sel: c.sel,
              text: c.text,
              stop: k,
              rects: c.lines,
              msg: `text over a busy part of a ${c.kind} (its luminance varies by ${sd.toFixed(2)} under the words)`,
            });
          // detail under the words (leaves, a weave, shadow bars): the spread may hold under a scrim, the texture stays
          else if (c.kind === "picture" && (edge > BUSY_EDGE || rng > BUSY_RNG))
            F.push({
              check: "busy-ground",
              sev: "WARN",
              id: c.id,
              sel: c.sel,
              text: c.text,
              stop: k,
              rects: c.lines,
              msg: `text over ${edge > BUSY_EDGE ? `a detailed part of a picture (its ground changes by ${edge.toFixed(1)} L* from one pixel to the next under the words)` : `an uneven part of a picture (its luminance spans ${rng.toFixed(2)} under the words: a shadow or a bright patch behind part of the line)`}`,
            });
        });
      }
      // what follows the scroll on this screen (held sections are stepped through on their own below)
      if (!quick && m.maxScroll >= 200) {
        // a part found below the screen is shown on the screen that shows it (placed once the walk is done)
        for (const x of (await safe(`stop ${k} scroll-linked`, () => tab.eval("window.__cc.probe()", 240000))) || [])
          linked.push({
            check: "scroll-linked",
            sev: x.sev,
            id: x.id,
            sel: x.sel,
            text: x.text,
            msg: x.msg,
            doc: x.doc,
          });
      }
      if (m.scrollY >= m.maxScroll - 2) break;
      s = Math.min(m.scrollY + 0.85 * m.vh, m.maxScroll);
    }
    for (const { doc, ...x } of linked) F.push(Object.assign(x, place(doc)));
    // an effect ground behind a UI card that shows one flat colour around the card, while another host of the same
    // effect draws (the readers' blank silk card among three drawn ones): the effect did not draw there
    {
      const drew = new Set(fxObs.filter(o => o.f.share < 0.9 && o.v.fx).map(o => o.v.fx)),
        told = new Set(F.filter(f => f.check === "empty-visual").map(f => f.id));
      for (const o of fxObs) {
        if (
          told.has(o.v.id)
          || o.covered < 0.3
          || o.covered > 0.75
          || o.f.share < 0.995
          || !o.v.fx
          || !drew.has(o.v.fx)
        )
          continue;
        told.add(o.v.id);
        F.push({
          check: "empty-visual",
          sev: "FAIL",
          id: o.v.id,
          sel: o.v.sel,
          text: o.v.fx,
          stop: o.k,
          rects: [o.v.rect],
          msg: `the effect ground (${o.v.fx}) behind this UI does not draw: the ground around the UI is one flat colour (${o.f.mode}, ${Math.round(o.f.share * 100)}%), while other ${o.v.fx} grounds on the page draw`,
        });
      }
    }
    // a picture loaded but left invisible once the whole page has been scrolled through, and still so 1.1 s after it is
    // brought to the middle of the screen (a reveal whose observer never fires): its frame shows only its ground
    {
      const told = new Set(F.filter(f => f.check === "empty-visual").map(f => f.id));
      for (const g of (await safe("ghosts", () => tab.eval("window.__cc.ghostPics()", 60000))) || []) {
        if (told.has(g.id) || told.has(g.img)) continue;
        told.add(g.id);
        F.push(
          Object.assign(
            {
              check: "empty-visual",
              sev: "FAIL",
              id: g.id,
              sel: g.sel,
              text: g.src,
              msg: `the picture ${g.src} has loaded but stays ${g.how} once the page is scrolled through, still 1.1 s after it is brought to the middle of the screen: its frame shows only its ground${g.tall ? " (a frame taller than the screen never reaches a reveal threshold of 1)" : " (a reveal that never fires)"}`,
              fix: "show the picture at rest: reveal it with a threshold the frame can reach (0.1-0.2), or not at all",
            },
            place(g.doc),
          ),
        );
      }
    }
    // pictures that never loaded on their screen
    if (late.size) {
      const L = [...late.values()],
        done =
          (await safe("pictures", () => tab.eval(`window.__cc.imgDone(${JSON.stringify(L.map(p => p.id))})`))) || [];
      L.forEach((p, i) =>
        F.push(
          Object.assign(
            {
              check: "empty-visual",
              sev: done[i] ? "WARN" : "FAIL",
              id: p.id,
              sel: p.sel,
              text: p.src,
              msg:
                done[i] ?
                  `the picture ${p.src} was still loading 3 s after it came on screen (its frame showed empty meanwhile): make it smaller, or load it before it is reached`
                : `the picture ${p.src} never loaded: its frame shows empty`,
            },
            place(p.doc),
          ),
        ),
      );
    }
    // flush: content on an edge where the ground changes (the closing call on the footer), or sections run together
    TM("walk");
    for (const x of (await safe("seams", () => tab.eval("window.__cc.seams()", 240000))) || []) {
      let sev = null,
        msg = "";
      if (x.side === "gap") {
        sev = x.d < 8 ? "FAIL" : "WARN";
        msg = `${x.a.split(" > ").pop()} and ${x.b.split(" > ").pop()} run together: ${x.d}px between their content, on one ground`;
      } else {
        sev =
          x.d < 12 ? "FAIL"
          : width >= 1000 || x.d < 20 ? "WARN"
          : null;
        msg =
          x.side === "bottom" ?
            `${x.btn ? "its button" : "its last line"} sits ${x.d}px above ${x.rule ? `the rule on top of ${x.foot ? "the footer" : x.b.split(" > ").pop()}` : `the lower edge of ${x.a.split(" > ").pop()}, where the ground changes to ${x.foot ? "the footer" : x.b.split(" > ").pop()}`}`
          : `its first line sits ${x.d}px under the top edge of ${x.b.split(" > ").pop()}, where the ground changes`;
      }
      if (sev) F.push(Object.assign({ check: "flush", sev, id: x.id, sel: x.sel, text: x.text, msg }, place(x.doc)));
    }
    // shader-lint and shaders that failed (the first width: the page's shaders do not change with it)
    if (first) {
      const GI = await safe("gl", () => tab.eval("window.__cc.glInfo()"));
      if (GI) {
        for (const x of GI.fails.slice(0, 3))
          F.push({
            check: "shader-lint",
            sev: "FAIL",
            id: 0,
            sel: x.host,
            text: "",
            stop: null,
            rects: [],
            msg: `a shader failed to ${x.kind} even on the checker's CPU WebGL: ${x.log.split("\n")[0] || "(no log)"}`,
          });
        const L = await safe("shader-lint", () => shaderLint(GI, url));
        if (L)
          for (const h of L.hits.slice(0, 8))
            F.push({
              check: "shader-lint",
              sev: "FAIL",
              id: 0,
              sel: h.from,
              text: h.word,
              stop: null,
              rects: [],
              msg: `a shader uses "${h.word}" as a name (line ${h.line}: ${h.text}): GLSL ES reserves it, so a strict GPU rejects the whole shader and the picture stays empty`,
            });
        if (L) report.shaders = (report.shaders || 0) + L.n;
      }
    }
    // text-contrast: text on a plain ground, one finding per colour, ground and kind (body 7:1, the rest 4.5:1)
    {
      const G = new Map();
      for (const x of inks.filter(y => !y.drawn)) {
        const key = `${x.body ? "b" : "m"}|${x.col}|${x.bg}`;
        if (!G.has(key)) G.set(key, []);
        G.get(key).push(x);
      }
      // text inside drawn mocks (a chip, an avatar's initials, a muted row): one WARN for all of them, the worst first
      const drawn = inks.filter(y => y.drawn).sort((a, b) => a.k - b.k);
      if (drawn.length) {
        const x = drawn[0],
          looks = [...new Set(drawn.map(y => `${y.col} on ${y.bg}`))];
        F.push({
          check: "text-contrast",
          sev: "WARN",
          id: x.id,
          sel: x.sel,
          text: x.text,
          stop: x.stop,
          rects: drawn
            .filter(y => y.stop === x.stop)
            .slice(0, 6)
            .flatMap(y => y.rects.slice(0, 1)),
          msg: `${drawn.length} line${drawn.length > 1 ? "s" : ""} of text in drawn mocks read under 4.5:1 (${looks.length} colour pair${looks.length > 1 ? "s" : ""}), the worst "${x.text.slice(0, 24)}" in ${x.col} on ${x.bg} at ${x.k}:1`,
          fix: "lift the mocks' muted text (labels, meta, initials) to 4.5:1 on their own panel, or set it larger",
        });
      }
      const hexRgb = s => ({
        r: parseInt(s.slice(1, 3), 16),
        g: parseInt(s.slice(3, 5), 16),
        b: parseInt(s.slice(5, 7), 16),
      });
      // a recorded taste's own pairs (record.mjs kit prints them as --p-*-ink on --p-*): a pair the taste sets reads
      // WARN from 3:1 (large text and controls), never FAIL; under 3:1 it FAILs like any other
      const tastePairs =
        G.size ?
          (await tab
            .eval(
              `(() => {
                if (!document.querySelector('meta[name="taste"]')) return [];
                const root = getComputedStyle(document.documentElement), probe = document.createElement("i");
                document.body.appendChild(probe);
                const hex = v => {
                  probe.style.color = "";
                  probe.style.color = v;
                  const m = (probe.style.color && getComputedStyle(probe).color.match(/\\d+(\\.\\d+)?/g)) || [];
                  return m.length >= 3 ? "#" + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, "0")).join("") : "";
                };
                const out = ["action", "accent", "inv-action", "inv-accent"]
                  .map(k => [hex(root.getPropertyValue("--p-" + k + "-ink").trim()), hex(root.getPropertyValue("--p-" + k).trim())])
                  .filter(([a, b]) => a && b);
                probe.remove();
                return out;
              })()`,
            )
            .catch(() => [])) || []
        : [];
      const tastePair = x =>
        x.k >= 3
        && tastePairs.some(([ink, bg]) => ink === (x.col || "").toLowerCase() && bg === (x.bg || "").toLowerCase());
      for (const list of G.values()) {
        list.sort((a, b) => a.k - b.k);
        const x = list[0];
        // the ground read from the page's boxes, checked against the screen's pixels round the line: a band drawn by
        // another layer (a dark nav band behind white words on a grey panel) is what the eye reads the words on
        if (
          shots[x.stop]
          && x.rects
          && x.rects[0]
          && /^#[0-9a-f]{6}$/i.test(x.bg || "")
          && /^#[0-9a-f]{6}$/i.test(x.col || "")
        ) {
          const q = x.rects[0],
            hh = Math.max(9, q.height),
            strips = [
              { left: q.left - 2, top: q.top - 11, width: q.width + 4, height: 9 },
              { left: q.left - 2, top: q.top + q.height + 2, width: q.width + 4, height: 9 },
              { left: q.left - 12, top: q.top, width: 9, height: hh },
              { left: q.left + q.width + 3, top: q.top, width: 9, height: hh },
            ].map(rect => ({ rect, holes: [] }));
          await helper.eval(`window.__h.use("ink", ${JSON.stringify(shots[x.stop])})`).catch(() => {});
          const gl = (
            (await safe("text-contrast", () => helper.eval(`window.__h.ground("ink", ${JSON.stringify(strips)})`)))
            || []
          )
            .filter(v => v != null)
            .sort((a, b) => a - b);
          if (gl.length >= 3) {
            const lp = gl[Math.floor(gl.length / 2)],
              lb = relLum(hexRgb(x.bg)),
              lt = relLum(hexRgb(x.col)),
              kp = (Math.max(lp, lt) + 0.05) / (Math.min(lp, lt) + 0.05);
            if (Math.abs(lp - lb) > 0.2 && kp >= x.need) continue; // the boxes' ground is not the one on screen, and on screen it reads
          }
        }
        const what =
          x.body ? "body text"
          : x.drawn ? "text in a drawn mock"
          : "a caption, label or muted line";
        F.push({
          check: "text-contrast",
          sev: x.drawn || tastePair(x) ? "WARN" : "FAIL",
          id: x.id,
          sel: x.sel,
          text: x.text,
          stop: x.stop,
          rects: list
            .filter(y => y.stop === x.stop)
            .slice(0, 6)
            .flatMap(y => y.rects.slice(0, 1)),
          msg: `${what} in ${x.col} on ${x.bg} reads ${x.k}:1 (needs ${x.need}:1${tastePair(x) ? "; the taste sets this pair, held to 3:1" : ""})${
            list.length > 1 ?
              `; ${list.length} like it, like ${list
                .slice(1, 4)
                .map(y => `"${y.text.slice(0, 22)}"`)
                .join(", ")}`
            : ""
          }`,
        });
      }
      // body-size: running text people read at 16px or more
      const small = bodies.filter(x => x.fs < 15.5);
      if (bodies.length >= 3 && small.length >= Math.max(3, bodies.length / 2)) {
        const x = small.sort((a, b) => a.fs - b.fs)[0];
        F.push({
          check: "body-size",
          sev: "WARN",
          id: x.id,
          sel: x.sel,
          text: x.text,
          stop: x.stop,
          rects: [x.rect],
          msg: `${small.length} of ${bodies.length} paragraphs of running text are set under 16px (${[...new Set(small.map(y => y.fs))].sort((a, b) => a - b).join(", ")}px)`,
        });
      }
    }

    // held sections: stepped through from start to end (--quick: only told), each told once with its own picture
    for (const H of held.slice(0, 8)) {
      let r = null;
      if (!quick) r = await safe("hold", () => tab.eval(`window.__cc.holdPass(${H.i})`, 600000));
      else {
        await tab.eval(`window.__cc.scrollTo(${Math.round((H.y0 + H.y1) / 2)})`);
        await sleep(800);
      }
      const rect = r ? r.rect : await tab.eval(`window.__cc.rectOf(${H.id})`);
      shots.push(await tab.shot());
      const at = shots.length - 1;
      const span = `held on screen for ${H.screens} screen${H.screens === 1 ? "" : "s"} of scroll (${H.how})`;
      if (r && r.parts) {
        F.push({
          check: "scroll-linked",
          sev: "FAIL",
          id: H.id,
          sel: H.sel,
          text: H.text,
          stop: at,
          rects: [...r.outer.map(o => o.rect), Object.assign({}, rect, { ref: true })],
          msg: `${span}, and ${r.parts} part${r.parts > 1 ? "s" : ""} inside change as the page scrolls through it (${r.kinds.join(", ")})${r.backs ? "" : ", each once"}: ${r.outer
            .map(o => o.sel.split(" > ").pop())
            .slice(0, 4)
            .join(", ")}${r.outer.length > 4 ? ", ..." : ""}`,
        });
      } else
        F.push({
          check: "pinned",
          sev: H.wide ? "FAIL" : "WARN",
          id: H.id,
          sel: H.sel,
          text: H.text,
          stop: at,
          rects: rect ? [rect] : [],
          msg: `${span} while the page moves on${H.wide ? "" : " (a narrow sticky column)"}`,
        });
    }
    // CSS scroll timelines not found by stepping (with --quick, all of them)
    for (const t of (await safe("timelines", () => tab.eval("window.__cc.scrollTimelines()"))) || []) {
      F.push(
        Object.assign(
          {
            check: "scroll-linked",
            sev: t.big || t.stage ? "FAIL" : "WARN",
            id: t.id,
            sel: t.sel,
            text: t.text,
            msg: `moves with the scroll on a CSS scroll timeline (animation-timeline: ${t.kind})`,
          },
          place(t.doc),
        ),
      );
    }
    // what animated in when it was first scrolled to
    const revealed = [];
    if (!quick)
      for (const r of (await safe("reveal", () => tab.eval("window.__cc.revealList()"))) || []) {
        const p = place(r.docs[0]);
        revealed.push(r.id);
        if (p.stop != null)
          for (const d of r.docs.slice(1)) {
            const top = d.top - stopY[p.stop];
            if (top < vh && top + d.height > 0) p.rects.push({ left: d.left, top, width: d.width, height: d.height });
          }
        F.push(
          Object.assign(
            {
              check: "scroll-reveal",
              sev: "FAIL",
              id: r.id,
              sel: r.sel,
              text: r.text,
              msg: `${r.n > 1 ? `${r.n} parts of this section animate` : "animates"} in when scrolled into view (${r.how})${r.n > 1 ? `: ${r.sels.join(", ")}${r.n > 5 ? ", ..." : ""}` : ""}`,
            },
            p,
          ),
        );
      }
    // what an IntersectionObserver set moving as it came on screen (seen in the walk, so also with --quick)
    for (const r of (await safe("io-reveal", () => tab.eval(`window.__cc.ioReveals(${JSON.stringify(revealed)})`)))
      || [])
      F.push(
        Object.assign(
          { check: "scroll-reveal", sev: "FAIL", id: r.id, sel: r.sel, text: r.text, msg: r.msg },
          place(r.doc),
        ),
      );
    // feature sections without a visual
    TM("seams+lint+held");
    const NV = (await safe("no-visual", () => tab.eval(`window.__cc.noVisual(${JSON.stringify(TYPE)})`, 300000))) || {
      nv: [],
      holes: [],
    };
    // text-only: a FAIL for a quote or the closing call, or when two or more sections are only text (the readers counted
    // every one of them; a lone FAQ or price list stays a WARN)
    const nText = NV.nv.filter(v => v.textOnly).length;
    for (const v of NV.nv) {
      if (v.textOnly) {
        const sev = nText >= 2 || v.quote || v.close ? "FAIL" : "WARN";
        F.push(
          Object.assign(
            {
              check: "text-only",
              sev,
              id: v.id,
              sel: v.sel,
              text: v.text,
              msg: `the ${
                v.quote ? "quote section"
                : v.close ? "closing section"
                : "section"
              } is only text: no picture, icon, mock or effect in it${nText >= 2 ? ` (${nText} sections like it at this width)` : ""}`,
            },
            place(v.doc),
          ),
        );
        continue;
      }
      // under 15% is no visual; 15-25% is a small one
      F.push(
        Object.assign(
          {
            check: "no-visual",
            sev: v.slot || v.cover < 15 ? "FAIL" : "WARN",
            id: v.id,
            sel: v.sel,
            text: v.text,
            msg:
              v.slot ?
                `its visual is still a placeholder (${v.slot}), so pictures, effects and mocks cover ${v.cover}% of this section; fill the slot`
              : v.cover ?
                `pictures, effects and mocks cover ${v.cover}% of this section; a feature section needs a visual (about 25% or more)`
              : "no picture, effect or mock in this section; a feature section needs a visual",
          },
          place(v.doc),
        ),
      );
    }
    for (const v of NV.holes)
      F.push(
        Object.assign({ check: "hole", sev: v.sev, id: v.id, sel: v.sel, text: v.text, msg: v.msg }, place(v.doc)),
      );
    // what was read from the page as a whole, put on the screen that shows it
    for (const { doc, more, ...x } of later) {
      const p = doc ? place(doc) : { stop: null, rects: [] };
      if (more && p.stop != null)
        for (const d of more) {
          const t = d.top - stopY[p.stop];
          if (t < vh && t + d.height > 0) p.rects.push({ left: d.left, top: t, width: d.width, height: d.height });
        }
      F.push(Object.assign(x, p));
    }
    // photo-set: the page's photographs graded alike (lightness and saturation within 0.35 and 0.3, warm or cool)
    if (grades.length >= 2) {
      const sp = k => Math.max(...grades.map(g => g[k])) - Math.min(...grades.map(g => g[k]));
      const why = [];
      if (sp("l") > 0.35)
        why.push(
          `lightness from ${Math.min(...grades.map(g => g.l)).toFixed(2)} to ${Math.max(...grades.map(g => g.l)).toFixed(2)}`,
        );
      if (sp("s") > 0.3)
        why.push(
          `saturation from ${Math.min(...grades.map(g => g.s)).toFixed(2)} to ${Math.max(...grades.map(g => g.s)).toFixed(2)}`,
        );
      if (Math.max(...grades.map(g => g.b)) >= 5 && Math.min(...grades.map(g => g.b)) <= -5)
        why.push(
          `warm and cool photographs mixed (b* ${Math.min(...grades.map(g => g.b)).toFixed(0)} to +${Math.max(...grades.map(g => g.b)).toFixed(0)})`,
        );
      if (why.length) {
        const mid = {
          l: median(grades.map(g => g.l)),
          s: median(grades.map(g => g.s)),
          b: median(grades.map(g => g.b)),
        };
        const odd = [...grades].sort(
          (a, b) =>
            Math.abs(b.l - mid.l) / 0.35
            + Math.abs(b.s - mid.s) / 0.3
            + Math.abs(b.b - mid.b) / 20
            - (Math.abs(a.l - mid.l) / 0.35 + Math.abs(a.s - mid.s) / 0.3 + Math.abs(a.b - mid.b) / 20),
        )[0];
        F.push({
          check: "photo-set",
          sev: "WARN",
          id: odd.id,
          sel: odd.sel,
          text: odd.name,
          stop: odd.stop,
          rects: [odd.rect],
          msg: `${grades.length} photographs in more than one look: ${why.join("; ")}; the odd one out is ${odd.name}`,
        });
      }
    }
    // photo-credit: library photographs, for the judge to confirm they show this client
    if (credits.size) {
      const c = [...credits.values()];
      const c0 = c.find(x => x.id) || c[0];
      F.push({
        check: "photo-credit",
        sev: "WARN",
        id: c0.id,
        sel: c0.sel,
        text: "",
        stop: c0.stop ?? null,
        rects: [],
        msg: `${c.length} library source${c.length > 1 ? "s" : ""} (${[...new Set(c.map(x => x.host.toLowerCase()))].join(", ")}): ${c
          .slice(0, 5)
          .map(x => x.name)
          .join(", ")}${c.length > 5 ? ", ..." : ""}; confirm each shows the client's own product, place or people`,
      });
    }
    // what the page asked for and did not get
    if (first) {
      const base = url.slice(0, url.lastIndexOf("/") + 1),
        told = new Set();
      const KIND = {
        Stylesheet: "stylesheet",
        Script: "script",
        Image: "image",
        Media: "video or audio",
        Document: "frame",
        Font: "font",
        XHR: "data file",
        Fetch: "data file",
      };
      for (const q of tab.failed) {
        if (told.has(q.url) || /\/favicon\.ico(\?|$)/i.test(q.url)) continue;
        const kind = KIND[q.type];
        if (!kind) continue;
        told.add(q.url);
        // a connection that dropped on a third-party host (the Google Fonts link) is the network, not the page: WARN, and run again
        const blip =
          !q.url.startsWith(base)
          && /^ERR_(SOCKET_NOT_CONNECTED|CONNECTION_(RESET|CLOSED|TIMED_OUT|REFUSED)|NETWORK_CHANGED|TIMED_OUT|INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|EMPTY_RESPONSE|HTTP2_PROTOCOL_ERROR)/.test(
            q.why,
          );
        // a product-render spec with no <poster>.stills.json beside it: its frame renders itself live; the stills are made once
        if (/\.stills\.json(?:[?#]|$)/i.test(q.url)) {
          F.push({
            check: "assets",
            sev: "WARN",
            id: 0,
            sel: "(the page)",
            text: q.url.split(/[?#]/)[0].split("/").pop(),
            stop: null,
            rects: [],
            msg: "no stills made for this product yet: run assets/objects/product-render/make-posters.mjs on the spec (each frame renders itself in the browser until then)",
            fix: "run assets/objects/product-render/make-posters.mjs on the spec to make its stills",
          });
          continue;
        }
        F.push({
          check: "assets",
          sev: /font|data/.test(kind) || blip ? "WARN" : "FAIL",
          id: 0,
          sel: "(the page)",
          text: "",
          stop: null,
          rects: [],
          msg: `the ${kind} ${q.url.startsWith(base) ? q.url.slice(base.length) : q.url} did not load (${q.why})${
            blip ? ": the connection dropped, a network blip and not the page; run the check again"
            : kind === "stylesheet" ? ": everything here was measured without it"
            : ""
          }`,
        });
      }
    }

    // the page margin (a left edge blocks share across sections) and each section's own common left edges; what sits a
    // few px off one of them. Blocks in a scroll-animated or held section are caught mid-way: they make no edge.
    const gm =
      grid.length ?
        (await safe("grid", () =>
          tab.eval(`window.__cc.${quick ? "insideScene" : "insideMoving"}(${JSON.stringify(grid.map(c => c.id))})`),
        )) || []
      : [];
    const still = grid.filter((c, i) => !gm[i]);
    const sup = (list, x) => list.filter(c => Math.abs(c.left - x) <= 1.5);
    const edgesOf = (list, minSecs) => {
      const out = [];
      for (const v of [...new Set(list.map(c => Math.round(c.left)))]) {
        const s1 = sup(list, v);
        if (s1.length >= 3 && new Set(s1.map(c => c.sec)).size >= minSecs) out.push({ x: v, n: s1.length });
      }
      out.sort((a, b) => b.n - a.n);
      const E = [];
      for (const e of out) if (!E.some(x => Math.abs(x.x - e.x) <= 2)) E.push(e);
      return E;
    };
    const margin = edgesOf(still, 2).filter(e => e.x < vw / 3)[0] || null;
    const secEdges = new Map();
    for (const sec of new Set(still.map(c => c.sec))) {
      const mine = still.filter(c => c.sec === sec);
      // an edge a few px off the page margin is not an edge to line up with: what sits on it is off the margin
      const E = edgesOf(mine, 1)
        .filter(e => !margin || Math.abs(e.x - margin.x) <= 1.5 || Math.abs(e.x - margin.x) > 24)
        .map(e => Object.assign(e, { sec }));
      secEdges.set(sec, E);
      const S2 = [...E].sort((a, b) => a.x - b.x);
      for (let i = 1; i < S2.length; i++) {
        const g = S2[i].x - S2[i - 1].x;
        if (g < 3 || g > 24) continue;
        const weak = S2[i].n < S2[i - 1].n ? S2[i] : S2[i - 1],
          strong = weak === S2[i] ? S2[i - 1] : S2[i],
          ex = sup(mine, weak.x)[0];
        F.push({
          check: "off-grid",
          sev: "WARN",
          id: ex.id,
          sel: ex.sel,
          text: ex.text,
          stop: ex.stop,
          rects: [ex.rect],
          msg: `two common left edges of one section ${g}px apart: ${weak.x}px (${weak.n} elements, like this one) and ${strong.x}px (${strong.n})`,
        });
      }
    }
    const og = [];
    for (const c of grid) {
      const refs = [...(margin ? [Object.assign({ page: true }, margin)] : []), ...(secEdges.get(c.sec) || [])];
      if (refs.some(e => Math.abs(e.x - c.left) <= 1.5)) continue;
      let best = null;
      for (const e of refs) {
        const d = Math.abs(e.x - c.left);
        if (!best || d < best.d) best = { e, d };
      }
      if (!best || best.d < 2 || best.d > 24) continue;
      if (c.kind === "text" && c.fs >= 36 && best.d <= 0.1 * c.fs) continue; // optical alignment of display type
      // the nearest element on that edge, on the same screen, is outlined in dashed blue beside it
      const onE = sup(best.e.page ? still : still.filter(o => o.sec === c.sec), best.e.x).filter(o => o.id !== c.id);
      const on = onE
        .filter(o => o.stop === c.stop)
        .sort((a, b) => Math.abs(a.rect.top - c.rect.top) - Math.abs(b.rect.top - c.rect.top))[0];
      // a near miss is seen when the edge it misses is on the same screen or the next; screens apart it only warns
      const nearby = !!on || onE.some(o => Math.abs(o.stop - c.stop) <= 1);
      og.push({
        sec: c.sec,
        f: {
          check: "off-grid",
          sev: best.d >= 4 && nearby ? "FAIL" : "WARN",
          id: c.id,
          sel: c.sel,
          text: c.text,
          stop: c.stop,
          rects: [c.rect, ...(on ? [Object.assign({}, on.rect, { ref: true })] : [])],
          msg: `left edge at ${c.left}px, ${Math.round(best.d * 2) / 2}px off ${best.e.page ? "the page margin" : "a common edge of its section"} at ${best.e.x}px (${best.e.n} elements${
            on ? `, like ${on.sel.split(" > ").pop()}`
            : nearby ? ""
            : ", none of them near it"
          })`,
        },
        left: c.left,
      });
    }
    // one block set off the grid moves everything in it: told once per section and severity, the rest listed with it
    const ogGroups = new Map();
    for (const o of og) {
      const key = `${o.sec}|${o.f.sev}`;
      if (!ogGroups.has(key)) ogGroups.set(key, []);
      ogGroups.get(key).push(o);
    }
    for (const g of ogGroups.values()) {
      const main = g[0].f;
      if (g.length > 1 && g[0].sec >= 0) {
        main.msg += `; ${g.length - 1} more in this section off the grid too (${g
          .slice(1, 5)
          .map(o => `${o.f.sel.split(" > ").pop()} at ${o.left}px`)
          .join(", ")}${g.length > 5 ? ", ..." : ""})`;
        main.rects = [
          ...main.rects,
          ...g
            .slice(1, 6)
            .filter(o => o.f.stop === main.stop)
            .map(o => o.f.rects[0]),
        ];
        F.push(main);
      } else for (const o of g) F.push(o.f);
    }
    // a section whose left-aligned heading starts far off the page margin, where no other section starts (a narrow
    // column centred on the page with its words on the left, a block pushed in): its start is off the grid
    if (EX && margin) {
      for (const st of EX.starts) {
        if (st.beside || Math.abs(st.left - margin.x) <= 24) continue;
        if (EX.starts.some(o => o !== st && Math.abs(o.left - st.left) <= 2)) continue; // an edge the page uses again
        F.push(
          Object.assign(
            {
              check: "off-grid",
              sev: "WARN",
              id: st.id,
              sel: st.sel,
              text: st.text,
              msg: `the section's heading starts at ${st.left}px${st.centredBlock ? ", in a block centred on the page with its words on the left" : ""}, ${Math.abs(st.left - margin.x)}px off the page margin (${margin.x}px), and no other section starts there`,
            },
            place(st.doc),
          ),
        );
      }
    }
    // right-edge: in a section, a box 200px or wider that stops 8-60px short of the content's right edge while another
    // box of the section reaches it
    const rights = still
      .filter(c => c.kind !== "text" && c.right != null && c.rect.width >= 120)
      .map(c => Object.assign({}, c, { left: c.right }));
    const rightM = edgesOf(rights, 2).filter(e => e.x > (vw * 2) / 3 && e.x <= vw - 2)[0] || null;
    if (rightM) {
      const cr0 = rightM.x,
        told2 = new Set();
      for (const c of still) {
        if (c.kind === "text" || c.right == null || c.rect.width < 120 || told2.has(c.id)) continue;
        const d = c.right - cr0;
        if (d < 2 || d > 24) continue;
        told2.add(c.id);
        F.push({
          check: "right-edge",
          sev: "FAIL",
          id: c.id,
          sel: c.sel,
          text: c.text,
          stop: c.stop,
          rects: [c.rect],
          msg: `its right edge runs ${Math.round(d)}px past the content's right edge (${cr0}px, where ${rightM.n} boxes end)`,
        });
      }
      for (const sec of new Set(still.map(c => c.sec))) {
        const boxes = still.filter(c => c.sec === sec && c.kind !== "text" && c.right != null && c.rect.width >= 200);
        const on = boxes.find(c => Math.abs(c.right - cr0) <= 1.5);
        if (!on) continue;
        for (const c of boxes) {
          const d = cr0 - c.right;
          if (d < 8 || d > 60 || told2.has(c.id)) continue;
          told2.add(c.id);
          F.push({
            check: "right-edge",
            sev: "WARN",
            id: c.id,
            sel: c.sel,
            text: c.text,
            stop: c.stop,
            rects: [c.rect, ...(on.stop === c.stop ? [Object.assign({}, on.rect, { ref: true })] : [])],
            msg: `its right edge stops ${Math.round(d)}px short of the content's right edge (${cr0}px), which ${on.sel.split(" > ").pop()} reaches`,
          });
        }
      }
    }

    // centre-axis (the column): where the content column is off the screen's middle (a side rail, an uneven split), a
    // block centred on the screen sits off the axis of the column around it. Told once per section, the rest listed
    if (margin && rightM && rightM.x - margin.x >= vw * 0.5) {
      const colC = (margin.x + rightM.x) / 2,
        sc = vw / 2,
        off = Math.abs(colC - sc);
      if (off >= 24) {
        const edges = edgesOf(still, 1).map(e => e.x);
        const onEdge = x => edges.some(e => Math.abs(e - x) <= 1.5);
        const onCol = s =>
          still.some(
            o =>
              Math.abs(o.stop - s) <= 1
              && (Math.abs(o.left - margin.x) <= 1.5 || (o.right != null && Math.abs(o.right - rightM.x) <= 1.5)),
          );
        const boxes = grid
          .filter(
            c =>
              c.kind !== "text"
              && c.kind !== "table"
              && c.right != null
              && c.rect.width >= 160
              && c.rect.width < vw - 16
              && !onEdge(c.left),
          )
          .map(c => Object.assign({}, c, { cx: (c.left + c.right) / 2 }));
        const hits = new Map(),
          told3 = new Set();
        for (const c of [...centred, ...boxes]) {
          if (told3.has(c.id) || Math.abs(c.cx - sc) > 4 || !onCol(c.stop)) continue;
          // a block inside one already told (the footer's heading inside the footer's centred column) is the same fault
          told3.add(c.id);
          const hk = c.sec >= 0 ? "s" + c.sec : "t" + c.stop;
          if (!hits.has(hk)) hits.set(hk, []);
          hits.get(hk).push(c);
        }
        for (const list of hits.values()) {
          const c = list.sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height)[0],
            rest = list.filter(x => x !== c);
          F.push({
            check: "centre-axis",
            sev: "FAIL",
            id: c.id,
            sel: c.sel,
            text: c.text,
            stop: c.stop,
            rects: [
              c.rect,
              ...rest
                .filter(x => x.stop === c.stop)
                .slice(0, 5)
                .map(x => x.rect),
            ],
            msg: `centred on the screen (${Math.round(c.cx)}px), but the content column around it runs ${margin.x}-${rightM.x}px, whose middle is ${Math.round(colC)}px: ${Math.round(off)}px off the column's axis${
              rest.length ?
                ` (and ${rest.length} more in this section: ${rest
                  .slice(0, 3)
                  .map(x => (x.text ? `"${x.text.slice(0, 20)}"` : x.sel.split(" > ").pop()))
                  .join(", ")})`
              : ""
            }`,
          });
        }
      }
    }

    // the nav: its bar against the content, actions outside it, links that wrap
    const cl = margin ? margin.x : null,
      cr =
        margin ?
          rightM && Math.abs(rightM.x - (vw - margin.x)) > 24 ?
            rightM.x
          : vw - margin.x
        : null;
    for (const n of navs) {
      for (const o of n.outside)
        F.push({
          check: "nav",
          sev: "FAIL",
          id: o.id,
          sel: o.sel,
          text: o.text,
          stop: n.stop,
          rects: [o.rect, Object.assign({}, n.bar.rect, { ref: true })],
          msg: `"${o.text}" sits outside the nav bar ${n.bar.sel} (${n.bar.rect.left}-${n.bar.rect.left + n.bar.rect.width}px)`,
        });
      if (n.bar && cl != null && (n.bar.rect.left > cl + 8 || n.bar.rect.left + n.bar.rect.width < cr - 8)) {
        // a bar more than 24px inside either content edge is a FAIL on its own (the house marks it so)
        const gapL = n.bar.rect.left - cl,
          gapR = cr - (n.bar.rect.left + n.bar.rect.width);
        F.push({
          check: "nav",
          sev: n.outside.length || Math.max(gapL, gapR) > 24 ? "FAIL" : "WARN",
          id: n.id,
          sel: n.bar.sel,
          text: "",
          stop: n.stop,
          rects: [n.bar.rect, ...n.outside.map(o => o.rect)],
          msg: `the nav bar spans ${n.bar.rect.left}-${n.bar.rect.left + n.bar.rect.width}px but the content spans ${cl}-${cr}px${n.outside.length ? ", and its actions sit outside it" : ""}`,
        });
      }
      // no bar at all: the brand and the actions float as separate pieces past the content's edges (corner tabs)
      if (!n.bar && cl != null && n.items && n.items.length >= 2) {
        const L0 = Math.min(...n.items.map(o => o.rect.left)),
          R0 = Math.max(...n.items.map(o => o.rect.left + o.rect.width));
        if (L0 < cl - 8 || R0 > cr + 8)
          F.push({
            check: "nav",
            sev: "FAIL",
            id: n.id,
            sel: n.sel,
            text: "",
            stop: n.stop,
            rects: n.items.map(o => o.rect),
            msg: `the nav has no bar, and its pieces sit past the content's edges (${L0}-${R0}px against ${cl}-${cr}px)`,
          });
      }
      for (const w of n.wraps)
        F.push({
          check: "nav",
          sev: "FAIL",
          id: w.id,
          sel: w.sel,
          text: w.text,
          stop: n.stop,
          rects: [w.rect],
          msg: "nav link wraps to a second line",
        });
      if (n.rowsWrap)
        F.push({
          check: "nav",
          sev: "FAIL",
          id: n.id,
          sel: n.rowsWrap.sel,
          text: "",
          stop: n.stop,
          rects: [n.rowsWrap.rect],
          msg: `nav links wrap onto ${n.rowsWrap.rows} rows`,
        });
    }
    // a lopsided nav: one end flush with the content's edge, the other a few px inside it
    {
      const n0 = navs.find(n => n.stop === 0);
      if (n0 && n0.items && n0.items.length >= 2 && cl != null) {
        const L0 = Math.min(...n0.items.map(o => o.rect.left)),
          R0 = Math.max(...n0.items.map(o => o.rect.left + o.rect.width));
        const dl = L0 - cl,
          dr = cr - R0,
          lone = (a, b) => Math.abs(a) <= 2 && Math.abs(b) > 3 && Math.abs(b) <= 24;
        if (lone(dl, dr) || lone(dr, dl)) {
          const inL = Math.abs(dl) > Math.abs(dr);
          const o =
            inL ? n0.items.find(x => x.rect.left === L0) : n0.items.find(x => x.rect.left + x.rect.width === R0);
          F.push({
            check: "nav",
            sev: "WARN",
            id: o.id,
            sel: o.sel,
            text: o.text,
            stop: 0,
            rects: n0.items.map(x => x.rect),
            msg: `the nav is lopsided: its ${inL ? "first item starts" : "last item ends"} ${Math.round(Math.abs(inL ? dl : dr))}px ${(inL ? dl : dr) > 0 ? "inside" : "outside"} the content's edge (${inL ? cl : cr}px), while its ${inL ? "last ends" : "first starts"} on the other edge`,
            fix: "start the nav's first item and end its last on the content's two edges",
          });
        }
      }
    }
    if (!navs.some(n => n.stop === 0) && secCount >= 3)
      F.push({
        check: "nav",
        sev: "FAIL",
        id: 0,
        sel: "(the first screen)",
        text: "",
        stop: 0,
        rects: [],
        msg: "no nav bar across the top of the first screen (a header with the brand, the section links and the main action)",
      });
    // nav-family: one type family and size in the nav's links; one form on every screen
    {
      const sig0 = navSigs.find(Boolean);
      if (sig0 && sig0.fonts.length > 1)
        F.push({
          check: "nav-family",
          sev: "WARN",
          id: sig0.id,
          sel: sig0.sel,
          text: "",
          stop: sig0.stop,
          rects: [sig0.rect],
          msg: `the nav's links and actions use ${sig0.fonts.length} type families (${sig0.fonts.join(", ")})`,
        });
      if (sig0 && sig0.sizes.length > 1 && Math.max(...sig0.sizes) - Math.min(...sig0.sizes) > 1)
        F.push({
          check: "nav-family",
          sev: "WARN",
          id: sig0.id,
          sel: sig0.sel,
          text: "",
          stop: sig0.stop,
          rects: [sig0.rect],
          msg: `the nav's links come in ${sig0.sizes.length} sizes (${sig0.sizes.join(", ")}px)`,
        });
      const seenSigs = navSigs.filter(Boolean);
      for (let i = 1; i < seenSigs.length; i++) {
        const a = seenSigs[i - 1],
          b = seenSigs[i],
          ch = [];
        if (a.sel !== b.sel) ch.push(`${a.sel.split(" > ").pop()} gives way to ${b.sel.split(" > ").pop()}`);
        else {
          if (Math.abs(a.left - b.left) > 40 || Math.abs(a.width - b.width) > 40)
            ch.push(`its bar moves from ${a.left}-${a.left + a.width}px to ${b.left}-${b.left + b.width}px`);
          if ((a.fill || "") !== (b.fill || "") && !(a.fill && b.fill && near(a.fill, b.fill)))
            ch.push(`its fill changes from ${a.fill || "none"} to ${b.fill || "none"}`);
          if (a.toggle !== b.toggle || Math.abs(a.links - b.links) >= 2)
            ch.push(
              `its links change from ${a.links}${a.toggle ? " and a Menu button" : ""} to ${b.links}${b.toggle ? " and a Menu button" : ""}`,
            );
        }
        if (ch.length) {
          F.push({
            check: "nav-family",
            sev: "WARN",
            id: b.id,
            sel: b.sel,
            text: "",
            stop: b.stop,
            rects: [b.rect],
            msg: `the nav changes form as the page scrolls: ${ch.join("; ")}`,
          });
          break;
        }
      }
      // nav-current: a bar that stays on screen with 3+ links to the page's sections, none ever marked for the section on
      // screen (no link changes its look, aria-current or class against the others, and no mark in the bar moves)
      const kept = seenSigs.filter(
        x => x.stop >= 1 && x.fixedBar && x.cur && x.cur.length >= 3 && (x.secs == null || x.secs >= 3),
      );
      if (kept.length >= 3 && seenSigs[0] && seenSigs[0].cur) {
        const s0 = seenSigs[0].cur,
          looks = cur => new Set(cur.map(c => c.s)).size;
        const marked =
          seenSigs.some(s => (s.cur || []).some(c => c.on))
          || seenSigs.some(s => s.cur && looks(s.cur) > looks(s0))
          || seenSigs.some(
            s =>
              s.cur
              && s.cur.length === s0.length
              && s.cur.some((c, j) => c.s !== s0[j].s)
              && !s.cur.every((c, j) => c.s !== s0[j].s),
          )
          || new Set(kept.map(s => s.marks)).size > 1;
        if (!marked) {
          const b = kept[0];
          F.push({
            check: "nav-current",
            sev: "WARN",
            id: b.id,
            sel: b.sel,
            text: "",
            stop: b.stop,
            rects: [b.rect],
            msg: `the nav stays on screen with ${b.cur.length} links to the page's sections, but never marks the one you are in (no link changes as the page scrolls)`,
          });
        }
      }
    }

    // gaps between top-level sections; one never seen whole at a stop is measured with its seam in mid-screen
    for (const p of pairs.values()) {
      if (p.on) continue;
      const q = await safe("seam", () => tab.eval(`window.__cc.seam(${p.i})`, 60000));
      if (q && q.on) {
        shots.push(await tab.shot());
        Object.assign(p, { gap: q.gap, top: q.top, bottom: q.bottom, band: q.band, on: true, stop: shots.length - 1 });
      }
    }
    const heldSecs = new Set(held.map(H => H.sec));
    // a dealt statement moment's own section (one large statement in its screen, sections.md) has the air of its design on
    // both sides: its gaps are left out, as empty-area and T-fill read the moment's host as filled
    // (the moments that fit a statement: assets/moments/index.json "fits")
    const stmtIds = (() => {
      try {
        return readCatalogue(TASTE)
          .filter(m => (m.fits || []).includes("statement"))
          .map(m => m.id);
      } catch {
        return [];
      }
    })();
    const stmt = new Set(
      (await safe("stmt", () => tab.eval(`window.__cc.stmtSecs(${JSON.stringify(stmtIds)})`))) || [],
    );
    const P = [...pairs.values()]
      .filter(p => !stmt.has(p.i) && !stmt.has(p.i + 1))
      .sort((a, b) => a.i - b.i)
      .map(p => Object.assign(p, { est: !p.on, stop: p.on ? p.stop : null }));
    const gaps = P.filter(p => p.gap >= 0);
    for (const p of P) {
      if (p.gap < 0) {
        F.push({
          check: "section-gaps",
          sev: "WARN",
          id: 0,
          sel: `${p.a} / ${p.b}`,
          text: "",
          stop: p.stop,
          rects: p.stop == null ? [] : [{ left: 0, top: p.bottom, width: vw, height: p.top - p.bottom }],
          msg: `the sections overlap by ${-p.gap}px${heldSecs.has(p.i) || heldSecs.has(p.i + 1) ? " (one is held on screen while the other slides over it)" : ""}`,
        });
        continue;
      }
      const kind = gaps.filter(q => q.band === p.band);
      const pool = kind.length >= 3 ? kind : gaps;
      if (pool.length < 2) continue;
      const med = median(pool.map(q => q.gap));
      if (med <= 0) continue;
      const dev = (p.gap - med) / med;
      if (Math.abs(dev) > 0.25)
        F.push({
          check: "section-gaps",
          sev: Math.abs(dev) > 0.6 ? "FAIL" : "WARN",
          id: 0,
          sel: `${p.a} / ${p.b}`,
          text: "",
          stop: p.stop,
          rects: p.stop == null ? [] : [{ left: 0, top: p.top, width: vw, height: Math.max(2, p.gap) }],
          msg: `${p.gap}px between these sections${p.est ? " (never on one screen)" : ""}, ${dev > 0 ? "+" : ""}${Math.round(dev * 100)}% against the median ${Math.round(med)}px${p.band ? " of gaps at a change of ground" : ""}`,
        });
    }

    // a band (a section on its own ground) padded unevenly: the space outside its edge far from the space inside it
    for (const p of P.filter(q => q.on && q.outer != null && q.inner != null && q.outer >= 0 && q.inner >= 0).slice(
      0,
      6,
    )) {
      const lo = Math.min(p.outer, p.inner),
        hi = Math.max(p.outer, p.inner);
      if (hi - lo >= 24 && lo / hi < 0.65)
        F.push({
          check: "section-gaps",
          sev: "WARN",
          id: 0,
          sel: `${p.a} / ${p.b}`,
          text: "",
          stop: p.stop,
          rects: p.stop == null ? [] : [{ left: 0, top: p.top, width: vw, height: Math.max(2, p.gap) }],
          msg: `uneven space at the edge of a band: ${p.outer}px outside its edge, ${p.inner}px inside it (the space on either side of a change of ground reads as one gap only when the two match)`,
        });
    }
    // buttons: more than two looks on one screen, told once per look that breaks the pair (the page's own pair first)
    const all = [...buttons.values()];
    const fam = clusterLooks(all);
    const freq = x => (fam.find(s1 => sameLook(s1, x)) || { items: [] }).items.length;
    const realIn = x => (x.items.some(i => !i.mock) ? 1 : 0);
    const ex = x => x.items.find(i => !i.mock) || x.items[0];
    const toldLook = new Set();
    for (const sc of screenLooks) {
      const ranked = [...sc.looks].sort((a, b) => realIn(b) - realIn(a) || freq(b) - freq(a));
      const odd = ranked.slice(2),
        keys = odd.map(lookName);
      if (keys.every(x => toldLook.has(x))) continue;
      keys.forEach(x => toldLook.add(x));
      F.push({
        check: "button-styles",
        sev: "FAIL",
        sel: "(one screen)",
        text: "",
        id: 0,
        stop: sc.k,
        msg:
          `${sc.looks.length} button styles on one screen: `
          + ranked.map(x => `${lookName(x)} ("${ex(x).text}"${ex(x).mock ? ", in a mock" : ""})`).join("; ")
          + `; the odd one${odd.length > 1 ? "s" : ""} out: ${odd.map(x => `"${ex(x).text}"`).join(", ")}`,
        rects: [
          ...odd.flatMap(x => x.items.map(i => i.rect)),
          ...ranked.slice(0, 2).flatMap(x => x.items.map(i => Object.assign({}, i.rect, { ref: true }))),
        ],
      });
    }
    const real = clusterLooks(all.filter(b => b.real));
    if (real.length > 2) {
      const rare = [...real].sort((a, b) => a.items.length - b.items.length)[0].items[0];
      F.push({
        check: "button-styles",
        sev: "FAIL",
        id: rare.id,
        sel: "(the page)",
        text: "",
        stop: rare.stop,
        rects: [rare.rect],
        msg:
          `${real.length} button styles on the page: `
          + real.map(x => `${lookName(x)} x${x.items.length} ("${x.items[0].text}")`).join("; "),
      });
    }
    // the selected tab (or its sliding indicator, read at rest) drawn as a filled button in a colour no button uses
    if (EX && EX.tabs.length) {
      const fills = [...new Set(all.filter(b => b.real && !b.mock && b.fill).map(b => b.fill))];
      const t = EX.tabs.find(x => fills.length >= 1 && !fills.some(f => near(f, x.fill)));
      if (t)
        F.push(
          Object.assign(
            {
              check: "button-styles",
              sev: "WARN",
              id: t.id,
              sel: t.sel,
              text: t.text,
              msg: `the selected tab "${t.text.slice(0, 24)}" is drawn as a filled ${t.shape} in ${t.fill}${t.via ? ` (${t.via})` : ""}, a fill none of the page's buttons use (${fills.slice(0, 3).join(", ")}): it reads as one more button style`,
              fix: "draw the selected tab as a line under its word, or in the primary button's fill",
            },
            place(t.doc),
          ),
        );
    }
    for (const st of clusterLooks(all.filter(b => b.slant))) {
      const e1 = st.items[0];
      F.push({
        check: "button-shape",
        sev: "FAIL",
        id: e1.id,
        sel: e1.sel,
        text: e1.text,
        stop: e1.stop,
        rects: [e1.rect],
        msg: `${st.slant} button${st.items.length > 1 ? ` (${st.items.length} like it: ${[...new Set(st.items.map(i => `"${i.text}"`))].slice(0, 4).join(", ")})` : ""}`,
      });
    }
    // one look at one height and one label size: a 44px and a 62px pill of one colour are two styles (the nav keeps its
    // own, smaller size); two buttons side by side share their height
    // the close at its one large size (Figma's full-width "Get started" under the last line, system.css .btn--xl):
    // one button the width of the column and taller than the rest is a size the page keeps for its close, not a
    // second style; two or more of them are judged like any other
    const xlOf = b => b.rect && b.rect.width >= Math.min(320, 0.4 * vw) && b.h >= 56;
    const xls = all.filter(b => b.real && !b.mock && !b.nav && xlOf(b)),
      xlIds = new Set(xls.length === 1 || new Set(xls.map(b => norm(b.text))).size === 1 ? xls.map(b => b.id) : []);
    const page = all.filter(b => b.real && !b.mock && !b.nav && !xlIds.has(b.id));
    for (const st of clusterLooks(page)) {
      const hs = [...new Set(st.items.map(i => i.h))].sort((a, b) => a - b),
        fs = [...new Set(st.items.map(i => Math.round(i.fs)))].sort((a, b) => a - b);
      const lo = st.items.find(i => i.h === hs[0]),
        hi = st.items.find(i => i.h === hs[hs.length - 1]);
      if (hs[hs.length - 1] / hs[0] > 1.15)
        F.push({
          check: "button-styles",
          sev: "FAIL",
          id: hi.id,
          sel: hi.sel,
          text: hi.text,
          stop: hi.stop,
          rects: [hi.rect, ...(lo.stop === hi.stop ? [Object.assign({}, lo.rect, { ref: true })] : [])],
          msg: `one button style (${lookName(st)}) in ${hs.length} heights: ${hs.join(", ")}px ("${hi.text}" ${hi.h}px, "${lo.text}" ${lo.h}px)`,
        });
      else if (fs[fs.length - 1] / fs[0] > 1.2) {
        const a = st.items.find(i => Math.round(i.fs) === fs[fs.length - 1]),
          b = st.items.find(i => Math.round(i.fs) === fs[0]);
        F.push({
          check: "button-styles",
          sev: "FAIL",
          id: a.id,
          sel: a.sel,
          text: a.text,
          stop: a.stop,
          rects: [a.rect],
          msg: `one button style (${lookName(st)}) with labels in ${fs.length} sizes: ${fs.join(", ")}px ("${a.text}", "${b.text}")`,
        });
      }
    }
    {
      let toldPair = 0;
      for (const a of page)
        for (const b of page) {
          if (toldPair >= 2 || a.id >= b.id || a.stop !== b.stop) continue;
          const ov =
            Math.min(a.rect.top + a.rect.height, b.rect.top + b.rect.height) - Math.max(a.rect.top, b.rect.top);
          const gap = Math.max(b.rect.left - (a.rect.left + a.rect.width), a.rect.left - (b.rect.left + b.rect.width));
          if (ov < 0.5 * Math.min(a.h, b.h) || gap < 0 || gap > 64 || Math.abs(a.h - b.h) <= 2) continue;
          toldPair++;
          F.push({
            check: "button-styles",
            sev: "FAIL",
            id: a.id,
            sel: a.sel,
            text: a.text,
            stop: a.stop,
            rects: [a.rect, b.rect],
            msg: `a button pair at two heights: "${a.text}" ${a.h}px beside "${b.text}" ${b.h}px`,
          });
        }
    }
    // same-action: one label (or one target) drawn two ways
    {
      const byLabel = new Map();
      for (const b of all.filter(x => x.real && !x.mock && !xlIds.has(x.id))) {
        const k = norm(b.text);
        if (!k) continue;
        if (!byLabel.has(k)) byLabel.set(k, []);
        byLabel.get(k).push(b);
      }
      for (const list of byLabel.values()) {
        if (list.length < 2) continue;
        let bad = null;
        for (const a of list)
          for (const b of list) {
            if (bad || a.id >= b.id) continue;
            const nav = a.nav !== b.nav,
              small = a.nav ? a : b,
              large = a.nav ? b : a;
            if (!sameLook(a, b) && !invertedLook(a, b)) {
              bad = `${lookName(a)} and ${lookName(b)}`;
              break;
            }
            const kh = Math.max(a.h, b.h) / Math.min(a.h, b.h),
              kf = Math.max(a.fs, b.fs) / Math.min(a.fs, b.fs);
            if (nav && small.h <= large.h && kh <= 1.5 && kf <= 1.5) continue; // the nav copy, one size smaller
            if (kh > 1.3 || kf > 1.3)
              bad = `${Math.min(a.h, b.h)}px and ${Math.max(a.h, b.h)}px tall, labels at ${Math.round(Math.min(a.fs, b.fs))}px and ${Math.round(Math.max(a.fs, b.fs))}px`;
          }
        if (bad)
          F.push({
            check: "same-action",
            sev: "FAIL",
            id: list[0].id,
            sel: list[0].sel,
            text: list[0].text,
            stop: list[0].stop,
            rects: list.filter(x => x.stop === list[0].stop).map(x => x.rect),
            msg: `"${list[0].text}" appears ${list.length} times in different looks: ${bad}`,
          });
      }
    }
    // fake-button: a filled box with a short label that looks like the page's buttons but is not one
    {
      const realLooks = clusterLooks(all.filter(x => x.real && !x.mock));
      const toldF = new Set();
      for (const x of fakes) {
        const like = realLooks.find(r => sameLook(r, x));
        if (!like && !(x.strong && x.h >= 36)) continue;
        const k = lookName(x);
        if (toldF.has(k)) continue;
        toldF.add(k);
        const n = fakes.filter(y => lookName(y) === k).length;
        F.push({
          check: "fake-button",
          sev: "WARN",
          id: x.id,
          sel: x.sel,
          text: x.text,
          stop: x.stop,
          rects: [x.rect],
          msg: `"${x.text}" looks like a button (${lookName(x)}${like ? ", the same look as the page's buttons" : ""}) but is not a link or a button${n > 1 ? ` (${n} like it)` : ""}`,
        });
      }
    }
    TM("no-visual..buttons");
    // the blocks that read the walked page: the tab, its screens and place()
    for (const M of MODULES) {
      if (M.phase !== "width" || modOff(M)) continue;
      const mctx = {
        tab,
        helper,
        cdp,
        url,
        width,
        height,
        vw,
        vh,
        mobile,
        first,
        quick,
        type: TYPE,
        typeFlag: TYPE_FLAG,
        kind: KIND,
        flags: MOD_FLAGS.get(M.id),
        buildPlan: BUILD_PLAN,
        outDir,
        stopY,
        shots,
        docWidth,
        place,
        addShot: b64 => shots.push(b64) - 1,
        pageInfo: async () => PG,
        safe,
        errors,
        sleep,
        log: (...a) => {
          if (process.env.CC_TIMING) console.error(`  [${width}] ${M.id}:`, ...a);
        },
      };
      if (M.when && !M.when(mctx)) continue;
      if (M === motionMod) {
        if (MOD_DONE.has(M.id)) continue;
        MOD_DONE.add(M.id);
      }
      for (const f of (await safe(M.id, () => M.run(mctx))) || []) F.push(f);
      TM(M.id);
    }
    // the passes that hover, wait or submit run once, at the first width
    if (first && !quick) {
      // hover-spill: a card or link card that grows past its column or the screen on hover
      const hc = (await safe("hover", () => tab.eval("window.__cc.hoverCands()"))) || [];
      let spills = 0;
      const moved = [],
        deadCards = [];
      for (const c of hc) {
        if (spills >= 3) break;
        await tab.eval(`window.__cc.scrollTo(${Math.max(0, Math.round(c.doc.top + c.doc.height / 2 - vh / 2))})`);
        await sleep(250);
        const a = await safe("hover", () => tab.eval(`window.__cc.hoverBox(${c.id})`));
        if (!a || a.r.top < 0 || a.r.top + a.r.height > vh) continue;
        const xr = moved.length < 3 ? await safe("hover", () => tab.eval(`window.__cc.hoverXf(${c.id})`)) : null;
        const sg0 = c.linked ? await safe("hover", () => tab.eval(`window.__cc.hoverSig(${c.id})`)) : null;
        await tab
          .send("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x: Math.round(a.r.left + a.r.width / 2),
            y: Math.round(a.r.top + a.r.height / 2),
          })
          .catch(() => {});
        await sleep(450);
        const sg1 = sg0 ? await safe("hover", () => tab.eval(`window.__cc.hoverSig(${c.id})`)) : null;
        if (sg0 && sg1 && sg0.sig === sg1.sig && JSON.stringify(sg0.r) === JSON.stringify(sg1.r))
          deadCards.push({ c, a, sg: sg1 });
        const b = await safe("hover", () => tab.eval(`window.__cc.hoverBox(${c.id})`));
        const xa = moved.length < 3 ? await safe("hover", () => tab.eval(`window.__cc.hoverXf(${c.id})`)) : null;
        const shot = await tab.shot();
        // hover-move: a tilt FAILs; a card that jumps more than 6px or grows past 1.03, or a picture zooming past 1.05, WARNs
        // (what the hover changed: a card already turned or scaled at rest is tilt's or the layout's)
        if (xa && xr && b) {
          const lift = xr.ty - xa.ty,
            grow = xa.s / (xr.s || 1),
            zoom = xa.pic / (xr.pic || 1);
          const why =
            !xa.flat && xr.flat ? "turns in 3D (a tilt)"
            : Math.abs(xa.deg - xr.deg) >= 0.5 ? `rotates ${Math.round((xa.deg - xr.deg) * 10) / 10}deg (a tilt)`
            : lift >= 6.5 ? `lifts ${Math.round(lift)}px`
            : grow > 1.031 ? `grows to ${grow.toFixed(3)}x`
            : zoom > 1.051 ? `zooms its picture to ${zoom.toFixed(3)}x`
            : "";
          if (why) {
            shots.push(shot);
            moved.push(c.id);
            F.push({
              check: "hover-move",
              sev: /tilt/.test(why) ? "FAIL" : "WARN",
              id: c.id,
              sel: c.sel,
              text: c.text,
              stop: shots.length - 1,
              rects: [b.r],
              msg: `on hover the card ${why}: a linked card lifts 2px and a photo zooms 1.02-1.03 inside its frame, nothing tilts (house rule)`,
            });
          }
        }
        await tab.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: Math.round(vh - 2) }).catch(() => {});
        if (!b) continue;
        const past = (q, bx) =>
          Math.max(bx.left - q.left, q.left + q.width - bx.right, -q.left, q.left + q.width - b.vw);
        const grow = past(b.r, b.box) - Math.max(0, past(a.r, a.box));
        if (grow >= 12) {
          shots.push(shot);
          spills++;
          F.push({
            check: "hover-spill",
            sev: "FAIL",
            id: c.id,
            sel: c.sel,
            text: c.text,
            stop: shots.length - 1,
            rects: [
              b.r,
              Object.assign(
                { left: b.box.left, top: b.box.top, width: b.box.right - b.box.left, height: b.box.bottom - b.box.top },
                { ref: true },
              ),
            ],
            msg: `on hover it runs ${Math.round(grow)}px past its column or the screen (${a.r.width}x${a.r.height} at rest, ${b.r.width}x${b.r.height} hovered)`,
          });
        }
      }
      // hover-move, the other half (house rule and the judges: "hover shows no change on the tested card"): a linked card or a linked
      // photograph whose look, move and pictures are the same hovered as at rest. With the motion layer on it is a card the layer does not reach (a tile
      // without .card or .frame__img); without it, a page that never linked motion.css
      if (deadCards.length) {
        const names = deadCards.map(d => `"${(d.c.text || d.c.sel).slice(0, 30)}"`);
        for (const d of deadCards.slice(0, 3)) {
          shots.push(await tab.shot());
          F.push({
            check: "hover-move",
            sev: "FAIL",
            id: d.c.id,
            sel: d.c.sel,
            text: d.c.text,
            stop: shots.length - 1,
            rects: [d.a.r],
            msg: `a linked card or photo shows no change on hover (${d.a.r.width}x${d.a.r.height}): it does not lift, its photograph does not zoom, nothing darkens or draws${d.sg.motion ? " (the page marks data-motion, but the motion layer does not reach this card)" : " (the page carries no data-motion: link assets/motion/motion.css after cards.css and put data-motion on <html>)"}${deadCards.length > 1 ? `; ${deadCards.length} of the page's linked cards and photos do the same: ${names.slice(0, 4).join(", ")}` : ""}`,
          });
          if (deadCards.length > 1) break;
        }
      }
      await sleep(300);
      // hover (house rule: micro-animations, button hovers): a filled button, an outlined one, a text link and a
      // nav link, each hovered once; a kind whose look does not change in 350 ms answers nothing
      {
        const kinds = (await safe("hover-kinds", () => tab.eval("window.__cc.hoverKinds()"))) || [];
        const dead = [];
        for (const c of kinds) {
          if (!c.sel.startsWith("header") && !/nav/.test(c.kind)) {
            await tab.eval(`window.__cc.scrollTo(${Math.max(0, Math.round(c.doc.top + c.doc.height / 2 - vh / 2))})`);
            await sleep(250);
          } else {
            await tab.eval("window.__cc.scrollTo(0)");
            await sleep(250);
          }
          const a = await safe("hover", () => tab.eval(`window.__cc.lookSig(${c.id})`));
          if (!a || a.r.top < 0 || a.r.top + a.r.height > vh) continue;
          await tab
            .send("Input.dispatchMouseEvent", {
              type: "mouseMoved",
              x: Math.round(a.r.left + a.r.width / 2),
              y: Math.round(a.r.top + a.r.height / 2),
            })
            .catch(() => {});
          await sleep(350);
          const b = await safe("hover", () => tab.eval(`window.__cc.lookSig(${c.id})`));
          await tab
            .send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: Math.round(vh - 2) })
            .catch(() => {});
          await sleep(200);
          if (b && b.sig === a.sig && JSON.stringify(b.r) === JSON.stringify(a.r)) dead.push(c);
        }
        if (kinds.length && dead.length) {
          const all = dead.length === kinds.length,
            c = dead[0];
          F.push(
            Object.assign(
              {
                check: "hover",
                sev: "WARN",
                id: c.id,
                sel: c.sel,
                text: c.text,
                msg:
                  all ?
                    `nothing answers the pointer: the ${kinds.map(k => k.kind).join(", ")} look the same hovered as at rest`
                  : `the ${dead.map(k => `${k.kind} ("${k.text.slice(0, 20)}")`).join(", ")} ${dead.length > 1 ? "look" : "looks"} the same hovered as at rest, while the ${kinds
                      .filter(k => !dead.includes(k))
                      .map(k => k.kind)
                      .join(", ")} ${kinds.length - dead.length > 1 ? "answer" : "answers"}`,
              },
              place(c.doc),
            ),
          );
        }
      }
      // hidden-visual: a picture that shows only on hover
      for (const c of ((await safe("hidden", () => tab.eval("window.__cc.hiddenCands()"))) || []).slice(0, 8)) {
        await tab.eval(`window.__cc.scrollTo(${Math.max(0, Math.round(c.doc.top + c.doc.height / 2 - vh / 2))})`);
        await sleep(250);
        const a = await safe("hidden", () => tab.eval(`window.__cc.hoverBox(${c.host})`));
        if (!a || a.r.top < 0 || a.r.top >= vh) continue;
        const shot0 = await tab.shot();
        await tab
          .send("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x: Math.round(a.r.left + Math.min(a.r.width, 400) / 2),
            y: Math.round(a.r.top + Math.min(a.r.height, vh - a.r.top) / 2),
          })
          .catch(() => {});
        await sleep(500);
        const on = await safe("hidden", () => tab.eval(`window.__cc.isShownNow(${c.id})`));
        await tab.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: Math.round(vh - 2) }).catch(() => {});
        if (on) {
          shots.push(shot0);
          F.push({
            check: "hidden-visual",
            sev: "WARN",
            id: c.id,
            sel: c.sel,
            text: "",
            stop: shots.length - 1,
            rects: [a.r],
            msg: `a picture in ${c.hsel.split(" > ").pop()} shows only on hover or focus: at rest the card has none`,
          });
        }
      }
      // loop-pause: a visual still moving 5 s after it came on screen, with no pause control
      const lc = (await safe("loops", () => tab.eval("window.__cc.loopCands()"))) || [];
      const screens = [];
      for (const c of [...lc].sort((a, b) => a.doc.top - b.doc.top)) {
        const sc = screens.find(s2 => c.doc.top >= s2.y && c.doc.top + Math.min(c.doc.height, vh * 0.8) <= s2.y + vh);
        if (sc) sc.items.push(c);
        else screens.push({ y: Math.max(0, Math.round(c.doc.top - vh * 0.1)), items: [c] });
      }
      // every screen of the page is read as well, by its pixels: a rotation or a ticker a script drives on plain
      // elements is no candidate by type (16 screens at most, the candidates' screens first)
      {
        const mx =
          (await safe("loops", () => tab.eval("Math.max(0, document.scrollingElement.scrollHeight - innerHeight)")))
          || 0;
        for (let y = 0; y <= mx + 1 && screens.length < 16; y += vh) {
          const yy = Math.min(Math.round(y), mx);
          if (!screens.some(s2 => Math.abs(s2.y - yy) < vh * 0.5)) screens.push({ y: yy, items: [] });
          if (yy >= mx) break;
        }
      }
      const toldLoop = new Set();
      for (const sc of screens.slice(0, 16)) {
        await tab.eval(`window.__cc.scrollTo(${sc.y})`);
        await sleep(5200);
        const A = await tab.shot(92);
        await sleep(1200);
        const B = await tab.shot(92);
        await sleep(1400);
        const C = await tab.shot(92);
        const rects =
          sc.items.length ?
            (await safe("loops", () =>
              tab.eval(`[${sc.items.map(c => c.id).join(",")}].map((i) => window.__cc.viewRect(i))`),
            )) || []
          : [];
        const items = sc.items
          .map((c, i) => ({ c, r: rects[i] }))
          .filter(x => x.r && x.r.width >= 20 && x.r.height >= 20 && x.r.top >= -2 && x.r.top < vh);
        await helper.eval(`window.__h.keep("A", ${JSON.stringify(A)})`);
        await helper.eval(`window.__h.keep("B", ${JSON.stringify(B)})`);
        await helper.eval(`window.__h.keep("C", ${JSON.stringify(C)})`);
        const d1 =
          items.length ? await helper.eval(`window.__h.diff("A", "B", ${JSON.stringify(items.map(x => x.r))})`) : [];
        const d2 =
          items.length ? await helper.eval(`window.__h.diff("A", "C", ${JSON.stringify(items.map(x => x.r))})`) : [];
        const d = d1.map((v, i) => Math.max(v, d2[i] || 0));
        let at = null;
        // what moved outside every candidate: the element that holds it, told like a candidate
        const boxes = (await safe("loops", () => helper.eval(`window.__h.moving("A", "B", "C", ${vw}, ${vh})`))) || [];
        const inside = (b, q) =>
          Math.max(0, Math.min(b.left + b.width, q.left + q.width) - Math.max(b.left, q.left))
            * Math.max(0, Math.min(b.top + b.height, q.top + q.height) - Math.max(b.top, q.top))
          >= 0.6 * b.width * b.height;
        for (const b of boxes) {
          if (items.some(x => inside(b, x.r))) continue;
          const e = await safe("loops", () => tab.eval(`window.__cc.moverAt(${JSON.stringify(b)})`));
          if (!e || toldLoop.has(e.id)) continue;
          if (await safe("loops", () => tab.eval(`window.__cc.pauseFor(${e.id})`))) {
            toldLoop.add(e.id);
            continue;
          }
          toldLoop.add(e.id);
          if (at == null) {
            shots.push(A);
            at = shots.length - 1;
          }
          F.push({
            check: "loop-pause",
            sev: "FAIL",
            id: e.id,
            sel: e.sel,
            text: e.text,
            stop: at,
            rects: [b],
            msg: `still moving ${Math.round((5200 + 2600) / 1000)} s after it came on screen (${b.width}x${b.height}px of the screen changes), with no pause button`,
          });
        }
        for (const [i, x] of items.entries()) {
          if (d[i] < 0.003 || toldLoop.has(x.c.id)) continue;
          if (await safe("loops", () => tab.eval(`window.__cc.pauseFor(${x.c.id})`))) continue;
          toldLoop.add(x.c.id);
          if (at == null) {
            shots.push(A);
            at = shots.length - 1;
          }
          F.push({
            check: "loop-pause",
            sev: "FAIL",
            id: x.c.id,
            sel: x.c.sel,
            text: x.c.text,
            stop: at,
            rects: [x.r],
            msg: `still moving ${Math.round((5200 + 1200) / 1000)} s after it came on screen (${(d[i] * 100).toFixed(1)}% of it changed in 2.6 s), with no pause button`,
          });
        }
      }
      // forms: filled with test values and submitted, with every request held inside the browser
      const forms = (await safe("forms", () => tab.eval("window.__cc.formsList()"))) || [];
      if (forms.length && !isLocal())
        report.notChecked = [...(report.notChecked || []), "forms (a remote page is never submitted)"];
      else
        for (const fm of forms.slice(0, 4)) {
          await tab.eval(`window.__cc.scrollTo(${Math.max(0, Math.round(fm.doc.top - vh * 0.1))})`);
          await sleep(300);
          const sent = [],
            nav = [];
          const off1 = cdp.on(tab.sid, "Fetch.requestPaused", p => {
            const rt = p.resourceType || "";
            if (!/^(Image|Font|Stylesheet|Media)$/.test(rt))
              sent.push({ url: p.request.url, method: p.request.method, type: rt });
            tab
              .send("Fetch.fulfillRequest", {
                requestId: p.requestId,
                responseCode: 200,
                responseHeaders: [{ name: "Content-Type", value: "text/plain" }],
                body: "",
              })
              .catch(() => {});
          });
          const off2 = cdp.on(tab.sid, "Page.frameRequestedNavigation", p => nav.push(p.url));
          await tab.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] }).catch(() => {});
          const res = await safe("forms", () => tab.eval(`window.__cc.trySubmit(${fm.id})`, 20000));
          await sleep(300);
          await tab.send("Fetch.disable").catch(() => {});
          off1();
          off2();
          if (!res) continue;
          const act = res.actionUrl,
            actRaw = (res.action || "").trim();
          const nativeOk =
            res.native && !res.prevented && act && actRaw !== "#" && actRaw !== "" && (await pageExists(act));
          const mail =
            nav.some(u => /^mailto:/i.test(u)) || res.opened.some(u => /^mailto:/i.test(u)) || /^mailto:/i.test(actRaw);
          const posted = sent.filter(
            q => q.method !== "GET" || /^(XHR|Fetch|Ping|Document|Other|EventSource)$/.test(q.type),
          );
          if (posted.length || mail || nativeOk) continue;
          const why =
            res.native && !res.prevented ?
              actRaw === "" || actRaw === "#" ?
                `it submits to "${actRaw}" (this page)`
              : `it posts to ${actRaw}, which does not exist here`
            : "its submit handler sends no request and opens no mail";
          F.push(
            Object.assign(
              {
                check: "forms",
                sev: "FAIL",
                id: fm.id,
                sel: fm.sel,
                text: fm.text,
                msg: `the form sends nothing when submitted: ${why}${res.after !== res.before ? " (it only changes its own text)" : ""}`,
              },
              place(fm.doc),
            ),
          );
        }
    }
    if (docWidth > vw + 1)
      F.push({
        check: "off-viewport",
        sev: "FAIL",
        id: 0,
        sel: "(the page)",
        text: "",
        stop: null,
        rects: [],
        msg: `the page is ${docWidth}px wide on a ${vw}px screen and scrolls sideways`,
      });
    // webgl: more than 4 live WebGL contexts at once (the page's own peak, and the screen that showed the most; the house and
    // MO-83: at most 4, the same cap as effect-kind and perf.mjs)
    {
      const G = await safe("webgl", () =>
        tab.eval(
          "window.__ccgl ? { peak: window.__ccgl.peak, at: window.__ccgl.peakAt, asked: window.__ccgl.asked, prodAsked: window.__ccgl.prodAsked || 0, refused: window.__ccgl.refused, evicted: window.__ccgl.evicted } : null",
        ),
      );
      glAsked = G ? G.asked : 0;
      const n = Math.max(G ? G.peak : 0, glMax.n);
      if (n > 4) {
        const names = glMax.n >= (G ? G.peak : 0) ? glMax.items.map(i => i.name) : G.at;
        const cnt = new Map();
        for (const x of names) cnt.set(x, (cnt.get(x) || 0) + 1);
        const list = [...cnt].map(([x, c]) => (c > 1 ? `${x} x${c}` : x)).join(", ");
        const mp = glMax.items.reduce((s, i) => s + (i.px || 0), 0) / 1e6;
        const capped =
          G && (G.evicted || G.refused) ?
            `; the checker held the page to ${GL_CAP} (${G.evicted} freed off screen${G.refused ? `, ${G.refused} refused and measured as their fallback` : ""})`
          : "";
        const onScreen =
          glMax.n >= 4 ?
            glMax.items
              .filter(i => i.on && i.rect.width >= 1 && i.rect.top < vh && i.rect.top + i.rect.height > 0)
              .map(i => i.rect)
          : [];
        F.push({
          check: "webgl",
          sev: "FAIL",
          id: 0,
          sel: "(the page)",
          text: "",
          stop: onScreen.length ? glMax.stop : null,
          rects: onScreen,
          msg: `${n} WebGL contexts live at once (at most 4): ${list}${mp >= 0.05 ? `; ${mp.toFixed(1)} MP of canvas on the fullest screen` : ""}${capped}`,
        });
      }
      // effects-fit (house rule): shader effects fit a tech, software, AI or gaming page; a place or a local
      // business leads with photographs, CSS grounds and type. A FAIL when --type place is given, else a WARN
      // a FAIL on a place or a service (the type read from the title counts: the readers counted all three), and on
      // a product for an effect ground, a scene or a print over its photographs (a render of the product itself is fine)
      // a product with a technical subject is tech (TECH, the one verdict effect-kind's kindFrom gives too): no effects-fit
      if (first && (G ? G.asked - (G.prodAsked || 0) : 0) > 0 && /^(place|service|product)$/.test(TYPE) && !TECH) {
        const fx = [...new Set([...glMax.items.map(i => i.name), ...((G && G.at) || [])])].slice(0, 5);
        const grounds =
          (await tab
            .eval(
              `[...document.querySelectorAll('[data-fx], [data-fx-mounted], [data-scene], [data-big-scene]')].map((e) => e.getAttribute('data-fx') || e.getAttribute('data-scene') || e.getAttribute('data-big-scene') || 'an effect').slice(0, 4)`,
            )
            .catch(() => [])) || [];
        const pr = (await tab.eval("window.__cc.moreChecks().prints.length").catch(() => 0)) || 0;
        // 2.5.2: one quiet treatment (meta "treatment": true) in one context, beside a scene that fits, is allowed
        const asked1 = G.asked - (G.prodAsked || 0),
          notScene = grounds.filter(g => !sceneFitsKind(g, TYPE));
        const treatOnly = !pr && asked1 <= 1 && notScene.length === 1 && isTreatment(notScene[0]);
        if (!treatOnly && (TYPE !== "product" || grounds.length || pr))
          F.push({
            check: "effects-fit",
            sev: "FAIL",
            id: 0,
            sel: "(the page)",
            text: "",
            stop: null,
            rects: [],
            msg: `a ${KIND || TYPE} page${KIND_FROM && KIND_FROM !== "--type" ? ` (${KIND_FROM})` : ""} asks for ${G.asked - (G.prodAsked || 0)} WebGL context${G.asked - (G.prodAsked || 0) > 1 ? "s" : ""}${fx.length ? ` (${fx.join(", ")})` : ""}${TYPE === "product" ? `: ${grounds.length ? `effect grounds (${[...new Set(grounds)].join(", ")})` : ""}${grounds.length && pr ? " and " : ""}${pr ? "a print over its photographs" : ""}` : ""}: shader effects are for tech, software, AI and gaming pages${TYPE === "product" ? " (a product may show a render of itself)" : ""}`,
          });
      }
    }

    // scroll-linked parts of one section are told once, under the outermost (a FAIL first)
    const SL = F.filter(f => f.check === "scroll-linked");
    if (SL.length > 1) {
      const pl =
        (await safe("place", () => tab.eval(`window.__cc.placeOf(${JSON.stringify(SL.map(f => f.id))})`)))
        || SL.map(() => [-1, 0]);
      const groups = new Map();
      SL.forEach((f, i) => {
        const key = pl[i][0] >= 0 ? pl[i][0] : "x" + i;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ f, depth: pl[i][1] });
      });
      for (const g of groups.values()) {
        if (g.length < 2) continue;
        g.sort(
          (a, b) =>
            (a.f.sev === b.f.sev ? 0
            : a.f.sev === "FAIL" ? -1
            : 1) || a.depth - b.depth,
        );
        const main = g[0].f,
          rest = g.slice(1).map(x => x.f);
        main.msg += `; ${rest.length} more part${rest.length > 1 ? "s" : ""} of this section change with the scroll too (${rest
          .slice(0, 4)
          .map(x => x.sel.split(" > ").pop())
          .join(", ")}${rest.length > 4 ? ", ..." : ""})`;
        for (const x of rest) F.splice(F.indexOf(x), 1);
      }
    }
    // House rule (motion.md, The rule): every kind deals one or two moments, each in a section of its own
    // ([data-moment]) that may follow the scroll or hold itself with position: sticky; a tech, gaming or software page may
    // also hold one big scene. What moves with the scroll inside the first two moments (and the first scene) is a WARN,
    // the moment's own motion, not a FAIL (the reduced-motion pass still wants its still, and effect-kind counts past the
    // allowance); anything else that follows the scroll stays a FAIL
    {
      const sl = F.filter(f => (f.check === "scroll-linked" || f.check === "pinned") && f.id);
      const mo =
        sl.length ?
          (await safe("moments", () => tab.eval(`window.__cc.momentOf(${JSON.stringify(sl.map(f => f.id))})`))) || []
        : [];
      const keep = { scene: [], moment: [] };
      sl.forEach((f, i) => {
        const m = mo[i];
        if (!m || (m.kind === "scene" && TYPE !== "software")) return;
        const k = keep[m.kind];
        if (!k.includes(m.key)) k.push(m.key);
        if (k.indexOf(m.key) < (m.kind === "scene" ? 1 : 2)) {
          f.sev = "WARN";
          f.msg +=
            m.kind === "scene" ?
              ` (a big scene on a ${KIND} page: allowed, one scene at most, house rule; its still is judged under reduced motion)`
            : " (inside a dealt moment's section, [data-moment]: expected on every kind, two moments at most, house rule; its still is judged under reduced motion)";
        }
      });
      // an enter moment (picture-develops runs once as it comes on screen) reveals as it is scrolled to: inside the
      // first two moments' sections a WARN; three or more parts of one moment revealed one by one are cards, rows or
      // tiles entering on scroll, which no moment does: they stay a FAIL
      const rv = F.filter(f => f.check === "scroll-reveal" && f.id);
      const rm =
        rv.length ?
          (await safe("moments", () => tab.eval(`window.__cc.momentOf(${JSON.stringify(rv.map(f => f.id))})`))) || []
        : [];
      const per = new Map();
      rv.forEach((f, i) => {
        const m = rm[i];
        if (m && m.kind === "moment") per.set(m.key, (per.get(m.key) || 0) + 1);
      });
      rv.forEach((f, i) => {
        const m = rm[i];
        if (!m || m.kind !== "moment") return;
        const k = keep.moment;
        if (!k.includes(m.key)) k.push(m.key);
        const parts = Math.max(per.get(m.key), (f.msg.match(/^(\d+) parts/) || [0, 1])[1] | 0);
        if (k.indexOf(m.key) < 2 && parts < 3) {
          f.sev = "WARN";
          f.msg +=
            " (inside a dealt moment's section, [data-moment]: an enter moment is expected on every kind; its still is judged under reduced motion)";
        }
      });
    }
    // one fault under one id: what empty-visual, caption or effects-fit tells is not told again by the visuals block
    // (only when that check tells it as gravely: a figcaption caption WARNs as a credit stays a visual-caption FAIL)
    for (const f of [...F]) if (sameFault(f, F)) F.splice(F.indexOf(f), 1);
    TM("hover+loops+forms");
    mergeCut(F);
    groupLike(F);
    // a fault inside a scroll-linked animation is caught mid-way: a WARN (the animation is the FAIL, told on its own);
    // with --quick, the same for anything in a held section or a scroll scene, whose motion was not checked
    // (what does not depend on where a moving part was caught keeps its severity: sizes, words, links, pictures, loops)
    const told = new Set([
      "placeholder",
      "sample-label",
      "caption",
      "effect-repeat",
      "card-layout",
      "nesting",
      "pricing-tiers",
      "col-edge",
      "text-contrast",
      "body-size",
      "text-only",
      "scroll-linked",
      "scroll-reveal",
      "pinned",
      "no-visual",
      "assets",
      "heading-scale",
      "copy-headline",
      "copy-fact",
      "copy-headings",
      "copy-buttons",
      "copy-actions",
      "nav-labels",
      "links",
      "forms",
      "font-load",
      "cta",
      "photo-upscale",
      "photo-set",
      "photo-credit",
      "button-picture",
      "loop-pause",
      "webgl",
      "marquee",
      "hole",
      "card-visual",
      "hidden-visual",
      "card-family",
      "link-styles",
      "heading-align",
      "hero-fill",
      "shader-lint",
      "gl-fallback",
      "credit-wall",
      "unit-break",
      "tab-wrap",
      "flush",
      "photo-weight",
      "copy-length",
      "nav-current",
      "progress-bar",
      "photo-repeat",
      "photo-print",
      "grounds",
      "split-align",
      "fact-agree",
      "fold-action",
      "action-count",
      "one-screen",
      "hover",
      "product-shown",
      "same-object",
    ]);
    for (const M of MODULES) for (const c of M.checks) told.add(c.id);
    const ids = F.map(f => (told.has(f.check) ? 0 : f.id || 0));
    const inside = (await safe("inside", () => tab.eval(`window.__cc.insideMoving(${JSON.stringify(ids)})`))) || [];
    F.forEach((f, i) => {
      if (inside[i]) {
        f.msg += " (caught mid-way through a scroll-linked animation)";
        f.sev = "WARN";
      }
    });
    if (quick) {
      const scene = (await safe("scene", () => tab.eval(`window.__cc.insideScene(${JSON.stringify(ids)})`))) || [];
      F.forEach((f, i) => {
        if (scene[i] && !inside[i]) {
          f.msg += " (inside a held section or scroll scene, whose motion --quick does not check)";
          f.sev = "WARN";
        }
      });
    }
    groupSame(F);
  } catch (e) {
    errors.push(e.message);
  } finally {
    await tab.close();
  }

  // dedupe, order, crop
  const seenKey = new Set();
  const out = [];
  for (const f of F.sort(bySev)) {
    const key = f.check + "|" + f.sel + "|" + f.msg.replace(/\d+(\.\d+)?/g, "#");
    if (seenKey.has(key)) continue;
    seenKey.add(key);
    out.push(f);
  }
  let n = 0;
  const crops = out
    .filter(f => f.stop != null && shots[f.stop] && f.rects && f.rects.length)
    .sort((a, b) => a.stop - b.stop)
    .slice(0, 80);
  for (const f of crops)
    await cropTo(helper, shots[f.stop], f, vw, vh, `${width}-${String(++n).padStart(2, "0")}-${f.check}.jpg`);
  return { width, height, screens: stops, held: held.length, errors, findings: out.map(clean), glAsked };
}

// ---------------------------------------------------------------- the first screen between the main widths
async function sweepWidth(cdp, w) {
  const height = HEIGHTS[w] || 800;
  const tab = await Tab.open(cdp, { width: w, height, mobile: false });
  const F = [],
    errors = [];
  let shot = null,
    vw = w,
    vh = height;
  try {
    await tab.goto(url);
    await tab.eval("document.fonts ? document.fonts.ready.then(() => 1) : 1", 15000).catch(() => {});
    await waitReady(tab);
    await sleep(1500);
    await tab.eval(`(${lib.toString()})()`);
    const m = await tab.eval("window.__cc.measure(0)", 120000);
    vw = m.vw;
    vh = m.vh;
    shot = await tab.shot();
    takePage(errors, m.errors);
    // hero-fill at this width too (the readers' tablet is 768x1024: a hero that ends short shows the next heading)
    const hf = await tab.eval("window.__cc.heroFill()", 30000).catch(() => null);
    if (hf)
      F.push({
        check: "hero-fill",
        sev: "FAIL",
        id: hf.id,
        sel: hf.sel,
        text: hf.text,
        rects: [{ left: 0, top: hf.top, width: vw, height: Math.max(4, vh - hf.top) }],
        msg: `the next section shows on the first screen: it starts at ${hf.top}px on a ${hf.vh}px screen (the hero ends at ${hf.heroBottom}px)`,
      });
    // a part caught mid-move (a card travelling between columns in a loop) is no spill: measured again 0.9 s later,
    // only what stays where it was is told
    await sleep(900);
    await tab.eval(`(${lib.toString()})()`); // a fresh probe: each part is judged once per probe
    const m2 = await tab.eval("window.__cc.measure(0)", 120000).catch(() => null);
    const still = f =>
      !m2
      || m2.findings.some(
        g =>
          g.check === f.check
          && g.sel === f.sel
          && (!f.rects
            || !f.rects[0]
            || !g.rects
            || !g.rects[0]
            || (Math.abs(f.rects[0].left - g.rects[0].left) <= 4 && Math.abs(f.rects[0].top - g.rects[0].top) <= 4)),
      );
    for (const f of m.findings) if (/^(spill|off-viewport|cut-text)$/.test(f.check) && still(f)) F.push(f);
    mergeCut(F);
    groupLike(F);
    if (m.nav) {
      for (const o of m.nav.outside)
        F.push({
          check: "nav",
          sev: "FAIL",
          id: o.id,
          sel: o.sel,
          text: o.text,
          rects: [o.rect, Object.assign({}, m.nav.bar.rect, { ref: true })],
          msg: `"${o.text}" sits outside the nav bar ${m.nav.bar.sel}`,
        });
      for (const x of m.nav.wraps)
        F.push({
          check: "nav",
          sev: "FAIL",
          id: x.id,
          sel: x.sel,
          text: x.text,
          rects: [x.rect],
          msg: "nav link wraps to a second line",
        });
      if (m.nav.rowsWrap)
        F.push({
          check: "nav",
          sev: "FAIL",
          id: m.nav.id,
          sel: m.nav.rowsWrap.sel,
          text: "",
          rects: [m.nav.rowsWrap.rect],
          msg: `nav links wrap onto ${m.nav.rowsWrap.rows} rows`,
        });
    }
    if (m.docWidth > m.vw + 1)
      F.push({
        check: "off-viewport",
        sev: "FAIL",
        id: 0,
        sel: "(the page)",
        text: "",
        rects: [],
        msg: `the page is ${m.docWidth}px wide on a ${m.vw}px screen and scrolls sideways`,
      });
  } catch (e) {
    lose(errors, "first screen", e);
  } finally {
    await tab.close();
  }
  return { w, vw, vh, shot, F, errors };
}
// the narrow pass: every block that runs past the screen's edge at 320 (the page walked to its foot first, so lazy
// pictures and reveals are there); one outermost block each, a crop of the first three
function narrowProbe() {
  const vw = document.documentElement.clientWidth || innerWidth,
    docW = document.documentElement.scrollWidth;
  const S = el => getComputedStyle(el);
  const loops = new Set();
  try {
    for (const an of document.getAnimations()) {
      const t = an.effect && an.effect.target;
      if (t && an.effect.getComputedTiming().iterations === Infinity) loops.add(t);
    }
  } catch {}
  const looping = el => {
    for (let a = el; a && a !== document.body; a = a.parentElement) if (loops.has(a)) return true;
    return false;
  };
  const clipped = el => {
    for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      const c = S(a);
      if (c.overflowX !== "visible" || c.clipPath !== "none" || /paint|strict|content/.test(c.contain)) return true;
    }
    return false;
  };
  const shown = el => {
    const c = S(el);
    if (c.visibility !== "visible" || c.display === "none") return false;
    return !el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  };
  const name = el => {
    const p = [];
    for (let e = el; e && e !== document.body && p.length < 3; e = e.parentElement)
      p.unshift(
        e.tagName.toLowerCase()
          + (e.id ?
            "#" + e.id
          : [...e.classList]
              .slice(0, 2)
              .map(c => "." + c)
              .join("")),
      );
    return p.join(" > ");
  };
  const over = new Set(),
    list = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|BR)$/.test(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const by = Math.max(r.right - vw, -r.left);
    if (by <= 1) continue;
    if (clipped(el) || looping(el) || !shown(el)) continue;
    if (/fixed|sticky/.test(S(el).position) && r.left <= 1 && r.right >= docW - 1 && docW > vw + 1) continue; // a bar spanning the widened page follows the fault, it is none
    over.add(el);
    if (el.parentElement && over.has(el.parentElement)) continue;
    list.push({
      sel: name(el),
      text: String(el.innerText || el.getAttribute("alt") || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 48),
      top: Math.round(r.top + scrollY),
      left: Math.round(r.left),
      width: Math.round(r.width),
      height: Math.round(r.height),
      by: Math.round(by),
      side: r.right - vw > -r.left ? "right" : "left",
      fixed: /fixed|sticky/.test(S(el).position),
    });
  }
  return { vw, docW, list: list.slice(0, 8) };
}
async function narrowPass(cdp, helper, w) {
  const height = HEIGHTS[w] || Math.round(w * 2);
  const tab = await Tab.open(cdp, { width: w, height, mobile: true });
  const F = [],
    errors = [];
  let n = 0;
  try {
    await tab.goto(url);
    await tab.eval("document.fonts ? document.fonts.ready.then(() => 1) : 1", 15000).catch(() => {});
    await waitReady(tab);
    await sleep(1200);
    const H = await tab.eval("document.scrollingElement.scrollHeight");
    for (let y = 0, k = 0; y < H && k < 40; y += height, k++) {
      await tab.eval(`scrollTo(0, ${y})`);
      await sleep(220);
    }
    await tab.eval("scrollTo(0, 0)");
    await sleep(500);
    // collide and tap-size on every screen, the fold on the first (a WARN here: 320x640 is the smallest phone in use)
    await tab.eval(`(${lib.toString()})()`);
    const H2 = await tab.eval("document.scrollingElement.scrollHeight"),
      seen = new Set();
    for (let y = 0, k = 0; y < H2 && k < 40; y += height, k++) {
      await tab.eval(`window.__cc.scrollTo(${y})`);
      await sleep(350);
      const look = await tab.eval(`window.__cc.phoneLook(${k})`, 60000);
      for (const e of look.errors || []) errors.push(`${w}: ${e}`);
      let shot = null;
      for (const g of look.findings || []) {
        const key = g.check + "|" + g.sel;
        if (seen.has(key)) continue;
        seen.add(key);
        const f = Object.assign(g, { sev: /^fold/.test(g.check) ? "WARN" : g.sev });
        if (n < 6 && f.rects && f.rects.length) {
          shot = shot || (await tab.shot());
          await cropTo(helper, shot, f, look.vw, height, `narrow-${w}-${String(++n).padStart(2, "0")}-${f.check}.jpg`);
        }
        F.push(f);
      }
    }
    await tab.eval("scrollTo(0, 0)");
    await sleep(300);
    const m = await tab.eval(`(${narrowProbe.toString()})()`, 60000);
    for (const o of m.list) {
      const y = o.fixed ? 0 : Math.max(0, o.top - Math.round(height / 3));
      await tab.eval(`scrollTo(0, ${y})`);
      await sleep(350);
      const sy = await tab.eval("scrollY");
      const f = {
        check: "off-viewport",
        sev: "FAIL",
        id: 0,
        sel: o.sel,
        text: o.text,
        rects: [{ left: o.left, top: o.fixed ? o.top : o.top - sy, width: o.width, height: o.height }],
        msg: `at ${w}px wide it runs ${o.by}px past the screen's ${o.side} edge${m.docW > m.vw + 1 ? ` (the page is ${m.docW}px wide and scrolls sideways)` : " (cut there: the page clips what runs past it)"}`,
      };
      if (m.list.indexOf(o) < 3) {
        const shot = await tab.shot();
        await cropTo(helper, shot, f, m.vw, height, `narrow-${w}-${String(++n).padStart(2, "0")}-off-viewport.jpg`);
      }
      F.push(f);
    }
    if (!m.list.length && m.docW > m.vw + 1)
      F.push({
        check: "off-viewport",
        sev: "FAIL",
        id: 0,
        sel: "(the page)",
        text: "",
        rects: [],
        msg: `the page is ${m.docW}px wide on a ${m.vw}px screen and scrolls sideways`,
      });
  } catch (e) {
    lose(errors, "narrow", e);
  } finally {
    await tab.close();
  }
  return { width: w, height, errors, findings: F.map(f => clean(Object.assign(f, { width: w }))) };
}
async function runSweep(cdp, helper, main) {
  const told = new Map(),
    out = [],
    errors = [],
    widths = [],
    lostAt = [];
  const mainKeys = new Set(main.flatMap(w => w.findings.map(f => f.check + "|" + f.sel)));
  let n = 0;
  for (const w of SWEEP) {
    if (WIDTHS.some(x => Math.abs(x.w - w) <= 8)) continue;
    widths.push(w);
    const r = await sweepWidth(cdp, w);
    errors.push(...r.errors.map(e => `${w}: ${e}`));
    for (const l of r.errors.lost || []) lostAt.push({ w, l });
    for (const f of r.F.sort(bySev)) {
      const key = f.check + "|" + f.sel;
      if (mainKeys.has(key)) continue; // told at a main width
      if (told.has(key)) {
        told.get(key).also.push(w);
        continue;
      }
      const g = Object.assign(f, { width: w, also: [] });
      told.set(key, g);
      out.push(g);
      if (r.shot && f.rects && f.rects.length)
        await cropTo(helper, r.shot, f, r.vw, r.vh, `sweep-${w}-${String(++n).padStart(2, "0")}-${f.check}.jpg`);
    }
  }
  // a width of the sweep that lost a probe: its checks are partly measured there, never a PASS
  for (const w of widths)
    for (const f of lostFindings(
      lostAt.filter(x => x.w === w).map(x => x.l),
      out.filter(x => x.width === w),
    ))
      out.push(Object.assign(f, { width: w, also: [] }));
  for (const f of out) if (f.also.length) f.msg += ` (also at ${f.also.join(", ")})`;
  return { widths, errors, findings: out.sort(bySev).map(({ also, ...f }) => clean(f)) };
}

// ---------------------------------------------------------------- run
const chrome = await launch(PROFILE);
const report = { page: server ? resolve(target) : url, url, at: new Date().toISOString(), out: outDir, widths: [] };
// --quick reads no scroll stepping and no reveal walk; what the walk itself sees is still told: an IntersectionObserver reveal
// (scroll-reveal), a held section (pinned) and a CSS scroll timeline (scroll-linked)
if (quick)
  report.notChecked = [
    "scroll-linked (stepping)",
    "scroll-reveal (the reveal walk; IntersectionObserver reveals are read)",
    "hover-spill",
    "hidden-visual",
    "loop-pause",
    "forms",
    "reduced-motion",
  ];
if (quick)
  report.notChecked = [
    ...report.notChecked,
    `the dead-IntersectionObserver walk (hidden content is read with scripts off and under reduced motion)`,
    "hover-move",
  ];
if (quick && noHidden) report.notChecked = [...report.notChecked, "hidden-content (--no-hidden)"];
for (const M of MODULES)
  if (modOff(M))
    report.notChecked = [
      ...(report.notChecked || []),
      ...M.checks.map(c => `${c.id} (${MOD_FLAGS.get(M.id).skip ? "--no-" + M.id : "--quick"})`),
    ];
let code = 0,
  cdp = null;
try {
  cdp = chrome.cdp;
  const helper = await Tab.open(cdp, { width: 400, height: 300 });
  await helper.eval(`(${helperLib.toString()})()`);
  for (const [i, w] of WIDTHS.entries()) {
    // a width the browser could not walk (a CDP timeout on a busy machine) is tried once more, then told as not
    // checked: never a row of PASS for a page nobody looked at
    let r = null;
    for (let t = 0; t < 2 && !(r && r.screens > 0); t++) {
      if (t) {
        console.error(
          `consistency: ${w.w}px gave ${r ? r.errors[0] || "no screens" : "an error"}; trying it once more`,
        );
        await sleep(5000);
      }
      try {
        r = await runWidth(cdp, helper, w, i === 0);
      } catch (e) {
        r = {
          width: w.w,
          height: w.h || HEIGHTS[w.w] || (w.w < 700 ? 844 : 900),
          screens: 0,
          held: 0,
          errors: [e.message],
          findings: [],
          glAsked: 0,
        };
      }
    }
    if (!(r.screens > 0)) r.failed = true;
    report.widths.push(r);
    // gl-fallback: once, at the first width, on a page that asks for WebGL
    if (i === 0 && report.widths[0].glAsked && !noGlFail) {
      const g = await glFallbackPass(cdp, helper, w);
      report.widths[0].findings.push(...g.F.map(clean));
      takeErrors(report.widths[0].errors, g.errors);
      report.glFallback = { hosts: g.hosts, asked: g.asked, empty: g.F.length };
    }
    // reduced motion: once, at the first width (skipped with --quick or --no-reduced)
    if (i === 0 && noReduced && !quick)
      report.notChecked = [...(report.notChecked || []), "reduced-motion (--no-reduced)"];
    if (i === 0 && !quick && !noReduced && report.widths[0].screens > 0) {
      const g = await reducedPass(cdp, helper, w);
      report.widths[0].findings.push(...g.F.map(clean));
      takeErrors(report.widths[0].errors, g.errors);
      report.reduced = { screens: g.read, notRead: g.missed };
      // a pass that read no screen, or under half of them, says so: never a PASS for screens nobody looked at
      if (!g.read || g.missed > g.read)
        report.notChecked = [
          ...(report.notChecked || []),
          `reduced-motion (${g.read} of ${g.read + g.missed} screens read)`,
        ];
    }
    // content hidden until a script reveals it: once, at the first width, with an IntersectionObserver that never calls
    // back (skipped with --quick or --no-hidden)
    if (i === 0 && noHidden && !quick)
      report.notChecked = [...(report.notChecked || []), "hidden-content (--no-hidden)"];
    if (i === 0 && !quick && !noHidden && r.screens > 0) {
      const g = await deadIoPass(cdp, helper, w);
      r.findings.push(...g.F.map(clean));
      takeErrors(r.errors, g.errors);
      report.hidden = { screens: g.read };
    }
    // --quick (the gate's mode) still reads what stays hidden: once, at the first width, with scripts switched off and
    // under reduced motion (motion.md: without script and under reduced motion nothing stays hidden); about one page load each
    if (i === 0 && quick && !noHidden && r.screens > 0) {
      const a = await hiddenWalk(cdp, helper, w, "nojs");
      const b =
        noReduced ?
          { F: [], errors: [], read: 0 }
        : await hiddenWalk(cdp, helper, w, "reduced", new Set(a.F.map(f => f.sel)));
      r.findings.push(...a.F.map(clean), ...b.F.map(clean));
      takeErrors(r.errors, a.errors);
      takeErrors(r.errors, b.errors);
      report.hidden = { screens: a.read + b.read, quick: true };
    }
    // the blocks that open their own tab: at the first width unless their when() says otherwise
    for (const M of MODULES) {
      if (M.phase !== "pass" || modOff(M) || !(r.screens > 0)) continue;
      const ph = w.h || HEIGHTS[w.w] || (w.w < 700 ? 844 : 900),
        mob = w.w < 700;
      const pctx = {
        cdp,
        helper,
        url,
        width: w.w,
        height: ph,
        mobile: mob,
        first: i === 0,
        quick,
        type: TYPE,
        typeFlag: TYPE_FLAG,
        kind: KIND,
        flags: MOD_FLAGS.get(M.id),
        buildPlan: BUILD_PLAN,
        outDir,
        sleep,
        errors: r.errors,
        safe: (name, fn) => safe2(r.errors, name, fn),
        waitReady,
        notChecked: (ids, why) => {
          report.notChecked = [...(report.notChecked || []), ...ids.map(c => `${c} (${why})`)];
        },
        openTab: (o = {}) => Tab.open(cdp, { width: w.w, height: ph, mobile: mob, ...o }),
        loadLib: tab => tab.eval(`(${lib.toString()})()`),
        crop: (shot, f, name) => cropTo(helper, shot, f, w.w, ph, name),
        log: (...a) => {
          if (process.env.CC_TIMING) console.error(`  [${w.w}] ${M.id}:`, ...a);
        },
      };
      if (M.when ? !M.when(pctx) : i !== 0) continue;
      let got = (await pctx.safe(M.id, () => M.run(pctx))) || [];
      // a hero taller or shorter than the screen (SR-1 T1) is the fault: its rows past the content line (T4) follow from it
      if (got.some(f => f.check === "hero-screen" && f.rule === "SR-1 T1"))
        got = got.filter(f => !(f.check === "hero-screen" && f.rule === "SR-1 T4"));
      r.findings.push(...got.map(clean));
    }
    // a phone over a slow mobile line: once, at the first phone width (skipped with --quick or --no-slow)
    if (w.w < 700 && !quick && !noSlow && !report.slow && r.screens > 0) {
      const g = await slowPass(cdp, helper);
      r.findings.push(...g.F.map(clean));
      takeErrors(r.errors, g.errors);
      report.slow = { stops: g.stops, late: g.F.length };
    }
  }
  // a block whose when() takes no width of this run (rhythm at --widths 1280,768, tiles with no 1440 or phone width): not checked, never PASS
  for (const M of MODULES)
    if (
      !modOff(M)
      && M.when
      && !WIDTHS.some((w, i) =>
        M.when({
          width: w.w,
          height: w.h || HEIGHTS[w.w] || (w.w < 700 ? 844 : 900),
          mobile: w.w < 700,
          first: i === 0,
          quick,
          flags: MOD_FLAGS.get(M.id),
          buildPlan: BUILD_PLAN,
        }),
      )
    )
      report.notChecked = [
        ...(report.notChecked || []),
        ...M.checks.map(c => `${c.id} (${M.id}: no width of this run is one it runs at)`),
      ];
  // a probe that timed out or threw at a width: the checks it feeds read WARN there ("partly measured"), never PASS
  for (const r of report.widths) if (r.screens > 0) r.findings.push(...lostFindings(r.errors.lost, r.findings));
  if (!noSweep) report.sweep = await runSweep(cdp, helper, report.widths);
  if (NARROW) report.narrow = await narrowPass(cdp, helper, NARROW);
  else if (!has("no-narrow"))
    report.notChecked = [...(report.notChecked || []), "off-viewport at 320 (no phone width in --widths)"];
  if (!WIDTHS.some(w => w.w <= 600))
    report.notChecked = [
      ...(report.notChecked || []),
      "collide (a phone width: --widths with 390)",
      "tap-size (a phone width: --widths with 390)",
    ];
} catch (e) {
  console.error("consistency: " + e.message);
  code = 2;
} finally {
  try {
    await cdp?.send("Browser.close", {}, undefined, 3000);
  } catch {}
  await chrome.close();
  server?.close();
}
// widths that could not be walked: the page is not checked there (exit 2, said first and last)
const missed = [
  ...report.widths.filter(w => w.failed).map(w => w.width),
  ...WIDTHS.slice(report.widths.length).map(w => w.w),
];
if (missed.length) {
  report.notCheckedAt = missed;
  if (!code) code = 2;
}
// what caption or empty-visual told at one width is not told again by the visuals block at another (caption reads once)
{
  const all = report.widths.flatMap(w => w.findings);
  for (const w of report.widths) w.findings = w.findings.filter(f => !sameFault(f, all));
}
// Explicit recorded motion can be absent. Never suppress hidden content,
// pause/reduced-motion, keyboard, clipping or overlap findings.
const recordedMotion = BUILD_PLAN ? BUILD_PLAN.contract?.motion || {} : readTaste(TASTE)?.motion || {};
for (const w of report.widths)
  w.findings = w.findings.filter(
    f =>
      !(recordedMotion.moments === 0 && f.check === "moment-none")
      && !(recordedMotion.entrance === "still" && f.check === "hero-enter"),
  );
const lists = [
  ...report.widths.map(w => w.findings),
  report.sweep ? report.sweep.findings : [],
  report.narrow ? report.narrow.findings : [],
];
const fails = lists.reduce((s, l) => s + l.filter(f => f.sev === "FAIL").length, 0);
const warns = lists.reduce((s, l) => s + l.filter(f => f.sev === "WARN").length, 0);
report.counts = { FAIL: fails, WARN: warns };
// every check, with its worst result over all widths
report.checks = {};
for (const c of ORDER) {
  const mine = lists.flat().filter(f => f.check === c);
  const skipped = (report.notChecked || []).some(
    n =>
      n.startsWith(c)
      || (c === "scroll-linked" && /scroll-linked/.test(n))
      || (c === "scroll-reveal" && /scroll-reveal/.test(n))
      || (/^(hover-spill|hidden-visual|loop-pause|forms|reduced-motion)$/.test(c) && n === c),
  );
  report.checks[c] =
    mine.some(f => f.sev === "FAIL") ? "FAIL"
    : mine.length ? "WARN"
    : skipped || missed.length === WIDTHS.length ? "not checked"
    : "PASS";
}
writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 1));
if (asJson) console.log(JSON.stringify(report, null, 1));
else {
  const line = (x, at) =>
    `  ${x.sev.padEnd(4)} ${x.check.padEnd(15)} ${at ? `[${at}] ` : ""}${x.sel}${x.text ? `  "${x.text.slice(0, 40)}"` : ""}\n       ${x.msg}${x.crop ? `  [${x.crop}]` : ""}\n       fix: ${x.fix}`;
  console.log(`consistency  ${report.page}`);
  if (missed.length)
    console.log(
      `NOT CHECKED at ${missed.join(", ")}px: the browser could not walk the page there (see the probe errors); run it again on a quieter machine`,
    );
  if (quick)
    console.log(
      `--quick: not checked: ${report.notChecked.join(", ")}. Still told: IntersectionObserver reveals (scroll-reveal), held sections (pinned) and CSS scroll timelines (scroll-linked); faults inside held or [data-big-scene] sections are WARNs`,
    );
  for (const w of report.widths) {
    const f = w.findings.filter(x => x.sev === "FAIL").length,
      wa = w.findings.length - f;
    console.log(
      `\n${w.width}x${w.height}  ${w.screens} screens${w.held ? `, ${w.held} held section${w.held > 1 ? "s" : ""}` : ""}  ${f} FAIL  ${wa} WARN`,
    );
    for (const x of w.findings) console.log(line(x));
    for (const e of w.errors) console.log(`  (probe error) ${e}`);
  }
  if (report.sweep) {
    const f = report.sweep.findings.filter(x => x.sev === "FAIL").length,
      wa = report.sweep.findings.length - f;
    console.log(`\nfirst screen at ${report.sweep.widths.join(", ")}  ${f} FAIL  ${wa} WARN`);
    for (const x of report.sweep.findings) console.log(line(x, x.width));
    for (const e of report.sweep.errors) console.log(`  (probe error) ${e}`);
  }
  if (report.narrow) {
    const f = report.narrow.findings.filter(x => x.sev === "FAIL").length;
    console.log(
      `\nthe page at ${report.narrow.width}x${report.narrow.height}, walked for what runs past the screen's edge  ${f} FAIL`,
    );
    for (const x of report.narrow.findings) console.log(line(x, x.width));
    for (const e of report.narrow.errors) console.log(`  (probe error) ${e}`);
  }
  console.log("\nchecks");
  const cols = Object.entries(report.checks).map(([c, v]) => `${v === "not checked" ? "SKIP" : v.padEnd(4)} ${c}`);
  for (let i = 0; i < cols.length; i += 3)
    console.log(
      "  "
        + cols
          .slice(i, i + 3)
          .map(x => x.padEnd(28))
          .join(""),
    );
  console.log(
    `\ntotal  ${fails} FAIL  ${warns} WARN${missed.length ? `  INCOMPLETE: not checked at ${missed.join(", ")}px` : ""}  (crops and report.json in ${outDir})`,
  );
}
process.exit(code || (fails ? 1 : 0));
