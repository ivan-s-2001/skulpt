# Local-only Skulpt

This branch stores and processes application data on the device. No backend deployment, account, server URL, or service credentials are required.

- SQLite (`skulpt.db`) stores workouts, exercises, sets, measurements, trainers, subscriptions, and work schedules.
- Planning, conflict checks, attendance, and subscription progress run locally.
- Server sync and token acquisition are disabled, even if a sync URL is present in the environment.
- Analytics and remote error reporting are disabled.
- Notification channels and timers remain local; Expo/FCM push tokens are not requested.
- Expo hosted updates and Sentry build uploads are disabled.
- Optional exercise animations and other media may load from the Internet. Core application data and calculations do not depend on them. Existing exercise records are retained; custom exercises can be created locally. This repository does not include the upstream server exercise catalogue.

Install the standalone APK. No server setup is needed. Data survives application restarts and upgrades; uninstalling the app removes its local data.

## Verify

Run lint, TypeScript, and Jest. Boundary tests check that configured server addresses cannot trigger token, push, or pull requests.

After Android prebuild, confirm Expo updates are disabled and `shouldSentryAutoUploadGeneral` is false. Before release, verify a fresh install in airplane mode: create an exercise, add trainers and a work schedule, plan and complete a workout, then relaunch and check persistence.
