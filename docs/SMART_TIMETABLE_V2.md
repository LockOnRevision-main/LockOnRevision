# Smart Timetable v2 – Assessment-Aware Planning (30–45 min Sprint Design)

## Goal
Upload *any* assessment schedule / syllabus / unit planner / teacher notes / calendar / weightage sheet (PDF/DOCX/Image/Screenshot) → auto-generates and continuously adapts a personal academic coach timetable without manual setup. Evolves via mastery model.

---

## 1. Current Baseline (to replace)

`src/services/timetableService.js:28 generateTimetable(preferences)` requires manual `subjects/dailyMinutes/confidence`. `api/generate-timetable.js:34` algorithmic fallback + Gemini prompt with `examDates` (optional). No document understanding, no mastery, no verification, no countdown.

## 2. Architecture Delta (Minimal Code Change)

```
Upload Zone (new) → /api/extract-timetable-docs (new, Gemini Vision 1.5 + Document AI)
               ↓ {assessments[], syllabus{chapters[]}, calendar{holidays[]}, preferencesInferred}
src/services/smartTimetableService.js (new, wraps timetableService.js)
               ↓
Mastery Store: users/{uid}/mastery/{conceptId} {mastery:0-1, attempts, lastSeen, weak:true}
Activity Signals → Adaptive Loop
               ↓
generate-timetable.js (upgraded prompt + algorithmic scorer)
               ↓
Firestore: users/{uid}/timetables/{id} {weeks[], assessments[], syllabus[], masterySnapshot, generatedAt}
               ↓
ExamCountdownDashboard (new) + NoteVerifier (new)
```

**Files to touch (sprint):**
- `src/components/SmartUploadZone.jsx` (new) – multi-file drag-drop, preview, calls extract
- `api/extract-timetable-docs.js` (new) – vision OCR + Gemini extraction
- `api/generate-timetable.js:112` – prompt rewrite + urgency scorer (`src/services/timetableScorer.js` new)
- `src/services/timetableService.js:60` – add `generateAssessmentAwareTimetable(extracted, prefs, mastery)` wrapper, keep `generateLocalFallback` for offline
- `src/services/masteryService.js` (new) – 3 collections: `mastery`, `sessions`, `revisions`
- `src/components/ExamCountdownDashboard.jsx` (new)
- `src/components/NoteVerifier.jsx` (new)

## 3. Supported Uploads & Formats

- Any combo: Assessment schedule, Syllabus, Unit planner, Teacher notes, School calendar, Weightage sheet
- Formats: `PDF` (text+scanned), `DOCX`, `PNG/JPG/WEBP`, screenshots – handled via `api/_lib/fileProcessor.js` (reuse `process-uploaded-notes.js:257 file upload` flow: `/tmp` → `googleAI.files.upload` – vision model). MIME whitelist extended to `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/*`.

No manual setup after upload: `extracted.preferences` infers `dailyMinutes` from calendar free slots (default 90 weekday/120 weekend), `grade` from syllabus header, `durationWeeks` = max(daysUntilExam)/7 +1 buffer week.

## 4. AI Extraction – Schema (single call, no manual form)

**Endpoint:** `POST /api/extract-timetable-docs` with `files: [{url,mimeType}]` (Cloudinary urls already, like `process-uploaded-notes`)

**Gemini Prompt (vision-capable `gemini-1.5-flash`):**
```
Extract JSON only:
{
  assessments:[{subject, assessmentType:"test|lab|project|exam", date:"YYYY-MM-DD", time:"HH:MM", durationMin, marks, weightage, chapterRefs:[], urgency:0-1}],
  syllabus:{chapters:[{title, topics:[], objectives:[], type:"theory|practical|project", difficulty:"easy|medium|hard", estimatedHours}], weightageSheet:{chapter→marks}},
  calendar:{holidays:["YYYY-MM-DD"], weekends:["Sat"], availableStudyWindows:[{day, start,end, minutes}]},
  inferredPreferences:{grade, curriculum:"CBSE etc", dailyMinutes, weekendMinutes}
}
Rules: OCR handwriting/photos, normalize dates (DD/MM/YYYY → ISO), infer duration if missing (standard 180m exam), link assessment ↔ syllabus via chapterRefs by title fuzzy match.
Validate via `validateTimetableExtraction()` in forge-integrity.js (require ≥1 assessment OR ≥1 chapter).
```

Reuse `api/_lib/forge-integrity.js:14 createLogger`.

## 5. Automatic Timetable Generation – Scoring (No Manual Setup)

**Input:** `extracted` + `mastery` + `availableTime`

