# fidgetr

Something for your hands. A haptic fidget app for iPhone, built for redirecting restless hands: stimming, skin picking, scalp picking.

21 toys in six groups, each with its own intensity, Discreet mode and quick-launch link (the gear on its screen):

| Group | Toys |
| --- | --- |
| Pick & peel | Pick (feel for flakes, peel them off), Peel (screen film, masking tape), Loose thread, Scratch-off |
| Click | Pop, Switch tester (Blue, Brown, Red, Topre), Pen click, Toggle wall, Tally counter |
| Drag & spin | Spin, Ratchet dial, Zipper, Texture rub (corduroy, sandpaper, stone) |
| Squish & hold | Charge (hold to a climax, wind to build, combos), Slime, Purring cat, Stress ball |
| Shake & tilt | Shake (marbles in a jar), Snow globe |
| Calm | Breathe (box, 4-7-8), Heartbeat (50-80 bpm) |

Also: **Favorites** (long-press a toy), **Settings** (global intensity, Discreet mode), **Haptics Lab** (every system haptic, plus custom intensity/sharpness and a pattern recorder whose patterns can replace the tap on the four tap toys), **Boards** (arrange widgets on a free-form board and save it), and **quick launch** links (`fidgetr://pick` and so on; the older `fidget://` links still work) for Shortcuts, the Action Button and Control Center.

No accounts, ads, analytics or network calls; everything stays on the phone.

Built with Expo (SDK 57) + React Native + Expo Router + TypeScript. Bundle ID `com.rai.fidget`: the app is called fidgetr, but identifiers that can't change (bundle ID, EAS project, repo, storage keys) keep "fidget".

## Run it on your iPhone (day-to-day)

The app has its own development build: our version of Expo Go with the native haptics engine (Core Haptics, through `react-native-pulsar`) built in. That's what gives Charge, Pick and Spin their continuous rumble. Code changes still reload live on the phone.

```bash
npm install        # first time, or after pulling changes to package.json
npm start          # prints a QR code
```

Scan the QR code with the iPhone Camera app and it opens in the **fidgetr** development build (called "fidget" on builds made before the rename). Your phone and Mac must be on the same Wi-Fi network; if they can't be, run `npm run start:tunnel`. Every saved change reloads within a second or two. Shake the phone for the dev menu.

To check which engine is running, open **Haptics Lab**: the Continuous section shows a Rumble Pad in the development build and a "Rich haptics: off" note in Expo Go.

### One-time: install the development build

The Expo account is already linked (`@sadafc/fidget`). Then:

1. **Register your iPhone:** `npm run register-device`. Open the link it prints on the iPhone and install the profile it offers.
2. **Turn on Developer Mode** on the iPhone: Settings > Privacy & Security > Developer Mode, then restart when asked.
3. **Build it:** `npm run build:dev`. The first time, sign in with your Apple Developer account and let EAS create the signing certificates. The build runs in Expo's cloud (about 15–30 minutes).
4. **Install it:** open the link or QR code from the finished build on the iPhone.

Rebuild (`npm run build:dev`) only when native code changes: new libraries with native parts, an Expo SDK upgrade, or `app.json` changes. Everyday code changes don't need a rebuild. Native libraries so far: `react-native-pulsar` (Core Haptics) and `expo-sensors` (Shake's accelerometer).

### Without the development build

`npm run start:go` opens the app in **Expo Go** instead. Everything works, but vibrations fall back to discrete taps.

> Haptics only exist on a real iPhone. The web preview (`npm run web`) shows layout but doesn't vibrate.

## Ship a build to TestFlight

```bash
npm run testflight
```

This builds the app in Expo's cloud (EAS Build), uploads it to App Store Connect, and submits it to TestFlight, with Core Haptics included. Expect about 20–40 minutes, then it appears in the TestFlight app. Build numbers increment automatically.

If App Store Connect rejects the upload because the build number was already used (by an earlier Rork build), run `npx eas-cli@latest build:version:set` and enter a number higher than the last build in TestFlight.

## Checks

```bash
npm run check      # typecheck + lint + unit tests
```

Run this before every commit. Unit tests live in `lib/__tests__/`.

## Project layout

```
app/                    One file per screen (Expo Router: file name = route)
  index.tsx             Home: favorites + toy grid by category, boards, Haptics Lab
  pick.tsx ... snow.tsx One file per toy; each renders <ToyChrome toyId="..."> last
  settings.tsx          Global intensity, Discreet mode
  haptics.tsx           Haptics Lab
  playground.tsx, create.tsx, my-widgets.tsx, fidget/[id].tsx   Boards
  +native-intent.tsx    Quick-launch links -> toy routes
constants/toys.tsx      The toy registry: title, line, color, category, icon. Add a toy here.
components/
  ToyChrome.tsx         Header, gear sheet (intensity, Discreet, options, tap pattern, quick launch), Discreet layer
  CustomLab.tsx         Haptics Lab custom haptics and pattern recorder
  ui/                   Slider, Segmented
  widgets/              Board widgets + WidgetWrapper
contexts/
  SettingsContext.tsx   Intensities, Discreet, favorites, toy options, saved patterns (persisted)
  FidgetContext.tsx     One board's widgets + undo; SavedFidgetContext: saved boards
hooks/                  useCharge, useStat (lifetime counts), useTapFeel, useReducedMotion
lib/                    Pure logic, unit-tested in lib/__tests__/
  haptics.ts            THE haptics service: system taps, transient/continuous, patterns
  coreHaptics.tsx       Core Haptics via react-native-pulsar, when the native module exists
  hapticState.ts        Intensity multipliers, active toy, stop-everything
  rumble.ts             Build-up vibration for Charge and Pick
  motion.ts             Accelerometer (guarded for builds without it)
  charge pick pop peel thread scratch slime squish zipper spin rattle snow breathe glass patterns board links
scripts/screenshot.mjs  Screenshot the web preview at phone size
scripts/icon.mjs        Draws the app icon and exports icon, splash, Android and favicon PNGs
```

Data is stored on-device only (AsyncStorage). The storage keys are the same ones the original build used, so existing boards keep working.
