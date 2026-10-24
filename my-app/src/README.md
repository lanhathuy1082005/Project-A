# Source structure

This Expo app is being organized around the existing web frontend while keeping
its screens and components native-platform ready.

## Routes

- `app/(auth)/` contains sign-in routes.
- `app/(student)/` contains student home, item, history, and face flows.
- `app/(admin)/` contains the admin dashboard and management flows.
- `app/index.tsx` checks the backend session and routes users to login, student
  home, or the admin dashboard.

Route groups organize the files without adding the group name to the URL.
Student route files are thin wrappers around implementations under
`features/student/`; auth follows the same pattern.

## Shared code

- `api/` contains the API client and endpoint modules corresponding to the
  frontend's auth, reservation, feedback, and admin APIs. Configure
  `EXPO_PUBLIC_API_URL` in a local `.env` file; it is a public URL, not a place
  for credentials.
- `components/ui/` contains small reusable native UI primitives. Components
  specific to a workflow stay under that feature.
- `context/` holds shared authentication state; `hooks/` holds reusable app
  logic.
- `features/` groups screens, hooks, components, and styles by user flow.
- `styles/` and `constants/` hold cross-feature `StyleSheet` definitions and
  shared theme tokens rather than browser CSS.
- `constants/`, `utils/`, and `types/` hold shared values, helpers, and types.
- `assets/` is reserved for app-owned images and other static resources.

The student home displays the recurring weekly timetable and a day-specific
agenda. History uses the backend's active-only `GET /api/reservations/me`
contract and offers return and feedback flows. Borrow and return use
`expo-camera` to scan QR codes, with manual unit-ID entry when camera access is
unavailable. The backend's `GET /api/timetable/me` endpoint supplies the
student's timetable.
