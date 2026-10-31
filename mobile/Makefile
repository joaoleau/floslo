install:
	npm install

start:
	npx expo start

test:
	npm test

test-watch:
	npm run test:watch

test-coverage:
	npx jest --coverage

android:
	npx expo run:android

prebuild:
	npx expo prebuild --platform android --clean

build-apk:
	cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
	@echo "APK: android/app/build/outputs/apk/release/app-release.apk"

clean:
	cd android && ./gradlew clean

.PHONY: install start test test-watch test-coverage android prebuild build-apk clean