**Scorer `timetableScorer.js`:**
```
for each chapter:
  urgency = 1 / max(1, daysUntilExam) * weightage * bufferFactor (buffer=1.3 if daysUntilExam<7, else 1)
  need = (1 - mastery) * 2 + difficultyWeight (hard=1.5) + (prevMistakesCount *0.3)
  score = urgency * 0.45 + need * 0.35 + (1/availableDailyHours) *0.2
Sort descending → allocate minutes proportionally.
Constraints (kept from TimetableForm): ≤ daily/ weekend cap, 30-60m slots, ≤2 same subject/day, buffer days before exams (empty slots 1 day before), holidays skipped.
```

**Gemini prompt update** (`api/generate-timetable.js:158 buildPrompt`):
- Inject `assessments`, `syllabus`, `mastery` lines, `weakConcepts` (mastery<0.4), `school timetable` windows, `revision cycles` (spaced: 1d,3d,7d).
- Output same `{weeks:[]}` but each slot now: `{id, subject, chapter, concept, duration, timeSlot, type:"learn|revision|buffer|spaced", assessmentRef, masteryBefore}`

## 6. Adaptive Learning Loop

**Signals → Mastery Update (on every `forgeEvents`):**
- `lessonCompleted` (1), `quizAccuracy` (0-1, from `exerciseAnswers`), `responseTime` (fast > slow), `repeatedMistakes` (same concept <0.5 twice), `revisionHistory` (spaced count), `noteCoverage` (see §7)

`masteryService.updateConcept(uid, conceptId, {accuracy, responseTime, source:"lesson|quiz|note"})`:
```
mastery = clamp(0.8*old + 0.2*signal), weak = mastery<0.45
nextReview = now + spacedIntervals[revisions] (1,3,7,14d)
```

**Rebalance:** After `markSessionCompleted` (`timetableService.js:198`), call `regenerateRemaining()` but now **weighted by updated mastery** (increase time 1.5× for weak, reduce 0.6× for mastered >0.85), insert `type:"spaced"` sessions without deleting `completed:true` slots (already handled `completed` skip in `regenerateRemaining:276`).

## 7. Intelligent Note Verification

Upload: handwritten/textbook/whiteboard/typed.

**Endpoint:** `POST /api/verify-notes` (or reuse `extract-timetable-docs` with `verifyAgainst: {lessonId, objectives}`)

Gemini vision: `identify subject/topic → compare to today's planned lesson (from timetable.weeks) → estimate coverage 0-1 over learning objectives → highlight missing concepts → confidence 0-1`.

**Completion rule:** `confidence≥0.7` → auto-mark session `completed` + `mastery` bump + award `xp` (no text-detection cheat). UI: `NoteVerifier.jsx` shows coverage bar + missing chips + “Mark complete” disabled until confidence threshold.

Reuse `process-uploaded-notes.js:86 deleteCloudinarySourceFiles` pattern.

## 8. Exam Countdown Dashboard

New component `ExamCountdownDashboard.jsx` reading `timetables[0].assessments` + `mastery`:

For each assessment:
- `daysRemaining = ceil((examDate - today)/86400000)`
- `syllabusCompletion% = chapters with ≥1 completed slot / total`
- `mastery% = avg(concept mastery for chapterRefs)`
- `confidence = mastery * completion`
- `predictedReadiness = confidence * (1 - urgencyDecay)` 
- `estimatedHoursRemaining = sum(need * estimatedHours)` 
- `recommendedFocus = top 3 weak chapters (lowest mastery)`

Displayed as cards with progress ring + focus chips → links to `Forge` filtered by chapter.

## 9. Minimal Sprint Order (30-45 min)

1. Create `api/extract-timetable-docs.js` + `validateTimetableExtraction` (10 min)
2. Extend `timetableService.js` with `generateAssessmentAwareTimetable` + scorer (10 min)
3. Upgrade `generate-timetable.js` prompt + fallback to keep offline works (5 min)
4. Stub `masteryService.js` + hook `timetableIntegration.js:4` to update mastery (10 min)
5. Scaffold `ExamCountdownDashboard` + `SmartUploadZone` replacing manual `TimetableForm` when `extracted` exists (10 min) – Note verifier deferred to next sprint.

**Acceptance tie-back:** Upload schedule → auto-extracts urgency/size/weak/etc → timetable without manual setup; completed sessions update mastery and rebalance future blocks; note verification by coverage/confidence; dashboard shows all 6 metrics per exam.

## 10. Risks & Guards

- Vision OCR cost → cache `extracted` in Firestore `users/{uid}/timetableDrafts`
- Blocked `firestore.googleapis.com` → keep `generateLocalFallback` (already resilient)
- Curriculum drift → validate `chapterRefs` against syllabus, discard hallucinations via `detectPlaceholder`

