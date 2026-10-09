---
name: "mobile"
category: "frontend"
maturity: "stable"
version: "2"
description: "Shape mobile projects around device constraints, platform seams, offline behavior, and push notifications — with explicit performance and resilience boundaries for React Native, Expo, and Capacitor."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Mobile design complete; offline and notification behavior explicit; platform trade-offs named."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "frontend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/mobile.json"
diataxis: "how-to"
tags: ["frontend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: mobile brief, device constraints, platform targets, and interaction context.
- Output: mobile architecture covering platform choice, offline model, sync, notifications, deep linking, and platform UX.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: documented standards override defaults; explicit project rules take precedence.
- Rule: if blocked by missing context or dependencies, surface the blocker before proceeding.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The user's request, originating spec/issue, and the skill's declared outputs |
| What is in scope? | Work covered by the skill's acceptance criteria and completion rules |
| What is explicitly out of scope? | Files, behaviors, and decisions outside the skill's declared boundary |
| Who or what consumes this artifact afterward? | The next skill in the workflow or the user |
| What evidence proves it is done? | Completion criteria met, artifact saved, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Emit `MobileArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/mobile/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Mobile

Use this skill when the product needs to respect device constraints, offline behavior, platform-specific UX, or push notifications. It should keep the seam explicit so the app can remain reliable across different device conditions.


## Process

### 1. Choose the platform strategy

- **Native:** Swift/SwiftUI (iOS), Kotlin/Jetpack Compose (Android); maximum performance and platform access.
- **Cross-platform:** React Native (Expo or bare), Flutter, Capacitor/Cordova.
- **Hybrid:** native shell with web views for specific screens; shared business logic.
- **Expo managed workflow:** OTA updates, EAS Build/Submit, Expo Go; fastest iteration.

**Completion criterion:** platform strategy named with rationale.

### 2. Design the app architecture

- **Navigation:** stack, tab, drawer; deep linking scheme; universal links / app links.
- **State management:** local state, global state (Redux, Zustand, Jotai, Recoil), server state (React Query, SWR).
- **Data layer:** API client, caching, offline queue, database (SQLite, Realm, WatermelonDB).
- **Module boundaries:** feature modules, shared components, platform-specific code.

**Completion criterion:** architecture diagram or description saved.

### 3. Offline-first design

- **Local-first:** data stored locally; sync when online; conflict resolution strategy.
- **Sync model:** pull-based, push-based, or bidirectional; sync frequency; conflict resolution (last-write-wins, CRDT, manual merge).
- **Storage:** AsyncStorage, SQLite, encrypted storage; migration strategy.
- **Network detection:** connectivity change handlers; graceful degradation.

**Completion criterion:** offline model and sync strategy named.

### 4. Push notifications

- **Providers:** FCM (Firebase Cloud Messaging), APNs (Apple Push Notification service), Expo Notifications.
- **Notification types:** transactional, marketing, silent/data notifications; permissions.
- **Deep linking:** notification tap → app screen; payload schema; handling app states (foreground, background, closed).
- **Badge and sound:** platform-specific conventions; accessibility.

**Completion criterion:** notification strategy and deep linking schema named.

### 5. Platform-specific UX and performance

- **iOS:** Human Interface Guidelines, SF Symbols, safe areas, dynamic type, VoiceOver.
- **Android:** Material Design, Material You, adaptive icons, back gesture, TalkBack.
- **Performance:** cold start time, memory usage, battery consumption, list recycling, image caching.
- **Accessibility:** screen reader support, dynamic type, high contrast, reduced motion.

**Completion criterion:** platform UX and performance targets named.

### 6. Build, deploy, and update

- **CI/CD:** EAS Build, Fastlane, GitHub Actions; code signing, provisioning profiles.
- **App stores:** App Store Connect, Google Play Console; metadata, screenshots, compliance.
- **OTA updates:** Expo Updates, CodePush; rollback strategy; A/B testing.
- **Crash reporting:** Sentry, Firebase Crashlytics; symbol upload; alerting.

**Completion criterion:** build and deploy strategy named.

### 7. Security and compliance

- **Data protection:** encrypted storage, keychain/keystore, certificate pinning.
- **Authentication:** biometrics (Face ID, Touch ID), secure token storage, session management.
- **Compliance:** GDPR, CCPA, HIPAA if applicable; data retention, deletion.

**Completion criterion:** security controls named.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml