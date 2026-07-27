# THE LONG BEFORE — Episode 01 · Midjourney Shot List
## "Göbekli Tepe: The Temple That Rewrote Human History"

**Companion to:** `the-long-before-01-gobekli-tepe.md` (script)
**Totals:** 40 Midjourney images · 2 Google Earth Studio maps · 2 design assets (Ladder graphic, end screen) · 5 hero video shots · ~8 ambient animations · everything else Ken Burns.

---

## 1. The prompt system

**Base string (never varies except the two slots):**

```
cinematic documentary illustration, {SUBJECT}, painterly realism, {LIGHTING},
volumetric dust, muted ochre and slate palette, dramatic scale contrast,
35mm framing, no text --ar 16:9
```

**Lighting slots** (mood varies, palette never does):
- **L1** — golden-hour low sun, long shadows
- **L2** — warm torchlight against deep blue dusk
- **L3** — cold starlight, faint Milky Way
- **L4** — pale dawn light, thin mist
- **L5** — flat overcast morning light

**Batch workflow:**
1. Generate **GT-14 first** (twin central pillars) — it's the style anchor. Rerun until it *is* the channel. Upscale.
2. Use the anchor as a style reference (`--sref <anchor URL>`) on every subsequent prompt so all 40 images share one visual DNA.
3. Four variants per prompt, upscale the best, log the seed in the Notion board.
4. File naming: `GT-##-slug.png` matching the IDs below.

**QC every image (guardrails):** no garbled text or malformed hands; no anachronisms — **no metal, no wheels, no domesticated cattle/horses, clothing is hides and woven fiber**; no real-person likenesses (archaeologists appear as hands/silhouettes only).

