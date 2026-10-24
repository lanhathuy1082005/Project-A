# my-app

An Expo Router application with a session-aware startup route and a basic
password login screen.

## Start developing

```bash
npm install
```

Before starting the app, create a local `.env` file from `.env.example` and set
`EXPO_PUBLIC_API_URL` to a backend URL reachable from the app. For a physical
device, `localhost` refers to the device itself; use the development machine's
LAN address instead. Expo Web must also be allowed by the backend's CORS
configuration.

```bash
Copy-Item .env.example .env
# Edit .env to set EXPO_PUBLIC_API_URL, then run:
npm start
```

The development server starts with Expo. Open the app in a development build,
an emulator, or a browser using the options shown in the terminal.

## Project structure

- `src/app/` contains thin Expo Router routes and layouts.
- `src/features/` contains flow-specific screens, components, hooks, and styles.
- `src/components/ui/` contains small reusable UI primitives.
- `src/api/` and `src/context/` contain API and authentication state.
- `src/styles/` and `src/constants/` contain shared styling and values.

The root route checks the backend session and routes signed-out users to
`/login`, students to `/home`, and admins to `/dashboard`. The student home
shows a weekly timetable with a selected-day agenda. Students can scan item QR
codes to borrow or return items; manual item ID entry is available if camera
access is unavailable. History lists active reservations and supports item
returns and post-return feedback. Admin routes remain available as placeholders.

## Useful commands

```bash
npm run android
npm run ios
npm run web
npm run lint
npx tsc --noEmit
```
