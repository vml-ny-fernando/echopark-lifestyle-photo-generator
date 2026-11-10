# EchoPark Scene Studio — design system

How this app looks, which building blocks it is made of, and the rules a UI
change has to follow. Read this before adding or restyling anything under
`src/client/`. Where this file and the code disagree, fix one of them in the
same change.

## 1. Principles

The visual identity is Bauhaus set in the EchoPark palette (Brand Guidelines
v1). It uses flat colour blocks, a strict grid, heavy geometric type and
primary geometry. The photo is still the thing being judged, so all of this
frames it rather than competing with it.

1. **Flat blocks, square corners.** Regions are solid colour fields (white,
   Park Grey) divided by thick ink bars, not cards. All radii are 0. The
   only curves are true circles: avatars and the order badge. There are no soft shadows; a floating surface gets a
   2px Park Grey outline.
2. **Three brand colours, three jobs.**
   - Park Grey is the ink and the dark block.
   - Energy Green marks the action and the selection.
   - Echo Green is the brand mark: the logo, the accent's colour block, focus
     and the active scene.
3. **Brand pairings only.** Use Park Grey or white on Energy Green, white on
   Park Grey, and Park Grey on white. Echo Green is never used for small text
   on white, because it is below AA. Links are ink with an Echo Green
   underline.
4. **Type is the structure.** The logo carries the brand, so there is no page
   headline. Section titles are Parkinsans Bold. Everything else
   is DM Sans.
5. **One brand mark.** The EchoPark logo (`public/echopark-logo.svg`), centred
   at the top at 250px wide (shrinking to fit on a phone), is the only
   decoration on the page. Its wordmark is Park Grey on white; the original
   white-wordmark file is for dark backgrounds only. Don't add shapes elsewhere.
6. **Every choice is visible, with no hidden dropdowns.** Every title,
   heading, button, option and alert title is Title Case ("Generate Scene",
   "Couldn't Load the Cast"), with short words (a, and, or, the, with…)
   lower-case mid-title. Hints, descriptions and error bodies stay sentence
   case. No exclamation marks, and errors name the next step.

## 2. Foundations

Tokens live in `src/client/styles/tokens.css`. Never hard-code a colour in a
component. There are two exceptions:

- The crop-guide chrome over a photo, which is white or black rgba so it
  reads on any image.
- The white mat behind the vehicle studio photos.

| Role            | Token                         | Value |
| --------------- | ----------------------------- | ----- |
| Park Grey       | `--brand-park`, `--bay-text`  | #313D47 (Pantone 432) |
| Echo Green      | `--brand-echo`, `--bay-accent` | #62A60A (Pantone 369); hover #4E8508, text-safe #3F6E05 |
| Energy Green    | `--brand-energy`              | #D1FD50 (Pantone 2297 C) |
| Park Grey 10%   | `--brand-tint`, `--bay-bg-sunken` | #EAECED |
| Ink steps       | `--bay-text-2` → `-4`         | #46525C, #5A6570, #8A949C |
| Canvas, surface | `--bay-bg-canvas`, `--bay-bg-surface` | #FFFFFF |
| Lines           | `--bay-border`, `--bay-border-strong` | #D5DADE, #8A949C |
| Focus           | `--bay-border-focus`          | Echo Green; Energy Green on Park Grey |

- **The Park Grey block:** `data-surface="park"` on an element re-maps every
  role inside it:
  - Text becomes white or a light grey.
  - Surfaces become a lighter grey.
  - The accent and focus become Energy Green.

  The header bar and the stage use it. Components need no dark variant.
  Overlays portal to `body`, so they stay light.
- **Type:**
  - Parkinsans 600–800 is `--brand-font-display`. It is used for `h1`–`h3`,
    the header title and the primary button.
  - DM Sans 400–700 is `--bay-font-sans`, for everything else.
  - Both are self-hosted via `@fontsource` (imported in `main.tsx`).
  - Section title: 18px/700, −0.02em.
  - Field label: 13px/700.
  - Body: 14px. Secondary text: 13px.
  - No all-caps labels.
- **Theme:** light only. `index.html` pins `data-theme="light"`.

## 3. Layout

- **`AppShell`:** a 56px Park Grey header bar spans the full width. Below it,
  main is capped at 1280.
- **Logo:** centred at the top of main, 250px wide, `max-width: 100%`, with
  the one-sentence brief centred under it. There is no headline.
- **Workspace:** a two-column grid (`App.module.css`).
  - **Left (440px), the brief:** Scenario → Cast → Echo Green accent →
    Vehicle → Photography → Direction notes. Scenario comes first because
    it decides how many cast members to pick.
    - Each `Section` opens with a 3px ink bar, the grid line that carries
      the page.
    - `GenerateBar` is sticky at the bottom.
  - **Right, the stage:** a sticky, flat Park Grey block with 28px padding.
    It holds the preview with crop guides, then the scene library.
- **Below 900px:** one column, with the stage below the brief.

## 4. Building blocks

### 4.1 Controls: `src/client/ui/`

Built on `react-aria-components`, each with a sibling `.module.css`. **Only
this directory imports `react-aria-components`.**

