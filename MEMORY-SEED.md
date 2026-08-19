# Agent memory seed

Fill in the bullets below. Then run:

```bash
npm run seed-memory
```

Everything you write becomes a memory your agent loads before every conversation.

## How to fill this in

- **Write each fact as a standalone sentence.** It has to make sense with no
  surrounding context, months from now. "kid wears size 11 shoes" — not "size 11".
- **Add as many bullets per section as you want**, or delete sections that don't apply.
  Empty bullets are skipped, so leave anything blank that you don't care about.
- The `_prompts:_` lines are just idea-joggers. Ignore the ones that aren't useful.
- **Section names become tags**, so the agent can tell a kid fact from a household fact.
- Re-running the loader is safe — it skips facts already saved. You can come back
  and add more any time.

## What does NOT belong here

- **Anything with a date or time** → that's a calendar event, not a memory.
  "dentist oct 7" goes on the calendar; "kid hates the dentist" goes here.
- **Passwords, card numbers, account numbers, SSNs.** The agent reads email and web pages
  written by strangers, so treat its memory as something that could leak.
- **Medical details.** Allergies and meds are worth the agent knowing; diagnoses,
  conditions, and history are not.
- **Anything about someone outside the family** that they'd be uncomfortable seeing
  quoted back. Both parents share one memory — either of you may see any of it.

---

## people

_prompts: who does dropoff vs pickup, and on which days · who handles bills, groceries, laundry, trash · who's the default for a sick-kid day · who books appointments · what each of you would rather never be asked to do_

-
-
-

## kids

_prompts: shoe and clothing size · foods they refuse · foods that always work · comfort item · what calms them down · fears · best friends' names · teacher's name · current obsession_

-
-
-

## school

_prompts: teacher's name · uniform vs free dress days · lunch: packed or bought · office phone number · pickup procedure and where to wait · aftercare arrangement · who else can pick them up_

-
-
-

## daycare

_prompts: primary teacher · what to bring and on what cadence (sheets? diapers? change of clothes?) · pickup deadline and late fee · how they communicate (app? paper? email?) · closure patterns_

-
-
-

## household

_prompts: trash and recycling days · yard waste · hvac filter cadence · where the water shutoff is · gate/garage codes (skip if sensitive) · cleaner or gardener and how often · what breaks a lot · what you always run out of_

-
-
-

## pets

_prompts: name, species, breed, age · food brand and amount · vet name and phone · flea/tick med cadence · groomer · who feeds and walks · boarding or sitter when you travel_

-
-
-

## food

_prompts: standing grocery store and delivery service · go-to weeknight dinners · takeout regulars and usual orders · foods nobody will eat · dietary restrictions · coffee situation · what's always on the list_

-
-
-

## medical & providers

_prompts: pharmacy name and location · insurance carrier · parents' own doctors · vision/optometrist · urgent care you'd actually go to · after-hours line for the pediatrician_

-
-
-

## cars & getting around

_prompts: which car each of you drives · mechanic or dealer you use · where registration and insurance live · car seat situation and which car has what · parking rules at school_

-
-
-

## family & friends

_prompts: grandparents — names, where they live, how often they visit · aunts/uncles/cousins · babysitters — names, rates, how to reach · neighbors worth knowing · emergency contacts · close friends with kids the same age_

-
-
-

## routines

_prompts: bedtime routine and target times · screen time rules · weekend rhythm · chores · what mornings look like when they go badly · what you do on a rainy saturday_

-
-
-

## activities

_prompts: current classes and where · what's seasonal vs year-round · signup deadlines that sneak up · what the kids want to try next · what you're not doing again_

-
-
-

## work

_prompts: meeting-heavy days · travel patterns · hours you're heads-down · who covers kid stuff during a crunch · standing commitments (school committees, volunteering?)_

-
-
-

## how the agent should behave

_prompts: what you want nudged about · what you never want nudged about · how blunt to be · things it should always double-check before acting · running lists to keep · anything it did that annoyed you_

-
-
-

## open loops

_prompts: things that always slip through the cracks · stuff you've been meaning to book for months · recurring annoyances you'd like flagged · "we should really..." items_

-
-
-
