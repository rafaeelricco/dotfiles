# IMP-1342 Native OS Camera Media Capture

## Summary

Use installed `expo-image-picker` for OS-native camera and gallery UI. No backend/web changes. Existing venue survey submit shape stays unchanged: media still flows through `photos` object keys into current review/save/check-out/post flow.

## Files / Locations

- `app/mobile/app.json:77` and `app/mobile/app.json:85` — enable microphone permission strings for `expo-camera` / `expo-image-picker`.
- `app/mobile/ios/HEMS20/Info.plist:60` — add `NSMicrophoneUsageDescription` because native iOS project is checked in.
- `app/mobile/android/app/src/main/AndroidManifest.xml:7` — stop removing `RECORD_AUDIO` so Android video audio works.
- `app/mobile/src/app/(auth)/permissions.tsx:31` and `app/mobile/src/app/(auth)/permissions.tsx:64` — update setup permission flow/copy to request camera + microphone together.
- `app/mobile/src/app/(tabs)/settings/index.tsx:79` — update permission copy from camera-only to camera/microphone.
- `app/mobile/src/lib/activity/capture.ts:97` — replace image-only upload helper with media upload helper that keeps existing S3/public asset flow but uses correct file extension/MIME.
- `app/mobile/src/app/(tabs)/activities/[activityId]/venue-intelligence.tsx:5` — replace custom `expo-camera` preview imports with `expo-image-picker` OS camera flow.
- `app/mobile/src/app/(tabs)/activities/[activityId]/venue-intelligence.tsx:79` — upload local images/videos, then submit existing `photos` payload unchanged.
- `app/mobile/src/app/(tabs)/activities/[activityId]/venue-intelligence.tsx:201` — replace embedded camera preview with native camera launch controls.
- `app/mobile/src/app/(tabs)/activities/[activityId]/venue-intelligence.tsx:492` — update review grid/viewer from photo-only to mixed media.
- `app/mobile/src/app/(tabs)/activities/[activityId]/check-out.tsx:300` — render venue survey videos as videos, images as images.
- `app/mobile/src/app/(tabs)/activities/[activityId]/post-activity.tsx:306` — same mixed-media rendering for post-activity summary.
- `app/mobile/src/app/(tabs)/activities/[activityId]/live-activity.tsx:342` — change venue task metric wording from photo count to media count.

## Key Changes

- In `venue-intelligence.tsx`, remove live `CameraView` preview. Add capture controls:
  - category selector stays before capture.
  - `Photo` opens `ImagePicker.launchCameraAsync({ mediaTypes: ["images"], cameraType, quality })`.
  - `Video` opens `ImagePicker.launchCameraAsync({ mediaTypes: ["videos"], cameraType, videoMaxDuration: 60 })`.
  - `Rear / Front` selector sets `cameraType` before OS camera opens.
  - `Gallery` opens `launchImageLibraryAsync({ mediaTypes: ["images", "videos"], allowsMultipleSelection: true, selectionLimit: 0, orderedSelection: true })`.
- Track local working media with `kind: "image" | "video"`, `uri`, `mimeType`, `fileName`, category, capturedAt. Existing remote items infer kind from object key extension.
- Preserve existing reducer flow: capture/add media → quick confirm → optional review notes → upload locals → `submitVenueSurvey`.
- Keep backend command field named `photos`; videos are stored there as object keys with video extensions. No `.api.ts` or backend schema change.
- Enforce 60s video max: native camera gets `videoMaxDuration: 60`; gallery videos over 60s are skipped with an alert.
- Use existing `expo-video` / `VideoPlayer` for video thumbnails and full-screen playback.

## Test Plan

- `cd app/mobile && pnpm typecheck`
- `cd app/mobile && pnpm lint`
- Rebuild native app because permissions changed: iOS and Android dev-client/native builds.
- Real-device QA:
  - capture rear photo, front photo.
  - record video with audio, confirm 60s max.
  - attach multiple gallery images/videos.
  - save & review later, reopen activity, confirm context/media persists.
  - check-out and post-activity summaries render image thumbnails and playable videos.

## Assumptions

- “Native camera” means OS camera UI via `expo-image-picker`, not custom in-app camera preview.
- Video audio required.
- 60s max applies to recorded videos and selected gallery videos.
- Mobile-only video storage inside existing venue survey `photos` array is acceptable.
