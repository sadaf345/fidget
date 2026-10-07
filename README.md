# fidget

Something for your hands. A haptic fidget app for iPhone, built for redirecting restless hands: stimming, skin picking, scalp picking.

**Feel** — full-screen sensations, one tap from home:
- **Pick**: feel across a skin-like surface for rough spots (tiny clicks under your finger), rest on a flake to catch its edge, and pull. Tension builds and it snags, then tears free. Half-pulled flakes stay lifted, new ones keep surfacing, and the surface comes in seven tones.
- **Pop**: a rainbow pop-it. Press or drag across bubbles; when they're all popped the sheet flips over.
- **Charge**: hold to build a vibration to its climax. Circle clockwise to wind it faster, counter-clockwise to hold it off. Keep holding to go again, with each repeat hitting harder.
- **Spin**: a fidget spinner with long coasting momentum, live RPM, and your best.

**Build** — boards of tactile widgets (charge button, dial, scroll strip, swipe pad, drawn slider lines) you arrange, save and come back to.

Built with Expo (SDK 57) + React Native + Expo Router + TypeScript. Bundle ID `com.rai.fidget`.

## Run it on your iPhone (day-to-day)

One-time: install **Expo Go** from the App Store.

```bash
npm install        # first time, or after pulling changes to package.json
npm start          # prints a QR code
```

Scan the QR code with the iPhone Camera app and it opens in Expo Go. Your phone and Mac must be on the same Wi-Fi network. If they can't be, run `npm run start:tunnel`.

Every saved code change reloads on the phone within a second or two. Shake the phone to open the dev menu.

> Haptics only exist on a real iPhone. The simulator and the web preview (`npm run web`) show layout but don't vibrate.

## Ship a build to TestFlight

```bash
npm run testflight
```

This builds the app in Expo's cloud (EAS Build), uploads it to App Store Connect, and submits it to TestFlight. Expect about 20–40 minutes, then it appears in the TestFlight app on your phone. Build numbers increment automatically.

One-time setup:
1. Create a free account at https://expo.dev.
2. `npx eas-cli@latest login`, then `npx eas-cli@latest init` (links this repo to an EAS project).
3. The first `npm run testflight` asks you to sign in with your Apple Developer account so EAS can manage signing certificates. Answer yes to letting it generate them.

If App Store Connect rejects the upload because the build number was already used (by an earlier Rork build), run `npx eas-cli@latest build:version:set` and enter a number higher than the last build in TestFlight.

## Checks

```bash
npm run check      # typecheck + lint + unit tests
```

Run this before every commit. Unit tests live in `lib/__tests__/`.

## Project layout

```
app/                  Screens (Expo Router: file name = route)
  index.tsx           Home: Feel tiles + Build rows
  pick.tsx            Pick (skin picking)
  pop.tsx             Pop (pop-it)
  charge.tsx          Charge (hold to climax)
  spin.tsx            Spin (fidget spinner)
  playground.tsx      Free-form sandbox board (persisted)
  create.tsx          Build a new board, then name and save it
  my-widgets.tsx      List of saved boards
  fidget/[id].tsx     Open and edit one saved board (autosaves)
  haptics.tsx         Haptics Lab: try every iOS haptic
components/
  widgets/            Board widgets + WidgetWrapper (drag/rotate/pinch in edit mode)
  ChargeOrb.tsx       The charge button visuals (board widget and Charge screen)
  GlassShatter.tsx    Glass-break effect used in the Haptics Lab
  SensationHeader.tsx Floating back button + title for the Feel screens
hooks/
  useCharge.ts        Charge gesture + haptics engine
  useStat.ts          Lifetime stats (flakes picked, best RPM...) and small preferences
contexts/             Board state (one per screen) and the saved-boards list
lib/                  Pure logic, unit-tested in lib/__tests__/
  haptics.ts          playHaptic() and playSequence(): every vibration goes through here
  rumble.ts           "Continuous" vibration built from taps (swap point for Core Haptics)
  charge.ts pick.ts pop.ts spin.ts board.ts   Rules for each sensation and the boards
scripts/screenshot.mjs  Screenshot the web preview at phone size (for checking layout)
```

Data is stored on-device only (AsyncStorage). The storage keys are the same ones the original build used, so existing boards keep working.
