// Run: npm test (node --test, Node 24 strips the .ts types).
// G9 F1: "Take photo" never reaches the native camera on a simulator.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cameraStep } from '../src/lib/camera-plan.ts';

test('cameraStep: a simulator has no camera, so nothing native is called', () => {
  assert.equal(cameraStep(false), 'unavailable');
});

test('cameraStep: a real device asks for camera access first', () => {
  assert.equal(cameraStep(true), 'ask-permission');
});
