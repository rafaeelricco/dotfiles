# Press-and-hold to record video (venue capture)

## Context

Video mode changes tap-toggle to press-and-hold. The plan shows async intent state,
gesture wiring, and verification as approval-ready diffs.

Single file: `app/mobile/src/app/(tabs)/activities/[activityId]/venue-intelligence.tsx`. No new
deps, no native change, no backend.

## Change 1 — handlers: hold-safe start/stop

A `recordIntentRef` prevents early release from orphaning async camera recording.

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

Add a small video-mode cue using existing `captureMode` and `recording` props.

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
- Device: hold records; release stops; quick tap leaves no orphan; Photo mode still taps.

## Risks / notes

- `stopRecording` is now called unconditionally; expo-camera `stopRecording()` is a no-op when no recording is active, so the early-release path is safe.
- Tapping (vs holding) yields a near-zero-length clip; acceptable for hold semantics. No minimum-duration guard added (keeps it simple) — revisit only if tiny clips prove a problem.
