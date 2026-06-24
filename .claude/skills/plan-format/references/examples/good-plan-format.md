# Press-and-hold to record video (venue capture)

## Context

The venue-capture screen records video with a **tap-to-start / tap-to-stop** button (added in
IMP-1342). Press-and-hold — hold to record, release to stop — is the more common, expected gesture.
This swaps the video-mode record button to press-and-hold and hardens the start/stop race so a
quick tap or an early release can't leave an orphaned recording running to the 60s cap.

Single file: `app/mobile/src/app/(tabs)/activities/[activityId]/venue-intelligence.tsx`. No new
deps, no native change, no backend.

## Change 1 — handlers: hold-safe start/stop

The button will fire `onStartRecording` on touch-down and `onStopRecording` on release. Because
`startRecording` is async (it may await the mic-permission prompt before `recordAsync` actually
begins), a fast release can call `stopRecording` _before_ recording starts — orphaning the clip.
A `recordIntentRef` tracks whether the finger is still down so start can bail/stop immediately.

```diff
# venue-intelligence.tsx:244 (SurveyCaptureView)
+  const recordIntentRef = React.useRef(false);
+
   const startRecording = async (): Promise<void> => {
     if (!useRealCamera || cameraRef.current == null || !cameraReady || recording) return;
+    recordIntentRef.current = true;
     if (micPermission != null && !micPermission.granted) {
       const res = await requestMicPermission();
       if (!res.granted) {
         Alert.alert("Microphone needed", "Enable microphone access to record video with sound.");
+        recordIntentRef.current = false;
         return;
       }
     }
+    // Finger may have lifted during the permission prompt — don't start a recording nobody wants.
+    if (!recordIntentRef.current) return;
     setRecording(true);
     try {
-      const video = await cameraRef.current.recordAsync({ maxDuration: 60 });
+      const pending = cameraRef.current.recordAsync({ maxDuration: 60 });
+      // Released before the promise settled (very short hold) → stop right away.
+      if (!recordIntentRef.current) cameraRef.current.stopRecording();
+      const video = await pending;
       if (video?.uri) addLocalMedia(video.uri, "video");
     } catch {
       // recording failed or was interrupted — drop the clip
     } finally {
       setRecording(false);
     }
   };

   const stopRecording = (): void => {
-    if (recording) cameraRef.current?.stopRecording();
+    recordIntentRef.current = false;
+    cameraRef.current?.stopRecording();
   };
```

## Change 2 — button: tap-toggle → press-and-hold

```diff
# venue-intelligence.tsx:464 (CaptureControls, video branch)
-        : <Pressable
-            onPress={recording ? onStopRecording : onStartRecording}
-            className="h-20 w-20 items-center justify-center rounded-full border-4 border-white active:opacity-80"
-          >
+        : <Pressable
+            onPressIn={onStartRecording}
+            onPressOut={onStopRecording}
+            className="h-20 w-20 items-center justify-center rounded-full border-4 border-white active:opacity-80"
+          >
             {recording ?
               <View className="h-7 w-7 rounded-md bg-red-500" />
             : <View className="h-16 w-16 rounded-full bg-red-500" />}
           </Pressable>
```

## Change 3 — hint text (discoverability)

Press-and-hold is invisible without a cue. Add a one-line hint in video mode (uses the `captureMode`

- `recording` props `CaptureControls` already receives), placed between the button row and the Done button.

```diff
# venue-intelligence.tsx:472 (CaptureControls, after the button row's closing </View>)
       </View>
+      {captureMode === "video" && (
+        <View className="mt-3 items-center">
+          <Text className="text-xxs text-white/60">{recording ? "Recording… release to stop" : "Hold to record"}</Text>
+        </View>
+      )}
       <View className="mt-4 items-center">
```

## Verification

- `cd app/mobile && npm run typecheck && npm run lint` (changed file clean).
- On-device (Argent, camera-enabled): video mode → **hold** the shutter → records (red square shows); **release** → clip lands in the grid. Verify: a quick **tap** leaves no recording running; holding past 60s auto-stops; switching to Photo mode still taps to shoot.

## Risks / notes

- `stopRecording` is now called unconditionally; expo-camera `stopRecording()` is a no-op when no recording is active, so the early-release path is safe.
- Tapping (vs holding) yields a near-zero-length clip; acceptable for hold semantics. No minimum-duration guard added (keeps it simple) — revisit only if tiny clips prove a problem.
