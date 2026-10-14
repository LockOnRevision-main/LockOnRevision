/**
 * REAL emulator Storage rules tests (Stage 0.1) — deny-by-default proof.
 * storage.rules allows NOTHING (uploads go via Cloudinary). If the Firebase
 * Storage path is ever adopted, THESE tests must be extended first.
 *
 * Capability guard: @firebase/rules-unit-testing storage contexts require
 * v2.2+. If `testEnv.authenticatedContext(...).storage` is unavailable the
 * file reports SKIP (mirror: storage.rules text test in
 * tests/lor-1.9-foundations.test.mjs still asserts deny-by-default).
 */
import { describe, it, before, after } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  initializeTestEnvironment,
  assertFails,
} from "@firebase/rules-unit-testing";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROJECT_ID = process.env.FIREBASE_TEST_PROJECT || "demo-lor";

let testEnv;
let storageCapable = false;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.join(root, "firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
    storage: {
      rules: fs.readFileSync(path.join(root, "storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
  const probe = testEnv.authenticatedContext("probe");
  storageCapable = typeof probe.storage === "function";
});

after(async () => {
  await testEnv?.cleanup();
});

describe("REAL RULES: storage deny-by-default", { skip: false }, () => {
  it("authed upload + download are denied", async (t) => {
    if (!storageCapable) {
      t.skip("rules-unit-testing storage contexts unavailable in this version");
      return;
    }
    const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
    const storage = testEnv.authenticatedContext("stu-a").storage();
    const fileRef = ref(storage, "avatars/stu-a/x.png");
    await assertFails(uploadBytes(fileRef, new Uint8Array([1, 2, 3])));
    await assertFails(getDownloadURL(fileRef));
  });
});
