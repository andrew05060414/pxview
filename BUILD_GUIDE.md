# PxView Android Build Guide

This guide provides multiple ways to build the PxView Android APK **without dealing with local Android SDK setup**.

## Option 1: GitHub Actions (Recommended - Easiest!)

**Pros:** No local setup needed at all, builds in the cloud, completely free for public repos

**How it works:**
1. Push your code to GitHub (including the changes in this branch)
2. GitHub Actions automatically builds the APK
3. Download the APK from the Actions tab

**Steps:**
1. Push your branch to GitHub:
   ```bash
   git push origin claude/fix-novel-image-display-011CUsfhPsqhchZduQsj1i2C
   ```

2. Go to your GitHub repository: `https://github.com/<your-username>/pxview`

3. Click on the **"Actions"** tab at the top

4. You'll see the "Android Build" workflow running (or click "Run workflow" to trigger it manually)

5. Wait 5-10 minutes for the build to complete

6. Click on the completed workflow run

7. Scroll down to the **"Artifacts"** section

8. Download **app-debug** - this is your APK!

9. Install it on your Android device

**What triggers builds:**
- Automatic: Every push to master/main or any `claude/**` branch
- Manual: Click "Run workflow" button in Actions tab
- Pull requests to master/main

---

## Option 2: Docker Build (Local but Isolated)

**Pros:** Runs on your machine but isolated in container, no SDK installation needed

**Prerequisites:**
- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- 10GB+ free disk space

**Method A: Using the helper script**
```bash
./build-android.sh docker
```

**Method B: Using Docker commands directly**
```bash
# Build the Docker image (first time only, takes 10-15 min)
docker build -t pxview-builder .

# Build the APK
docker run --rm -v "$(pwd)/build-output:/app/android/app/build/outputs/apk" pxview-builder \
  bash -c "cd android && ./gradlew assembleDebug"

# Your APK will be in: ./build-output/debug/app-debug.apk
```

**Method C: Using docker-compose**
```bash
docker-compose up
```

---

## Option 3: Local Build (Not Recommended)

If you really want to build locally without Docker/GitHub Actions:

**Requirements:**
- Node.js 14.x
- JDK 8
- Android SDK with:
  - Build Tools 29.0.2
  - Platform 29 (Android 10)

**Steps:**
```bash
npm install
cd android
./gradlew clean
./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Comparison of Build Methods

| Method | Setup Time | Build Time | Complexity | Recommended |
|--------|-----------|------------|------------|-------------|
| **GitHub Actions** | 0 min (push code) | 8-10 min | ⭐ Easy | ✅ YES |
| **Docker** | 15 min (first time) | 10-15 min | ⭐⭐ Medium | If you have Docker |
| **Local** | 30-60 min | 5-10 min | ⭐⭐⭐⭐ Hard | ❌ NO |

---

## Troubleshooting

### GitHub Actions
- **Build failed?** Check the logs in the Actions tab
- **No artifacts?** Debug build might have failed, check the workflow logs
- **Can't find Actions tab?** Make sure the repo is pushed to GitHub

### Docker
- **"Docker command not found"?** Install Docker first
- **Build fails?** Try: `docker system prune -a` then rebuild
- **Out of space?** Docker images are large, need 10GB+ free

### General
- **Firebase errors?** The workflow includes a dummy `google-services.json` file
- **Build errors?** This is an old codebase, some dependencies might have issues
- **JCenter warnings?** JCenter is deprecated but still works for this project

---

## What About Release Builds?

The workflows build both debug and release APKs. However, release APKs need signing.

**For development/testing:** Use the debug APK (it works perfectly)

**For production release:**
1. Generate a keystore file
2. Add signing config to `android/app/build.gradle`
3. Set up secrets in GitHub Actions for signing keys
4. The workflow will produce a signed release APK

---

## Quick Start (TL;DR)

**Just want an APK right now?**

1. Run: `git push`
2. Go to GitHub Actions tab
3. Wait 10 minutes
4. Download APK from Artifacts
5. Done!

Or run: `./build-android.sh github` for detailed instructions.