**Motion tiers:** `KB` = Ken Burns in editor (free) · `ANIM` = ambient image-to-video, ~5–6s (Kling, ~$0.10/sec; or Midjourney's own animate) · `HERO` = full generated shot, 6–8s (Veo 3.1 for the cold open/re-hook; Kling for crowd motion).

---

## 2. Shot list by script beat

### COLD OPEN (0:00–0:25)

**GT-01 — The shepherd** · HERO (Veo 3.1: slow push-in, flock drifting, dust)
Covers: "a shepherd walking a dry hillside…"
SUBJECT: `a lone shepherd and small flock crossing a dry stony hillside in southeastern Turkey, distant plain below` · L1
Vertical 9:16 variant needed (clip hook).

**GT-02 — The stone in the soil** · ANIM (dust drift)
Covers: "…notices a worked stone edge breaking through the soil"
SUBJECT: `close view of a carved limestone edge protruding from cracked dry earth, scattered flint chips` · L1

**GT-03 — The survey that missed it** · KB (slow lateral)
Covers: "Archaeologists had surveyed this hill thirty years earlier…"
SUBJECT: `1960s field survey team with notebooks walking past a low grassy mound, seen from a distance` · L5

**GT-04 — What was under their feet** · ANIM (slow reveal glow)
Covers: "They were wrong by more than eleven thousand years."
SUBJECT: `cutaway view beneath a grassy hill revealing buried rings of T-shaped stone pillars in the earth` · L2

**GT-05 — The site revealed** · KB (slow pull-back) or HERO backup
Covers: "…stands the oldest monumental temple ever found"
SUBJECT: `wide aerial of an excavated hilltop sanctuary of nested stone circles and T-shaped pillars` · L4

### THE QUESTION (0:25–0:50)

**GT-06 — The ring at night** · ANIM (torch flicker)
Covers: "One question, then…"
SUBJECT: `stone pillar circle seen from directly above at night, ringed by torches, tiny human figures inside` · L2

### THE PLACE & TIME (0:50–3:00)

**MAP-01 — Orbital push** · Google Earth Studio (not MJ): space → Anatolia → Şanlıurfa → the tell. Channel label style.

**GT-07 — Potbelly Hill** · KB (push-in)
SUBJECT: `a broad artificial mound rising from a golden agricultural plain, lone tree on its crest` · L5

**GT-08 — The world of 9500 BC** · KB (lateral drift)
Covers: "The last ice age has barely ended…"
SUBJECT: `vast thawing steppe at the end of the ice age, meltwater rivers braiding across a green plain` · L4

**GT-09 — Stonehenge comparison** · KB (rise)
SUBJECT: `Stonehenge trilithons at dusk, mist on Salisbury plain` · L2

**GT-10 — Giza comparison** · KB (push)
Covers: the time-gap line
SUBJECT: `the great pyramid of Giza under construction, earthen ramps and distant work gangs` · L1

**GT-11 — The builders** · ANIM (grass sway)
Covers: "The people who built it hunted gazelle…"
SUBJECT: `small band of hunter-gatherers in hide and woven-fiber clothing moving through tall wild grass` · L4

### THE EVIDENCE TOUR (3:00–6:30)

**GT-12 — Tree rings of stone** · ANIM (slow aerial rotate)
Covers: "Stone circles, ten to thirty meters across…"
SUBJECT: `overhead aerial of nested circular stone enclosures in an excavation, concentric like tree rings` · L1

**GT-13 — Wall and bench detail** · KB (lateral)
SUBJECT: `curving dry-stone wall with embedded T-pillars and a carved stone bench, excavation trench` · L1

**GT-14 — THE ANCHOR: twin central pillars** · KB (vertical rise)
Covers: "The tallest stand five and a half meters…"
SUBJECT: `two massive T-shaped limestone pillars standing in a stone circle, a single human figure between them for scale` · L1
**Generate first. This image defines the channel. `--sref` everything else to it.**

**GT-15 — The pillar is a body** · KB (push to the hands)
Covers: "They aren't columns. They're bodies."
SUBJECT: `T-shaped limestone pillar with carved arms, long fingers meeting at a belt, low raking light` · L2

**GT-16 — The quarry** · HERO (Veo 3.1: slow dolly along the stone)
Covers: "…an unfinished pillar nearly seven meters long."
SUBJECT: `an enormous unfinished T-shaped pillar still fused to bedrock in a limestone quarry, lone figure at its foot` · L1
Vertical 9:16 variant needed (clip hook).

**GT-17 — The carved menagerie** · KB (slow pan across reliefs)
Covers: "Foxes. Snakes. Scorpions…"
SUBJECT: `limestone relief carvings of a snarling fox, coiled snakes and a scorpion on a pillar face, raking torchlight` · L2

**GT-18 — The Vulture Stone** · KB (push)
Covers: "[Pillar 43]"
SUBJECT: `tall carved pillar covered in relief symbols, a great vulture with spread wings and a disc above its wing` · L2
Vertical variant useful for shorts.

**GT-19 — Moving the stone** · HERO (Kling: crowd motion, ropes, dust)
Covers: "coordinated crews — hundreds of people…"
SUBJECT: `dozens of workers hauling a colossal T-shaped pillar on log rollers with plant-fiber ropes up a slope, dust rising` · L1
Vertical 9:16 variant needed (this is the 60s TikTok centerpiece).

**GT-20 — The feast** · ANIM (fire flicker)
Covers: "…the ground remembers the feeding"
SUBJECT: `night feast among standing pillars, large gathering around fires, gazelle roasting on spits` · L2

**GT-21 — The oldest beer** · KB (tight push)
Covers: "…limestone basins… brewed grain"
SUBJECT: `large carved limestone basin filled with dark liquid, firelight reflections on the surface` · L2

**GT-22 — Gazelle at dusk** · KB (lateral)
SUBJECT: `gazelle herd moving across a darkening steppe` · L1

**GT-23 — Flint, not metal** · KB (tight)
Covers: "no metal tools — flint"
SUBJECT: `weathered hands knapping a flint blade, stone chips scattered on leather` · L4
QC hands carefully.

### RE-HOOK (~5:45)

**GT-24 — THE BURIAL (money shot)** · HERO (Veo 3.1: figures pouring rubble, dust clouds, slow push)
Covers: "…packed around the pillars until the rings vanished"
SUBJECT: `long line of people with woven baskets pouring earth and rubble into a stone circle, pillars half-buried` · L4
Vertical 9:16 variant needed (clip hook + likely thumbnail source).

**GT-25 — After** · KB (very slow pull-back, hold on silence)
Covers: "The greatest monument on Earth… disappeared"
SUBJECT: `a bare windswept hilltop, one stone tip barely protruding from the grass, empty plain beyond` · L5

### THE THEORIES (6:15–9:30)

**GT-26 — The pilgrimage** · ANIM (converging movement)
Covers: Schmidt's sanctuary thesis
SUBJECT: `aerial of many small bands of travelers converging across a vast plain toward a single hill` · L1

**GT-27 — Cathedral mood** · KB (rise into the light shafts)
SUBJECT: `interior of a stone pillar circle, shafts of dusty light, small figures with raised arms` · L2

**GT-28 — Wild wheat** · KB (tight)
Covers: "feed the festival…"
SUBJECT: `hands stripping seeds from wild wheat into a leather pouch, golden stalks` · L1

**GT-29 — The first fields** · KB (pull-back)
Covers: "The temple built farming."
SUBJECT: `small sown grain plots and reed shelters on a plain below a distant sacred hill` · L4

**GT-30 — The dig today** · KB (tight)
Covers: the honest complication (no likenesses — hands only)
SUBJECT: `an archaeologist's hands with a fine brush revealing a carved animal relief in the soil` · L5

**GT-31 — Water in the rock** · KB (lateral)
Covers: "rainwater channels, cisterns…"
SUBJECT: `rain falling on carved rock-cut channels and a round cistern in a limestone surface` · L5

**GT-32 — Under the Milky Way** · ANIM (star shimmer) 
Covers: "…people exactly like us"
SUBJECT: `ring of T-shaped pillars beneath a brilliant Milky Way, one small campfire` · L3
Vertical variant useful for shorts.

**GT-33 — The production line** · KB (pan)
Covers: the lost-civilization rebuttal
SUBJECT: `hundreds of flint chips and stone tools laid out on an excavation tarp in ordered rows` · L5

### THE LADDER (9:30–11:30)

**LADDER-GFX** — design asset (not MJ): three-rung motif, WE KNOW / RESEARCHERS THINK / SOME SPECULATE, navy/slate with gold rules, plus its sound cue.

**GT-34 — We know** · static hold (let the edit breathe)
SUBJECT: `frontal view of two T-shaped pillars in even museum-like light, neutral background` · L5

**GT-35 — Researchers think** · reuse GT-26 with a new Ken Burns path (log as reuse, not a new generation).

**GT-36 — Some speculate** · KB (drift) — deliberately myth-styled
SUBJECT: `a storm-lashed sea swallowing a distant land, painted like an old myth illustration` · L3
Cut from this directly back to GT-33 (the flint) for the rebuttal — the edit *is* the argument.

**GT-37 — What's still down there** · ANIM (glow pulse)
Covers: "…many more enclosures still inside the hill"
SUBJECT: `ground-penetrating radar visualization, glowing gold outlines of buried stone circles beneath a dark hillside` · L3

**GT-38 — Karahan Tepe** · KB (push)
Covers: the sister sites
SUBJECT: `rock-cut chamber with a forest of carved bedrock pillars and a stern carved human head emerging from the wall` · L2

**MAP-02 — The lost world surfaces** · Google Earth Studio + edit overlays: region map, sister sites lighting up one by one.

### CLOSE (11:30–12:30)

**GT-39 — How little we've seen** · HERO (Veo or long KB pull-out — mirror of GT-01's framing)
Covers: "…most of the letter is still sealed inside the hill"
SUBJECT: `high wide view of a great mound at morning, a small excavated corner of stone circles against the untouched whole` · L4

