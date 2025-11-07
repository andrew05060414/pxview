# Pull Request: Fix Novel Image Display and Add Automated Build System

## Summary

This PR fixes the novel reading feature to properly display embedded images, and adds automated build infrastructure to make APK builds easy without local Android SDK setup.

---

## Changes

### 1. Novel Image Display Fix

**Problem**: Images embedded in novels using `[pixivimage:123456]` tags were not displaying, only showing as links

**Solution**:
- Modified `novelTextParser.js` to handle `pixivimage` tags from the parser
- Updated `NovelViewer.js` to render image tags using a custom component
- Created `NovelImage.js` component that:
  - Fetches illustration details from the Pixiv API
  - Displays images with proper page handling for manga
  - Shows loading states and error handling
  - Uses `PXCacheImage` for proper image loading with referer headers
  - Allows tapping to navigate to full illustration detail

### 2. Automated Build System

**Problem**: Setting up local Android SDK environment is a nightmare for this old React Native 0.63 project

**Solution**: Added multiple build options requiring zero local setup:

#### GitHub Actions Workflow (Recommended):
- Automatic cloud builds on every push
- No local Android SDK setup required
- Downloadable APK artifacts
- Includes dummy Firebase config
- Builds debug and release APKs

#### Docker Build (Alternative):
- Build in isolated container
- Complete environment pre-configured
- Helper scripts included

#### Documentation:
- Comprehensive `BUILD_GUIDE.md`
- Comparison of all build methods
- Troubleshooting guide

---

## Files Changed

### Novel Image Fix:
- `src/common/helpers/novelTextParser.js` - Added pixivimage tag handling
- `src/components/NovelViewer.js` - Added custom renderer for images
- `src/components/NovelImage.js` - New component for displaying novel images

### Build Infrastructure:
- `.github/workflows/android-build.yml` - GitHub Actions workflow
- `Dockerfile` - Docker build environment
- `docker-compose.yml` - Docker Compose config
- `build-android.sh` - Helper build script
- `BUILD_GUIDE.md` - Complete documentation
- `.dockerignore` - Docker optimization

---

## Test Plan

### Novel Images:
- [ ] Open a novel with embedded images
- [ ] Verify images display inline in the novel text
- [ ] Verify loading states work
- [ ] Verify error handling for missing images
- [ ] Verify tapping images navigates to detail view
- [ ] Test with both single illustrations and manga pages

### Build System:
- [ ] Push code and verify GitHub Actions workflow runs
- [ ] Verify APK artifact is produced and downloadable
- [ ] Install and test the built APK on Android device
- [ ] (Optional) Test Docker build locally

---

## How to Get APK

1. Wait for GitHub Actions workflow to complete (~10 minutes)
2. Go to the Actions tab
3. Click on the latest "Android Build" workflow run
4. Download the `app-debug` artifact
5. Install on Android device

---

## Technical Details

### Novel Image Implementation

The parser now recognizes `pixivimage` tags:
```
[pixivimage:123456]       // Single image
[pixivimage:123456-02]    // Manga page 2
```

These are converted to custom HTML tags and rendered as React components that fetch and display the actual images from the Pixiv API.

### Build System Architecture

The GitHub Actions workflow:
1. Sets up Node.js 14.x and JDK 8
2. Installs Android SDK with Build Tools 29.0.2
3. Creates dummy Firebase config automatically
4. Builds both debug and release APKs
5. Uploads artifacts for download

This eliminates the need for local Android SDK setup entirely.

---

## Benefits

✅ Novel images now display properly instead of just showing links
✅ Zero local environment setup needed for building APKs
✅ Automated builds on every push
✅ Free cloud builds via GitHub Actions
✅ Docker option for those who prefer local builds
✅ Comprehensive documentation

---

This PR makes the app fully functional for novel reading with images, and removes the barrier of difficult local environment setup.

## Commits

- Add support for displaying images in novel reading
- Add automated build system for Android APK