| Component                       | Use it for                                     | Notes |
| ------------------------------- | ---------------------------------------------- | ----- |
| `Button`                        | Every clickable action                         | `primary` = Energy Green block, Park Grey Parkinsans type and outline, inverting on hover (one per view); `default` = 2px ink outline, fills on hover; `ghost`. `size` `md` / `sm`; `icon`, `loading` |
| `RichSelect`                    | A single choice whose options need more than a label (Scenario, Vehicle) | Full-width dropdown. The trigger is a 2px ink box showing the current pick; rows carry an optional 4:3 picture, a title (`size="lg"`: Parkinsans 13.5/700 headline), a description and a right-aligned `aside` (with `asideLabel` for screen readers). Each section opens with a full-width Park Grey band naming the category in Energy Green Parkinsans, and its options are indented 16px under it. The selected row gets an Energy Green leading bar and a check. Arrow keys, typeahead, Enter, Escape |
| `ChoiceGroup`                   | Single-select brief options                    | Square tiles. `wide` makes a grid showing each option's hint. `pictures` puts each option's `image` (4:3, contained on white) above its label. Arrow keys move. Selected tiles fill solid ink with an Energy Green bar: on the leading edge, or under the photo for pictures |
| `ToggleTile`, `ActionTile`      | Cast cards (toggle) | Edit button lives beside the toggle, never nested |
| `Dialog`                        | Modal surfaces: character editor, prompt, lightbox | `size` `md` 480 / `lg` 720 / `full`; `dismissable={false}` while there are unsaved edits; Escape closes |
| `TextInput`, `TextArea`         | Text                                           | `label` or `aria-label` required |
| `Alert`                         | Inline outcome next to what failed             | `tone` error / warning / info / success |
| `SkeletonText`, `SkeletonBlock` | Loading                                        | Shaped like the content |
| `Text`, `TextLink`              | Secondary copy and links                       | |
| `SlotSlider`                    | A setting with a few ordered steps (Resolution) | Native range input under the hood; snaps to slots, labels under the track are clickable, arrow keys move |
| `EmptyState`, `PageHeader`      | Empty regions; a page title row (unused now)   | |
| `ImagePlaceholder`              | The preview before any scene exists            | Uses the master frame's aspect ratio |
| `ConsentPrompt`, `UserMenu`, `Avatar`, `ErrorBoundary` | As in the starter      | |

From `@runway/bay-react`:

- `SignInPrompt` renders on a sign-in requirement.
- `OutOfCreditsPrompt` renders on a billing refusal.

Both are rendered by `stage/ErrorNotice.tsx` and `cast/MutationError.tsx`.

### 4.2 Icons

These come from `lucide-react` only, with an explicit `size`. The ones in use:

- `Sparkles`: generate
- `UserPlus`: add character
- `Pencil`: edit
- `Check`: selected
- `Download`
- `Maximize2`: open full size
- `RotateCcw`: reuse settings
- `ChevronLeft` and `ChevronRight`: the lightbox
- `X`: close or remove
- `Baby`: who a scenario calls for (with the drawn figures and the solid
  paw print for a dog in
  `brief/FigureIcons.tsx`, since lucide has no full-height man or woman)
- `ChevronDown`: the dropdowns

No emoji anywhere.

## 5. Rules

- CSS modules and tokens only.
- On react-aria controls, use react-aria data attributes (`[data-selected]`,
  `[data-hovered]`, `[data-focus-visible]`) rather than `:hover`.
- Anything that waits on the server shows a loader for its whole duration.
  The generate button shows `loading`, and the preview shows a skeleton at
  the frame ratio with "Generating…" and the elapsed time.
- Destructive actions confirm inline: deleting a character, deleting a scene
  and discarding edits.
- Media is always referenced as `/media/<key>`, never a presigned URL. Grid
  thumbnails use `loading="lazy"`.

## 6. Surfaces

### Scene builder (`src/client/App.tsx`), the only page

- **Cast (`cast/CastPicker.tsx`):**
  - One row per group, in this order: Males, Females, Pets, Experience
    Guides (then Other for a label that fits none). Each row is titled with
    its count and holds a 4-column grid (3 below 420px) of square-cornered
    portrait cards. Each card is a toggle, and up to 3 can be selected in
    total.
  - The section description says how many to pick for the chosen scenario
    (`castInstruction`, `castWanted`: its roles, capped at 3), e.g. "Front
    Yard Catch is written for a man and a child. Pick up to two characters…".
    Above the rows a meter shows one ink-outlined square per role, filled
    Energy Green as each is picked, with "1 of 2 picked" beside it.
  - Cards show the portrait and the file label only (Female30A, MaleTeenA,
    DogB, GuideF30A), never a human name or the description. The group and
    age come from the label (`castGroup`, `castAge`, `compareCast` in
    `src/shared/scene.ts`): rows sort youngest first (Teen before 20), then
    alphabetically.
  - A selected card gets a 3px ink frame and an Energy Green circle badge
    showing its selection order.
  - An "Add Character" button follows the rows. The grid has skeleton tiles while
    loading and an empty state for the first run.
  - The library holds the brand team's approved characters (20 at last
    count, two of them dogs). Each
    one has a cropped hero portrait (the card photo) followed by the full
    character sheet as a second reference.
  - `cast/CharacterDialog.tsx` creates and edits a character: name, look, and
    1–3 reference photos that upload directly to storage. The description
    stays in the data and feeds the prompt; pets are described as animals. Delete is
    confirmed inline.
