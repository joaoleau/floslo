install:
	npm install

start:
	npx expo start

# Dev client on a connected device/emulator (adb/USB debugging or emulator running),
# still needs this computer + Metro running.
android:
	npx expo run:android

# Regenerates android/ (and ios/) from app.json + the plugins/ config plugins. Safe to
# run with --clean any time: the notifee Gradle repo (android/build.gradle) and the
# alarm sound raw resources (android/app/src/main/res/raw) are both restored
# automatically by plugins/withNotifeeGradleRepo.js and plugins/withAlarmSoundAssets.js
# — no manual dragging/patching needed after this.
prebuild:
	npx expo prebuild --platform android --clean

# Local production-mode APK: no dev server, no EAS/cloud. Copy the resulting file to a
# phone (or `adb install`) and it runs standalone. Uses the project's existing signing
# config (debug-signed release build) — fine for installing on your own device; a real
# release keystore is only needed later if you decide to publish to the Play Store.
#
# Run `make prebuild` first (or after any app.json/plugins change) so android/ is current.
build-apk:
	cd android && ./gradlew assembleRelease
	@echo "APK: android/app/build/outputs/apk/release/app-release.apk"

clean:
	cd android && ./gradlew clean

.PHONY: install start android prebuild build-apk clean