**GT-40 — Antikythera tease** · KB (slow push)
Covers: next-episode tease
SUBJECT: `a corroded bronze gear mechanism fragment on dark cloth, one warm beam of light` · L2

**END-GFX** — design asset: end screen template (subscribe + next-video card), channel palette.

---

## 3. Vertical (9:16) variants for shorts

Re-generate (don't crop) with `--ar 9:16`: **GT-01, GT-16, GT-19, GT-24, GT-32** (+ GT-18 if the Vulture Stone clip tests well). These five feed the episode's clip plan from the extraction prompt.

## 4. Motion & budget summary

| Tier | Shots | Tool | Est. cost |
|---|---|---|---|
| HERO video (6–8s) | GT-01, GT-16, GT-19, GT-24, GT-39 | Veo 3.1 (Kling for GT-19 crowd) | ~$15–30 |
| Ambient ANIM (~5s) | GT-02, GT-04, GT-06, GT-11, GT-12, GT-20, GT-26, GT-32, GT-37 | Kling 3.0 (~$0.10/s) or MJ animate | ~$5–10 |
| Ken Burns | all remaining stills | editor | $0 |
| Stills | 40 images ≈ 160 generations | Midjourney standard plan | within $30/mo sub |

**Per-episode incremental motion budget: ~$25–45.** If that's tight in month one, ship with GT-24 (the burial) as the only HERO shot — it's the re-hook and the one that earns it — and promote the rest from KB in later episodes.