- **Vehicle:** a `RichSelect` dropdown, one row per vehicle in the
  approved line-up (`VEHICLES` in `src/shared/scene.ts`). The closed
  dropdown and each row show the studio thumbnail (`vehicles/<id>-thumb.jpg`,
  a single front or rear 3/4 view, never a multi-view sheet), the title
  ("Sedan, Silver") and a one-line `description`. The
  full photo (`vehicles/<id>.jpg`) goes to the model as the `@vehicle`
  reference, and the prompt keeps its design while stripping badges and
  plates.
- **Scenario (`brief/ScenarioPicker.tsx`):** the brand team's 25 vehicle-led
  moments (`SCENARIOS` in `src/shared/scene.ts`) as one full-width
  `RichSelect` (`size="lg"`), in sections On the Road, Outdoors and Weekends,
  Family Life, At EchoPark, and Your Own. Each row is a bold Parkinsans
  headline, the hint as its sub-headline, and, aligned right, full-height
  icons for who the brief calls for with a count beside each (`who` on each
  scenario, `brief/FigureIcons.tsx`): a man, a woman, a figure the brief
  doesn't gender, a shorter child, `Baby`, a solid paw print for a dog, and a badge-wearing figure
  for an Experience Guide. Screen readers get the same in words
  (`figurePhrase`). Write Your Own opens a text area of up to 400
  characters under the dropdown (`scenario: 'custom'`, `scenarioCustom`);
  the picked vehicle is always kept in that moment, and Generate waits
  until it is written. Every scenario keeps the car in the moment, and
  picking one also selects its closest vehicle (and light, where the moment
  needs it), both still editable. Retired scenarios live in
  `SCENARIO_LABELS` only so older library scenes keep their names.
- **Cast wins:** picked cast members always play the lead roles. The
  scenario keeps its action, setting and car, and each role (relationship,
  gender, age) adapts to whoever plays it, never the other way round
  (`buildPrompt`). New people fill only the roles the cast leaves open. When
  the cast doesn't match who the scenario is written for (`castDiffers`),
  the generate bar says so above the button: "Front Yard Catch is written
  for a man and a child. Your cast (two women) will play it…".
- **Other brief sections:** `ChoiceGroup` chips, with 21px between the settings inside Photography. The accent section's
  description sets "#62A60A" in Park Grey on an Echo Green block (no separate
  swatch). Its last chip, Other, opens a text field for what should be Echo
  Green (80 characters); Generate waits until it is filled in. There is no frame
  picker: every new scene is 16:9 (older 3:2 and 4:5 scenes still show at
  their own ratio). Resolution is a `SlotSlider` with slots 1K, 2K (default)
  and 4K.
- **No text, no badges:** the prompt forbids readable text, maker emblems
  (grille, wheel centre caps, steering wheel), lettered key fobs, printed
  clothing and signage, and the scenario briefs avoid props that invite text.
- **Generate bar (`stage/GenerateBar.tsx`):**
  - A summary of the shot and a full-width primary "Generate Scene" button.
    Ctrl/⌘+Enter also generates.
  - "View Prompt" opens the compiled prompt.
  - Errors appear directly above the button: sign in, credits, consent, a
    plan block, or a plain error.
- **Stage (`stage/Stage.tsx`):** sits on the Park Grey block, so its
  section bars, titles and controls render inverted.
- **Stage, preview:**
  - Shows a placeholder, then a generating skeleton with the elapsed time,
    then the result with dashed 1:1 / 4:5 / 9:16 crop guides (toggleable).
  - Actions: download, open full size, reuse settings.
  - A failed scene shows its reason and "Try Again".
  - Brand check (`stage/BrandCheck.tsx`): every finished scene gets a
    Gemini vision pass (1 credit) for maker badges, readable or garbled text
    and a car that drifted from the reference. It shows "Checking…", then a
    passed line, or a warning Alert listing what it found with "Generate a
    New Take". A check that can't run says so and asks for a check by eye.
- **Stage, scene library:**
  - The team's shared history as a grid of 16:9 thumbnails. Pending and failed tiles
    show their state, flagged scenes carry a "Flagged" tag, and the active
    scene has a 3px Energy Green frame.
  - A scenario filter and search appear past 6 scenes, with "Show More"
    paging.
  - The full-size lightbox steps through scenes with the arrow keys and
    offers download and delete (confirmed).

## 7. Checklist for a UI change

- [ ] Built from `ui/` and `layouts/`, with nothing new installed.
- [ ] Styles are in a `.module.css` and use tokens, with no `:hover` on aria
      controls.
- [ ] Icons from lucide with an explicit `size`, and icon-only controls are
      labelled. No emoji.
- [ ] Loading, empty and error states exist.
- [ ] Works from the keyboard.
- [ ] This file still describes the app.
