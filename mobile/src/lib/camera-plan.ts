// Pure camera decision for "Take photo" (no native imports, unit tested).
//
// G9 F1 (qa 2026-11-08): on the iOS Simulator, launchCameraAsync makes UIImagePickerController raise the ObjC
// exception 'Source type 1 not available' (SIGABRT). A JS try/catch cannot catch that, so the app decides
// before asking for permission or launching. expo-device 58 documents Device.isDevice as "`true` if the app is
// running on a real device and `false` if running in a simulator or emulator"; every iPhone has a camera.

export type CameraStep = 'unavailable' | 'ask-permission';

/** What "Take photo" does first: refuse on a simulator (no camera), otherwise ask for camera access. */
export function cameraStep(isDevice: boolean): CameraStep {
  return isDevice ? 'ask-permission' : 'unavailable';
}
