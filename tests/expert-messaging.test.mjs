import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "node:url";
import {
  parseExpertTags, singleExpertTag, roleForTag, conversationId,
  pickUniqueUid, TAG_TO_ROLE, isStaffRole,
} from "../shared/expertMessaging.js";
import { ROLE_DEFAULTS } from "../shared/permissionsCatalogue.js";
import { canAccessAdmin } from "../src/utils/permissions.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

describe("Expert Messaging: @role tag syntax", () => {
  it("parses the existing @teacher / @coordinator / @principal tags", () => {
    assert.deepEqual(parseExpertTags("@teacher can you explain this?"), ["teacher"]);
    assert.deepEqual(parseExpertTags("Hi @principal, need help"), ["principal"]);
    assert.deepEqual(parseExpertTags("@coordinator please review"), ["coordinator"]);
    assert.deepEqual(parseExpertTags("no tags here"), []);
    assert.equal(roleForTag("principal"), "school_admin");
    assert.equal(roleForTag("teacher"), "teacher");
    assert.deepEqual(Object.keys(TAG_TO_ROLE).sort(), ["coordinator", "principal", "teacher"]);
  });

  it("rejects ambiguous tags instead of picking a person", () => {
    assert.throws(() => singleExpertTag("@teacher and @principal"), /Ambiguous/);
    assert.equal(singleExpertTag("plain question"), null);
    assert.equal(singleExpertTag("@teacher help"), "teacher");
  });

  it("never silently substitutes a different recipient", () => {
    assert.equal(pickUniqueUid(["adm-a"], {}), "adm-a");
    assert.throws(() => pickUniqueUid([], {}), /No eligible/);
    assert.throws(() => pickUniqueUid(["a", "b"], {}), /Multiple eligible/);
    assert.equal(conversationId("school-a", "stu-a", "adm-a"), conversationId("school-a", "adm-a", "stu-a"));
    assert.notEqual(conversationId("school-a", "stu-a", "adm-a"), conversationId("school-b", "stu-a", "adm-a"));
  });
});

describe("Expert Messaging: handlers enforce school isolation", () => {
  it("send-message binds sender to the token and validates recipients", () => {
    const src = read("server/handlers/send-message.js");
    assert.ok(src.includes("authedUser"));
    assert.ok(src.includes("checkRate"));
    assert.ok(src.includes("senderId: user.uid"));
    assert.ok(!src.includes("req.body.senderId"));
    assert.ok(src.includes("pickUniqueUid"));
    assert.ok(src.includes("recipient_ineligible") || src.includes("not an eligible"));
    assert.ok(src.includes("ambiguous") || src.includes("Multiple"));
    assert.ok(!/console\.(log|info|debug).*message/.test(src));
    assert.ok(!src.includes("requirePermission"), "students are not staff; do not use staff-only gate");
  });

  it("list-messages is school-scoped to the caller as a participant", () => {
    const src = read("server/handlers/list-messages.js");
    assert.ok(src.includes('where("schoolId", "==", sid)'));
    assert.ok(src.includes("array-contains"));
    assert.ok(src.includes("authedUser"));
    assert.ok(!src.includes(".set(") && !src.includes(".add("));
  });

  it("client cannot write schoolMessages; API is the trust boundary", () => {
    const rules = read("firestore.rules");
    const block = rules.slice(rules.indexOf("match /schoolMessages/"), rules.indexOf("match /joiningPins/"));
    assert.ok(block.includes("allow read: if false"));
    assert.ok(block.includes("allow write: if false"));
  });

  it("school staff do not inherit platform-admin from messaging permissions", () => {
    assert.equal(canAccessAdmin({ isAdmin: false, role: "user" }), false);
    assert.equal(canAccessAdmin({ isAdmin: true }), true);
    assert.ok(!ROLE_DEFAULTS.school_admin.includes("*"));
    assert.ok(!ROLE_DEFAULTS.teacher.includes("invite.manage"));
    assert.ok(!ROLE_DEFAULTS.student.includes("permission.manage"));
    assert.equal(isStaffRole("school_admin"), true);
    assert.equal(isStaffRole("student"), false);
  });

  it("AI assistant intercepts tags without replacing ordinary chat", () => {
    const ai = read("src/components/AiSidebar.jsx");
    assert.ok(ai.includes("parseExpertTags") || ai.includes("singleExpertTag"));
    assert.ok(ai.includes("/api/ai-tutor-chat"));
    assert.ok(ai.includes("/api/send-message"));
    const tutor = read("server/handlers/ai-tutor-chat.js");
    assert.ok(tutor.includes("validateChatInput"));
  });
});
