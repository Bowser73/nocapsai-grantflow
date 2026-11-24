# GrantFlow Android release candidate

Package: `com.nocapsai.grantflow`, version 1.0.0 (code 1). Uses the existing hosted GrantFlow application as a Trusted Web Activity. No Family Hub changes.

This is a preparation branch. It is not a completed Play release. Keep Play billing disabled and do not merge/deploy until the operational items below are ready. The production web app has not been changed by this work.

## Build

Use JDK 17 and the Android SDK platform 36. Set `android/local.properties` to your SDK directory. The Gradle wrapper is pinned to 8.14.3 with the vendor's SHA-256 checksum; AGP is 8.13.0. Browser Helper billing 1.2.0 resolves Google Play Billing Client 8.3.0.

Set `GRANTFLOW_KEYSTORE` to the dedicated GrantFlow upload keystore and `GRANTFLOW_KEY_PASSWORD` to its password in your local process. Alias: `grantflow-upload`. Do not commit either. Run `android/gradlew.bat -p android bundleRelease assembleRelease lintRelease` on Windows. Release tasks fail if signing variables are missing. Output: `android/app/build/outputs/bundle/release/app-release.aab`.

## Server preparation

`GOOGLE_PLAY_BILLING_ENABLED` defaults to false. Configure the service identity and encryption key described in `subscription-setup.txt` only on the server. A new idempotent migration adds PlaySubscription and AIContentReport; it does not replace Stripe fields or existing records. The normal production build applies migrations. Do not point a preview deployment at the production database without reviewing that side effect.

The `/android` entry and Android deep-link marker establish a tab-scoped Play billing presentation. Ordinary website tabs retain Stripe. Play purchases use Digital Goods and Payment Request APIs and are verified/acknowledged on the server. Stale Play entitlements refresh on access; failed stale verification returns Free for that provider. Existing Stripe and complimentary plans remain separately evaluated.

The prepared privacy page is public at `/privacy`; deletion requests are public at `/delete-account` and also linked in Settings and authentication pages. Account deletion is operator-assisted by email; it is not automatic. The operator must monitor the support mailbox, verify ownership, delete associated personal data and disclose lawful retention exceptions. Account deletion does not automatically cancel subscriptions.

AI draft reports are submitted inside the app and saved to AIContentReport. Only administrators listed in ADMIN_EMAILS can read `/content-reports`. Review reports regularly and address offensive/unsafe content. No report was sent during preparation.

## Console and rollout gates

The existing developer account is njwhitt@nocapsai.com / NoCapsAI. Only Family Hub was listed during inspection. A first GrantFlow form is prepared; its package name was available. The user must review Google's policy and US export-compliance declarations before creation. Reinspect before creating so no other session creates a duplicate.

After the app exists: enroll in Play App Signing, upload the signed candidate to an internal release, retrieve the **app-signing certificate**, configure ANDROID_CERT_SHA256, deploy the support changes, and verify `/.well-known/assetlinks.json` returns JSON without login. An upload-certificate fingerprint alone may differ from Google's app-signing certificate.

Create grantflow_pro with an auto-renewing monthly base plan. Review pricing against the existing $29/month web plan. Authorize a least-privilege verifier for this app and configure server secrets without exposing them in the repository. Use license testers and test purchases. No charge was made, and no subscription product was created or activated in this task.

Do not submit the Data safety draft as a certification until the actual hosting/provider contracts, logs, retention and deletion practices have been verified. Prepare a non-admin reviewer account with fictional data and durable access; do not use the owner's account. Complete the actual IARC rating and app-content questionnaires.

Phone images captured so far are genuine mobile website login and registration screens. They are not Android-runtime proof or authenticated feature screenshots. Capture the installed app's workspace with fictional data before publication.

## Validation and remaining tests

TypeScript and Next lint pass. A production web build passes using dummy local configuration without executing migrations. Twelve pure subscription-state checks and eight mocked server verification cases pass (Node reports 21 including the parent test). Mocked checks cover acknowledgement, encryption, cross-account rejection, wrong products, forged tokens, expired subscriptions, network failure and disabled rollout. These do not prove actual Google purchase processing or database migration execution.

The signed AAB passes bundletool validation and jarsigner verification; the release APK passes apksigner verification. Android release lint has zero errors and 17 warnings, primarily template resources, launcher icon recommendations, exported Google browser/payment services (runtime caller verification), and newer Gradle availability. The release contains no location/camera/microphone or advertising-ID permission. Dependency reports and merged manifests must be checked again if dependencies change.

No Android test device was connected. Actual installation, TWA origin validation, sign-in, uploads, exports, grants search, AI generation, account deletion processing, subscription lifecycle, reinstall and restore must still be tested. No production release, internal rollout, tester invitation or live migration was performed.

The dedicated preparation branch skips Vercel preview builds via ignoreCommand so pushing the draft PR cannot run its deployment-time database migrations. Other branch/environment combinations continue the normal build path. Remove or revise the preparation skip when an isolated preview database is ready.
