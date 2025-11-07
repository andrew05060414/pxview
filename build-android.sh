#!/bin/bash

# Build script for PxView Android APK
# This script provides multiple options for building without local Android SDK setup

set -e

echo "=================================="
echo "PxView Android Build Script"
echo "=================================="
echo ""

show_help() {
    echo "Usage: ./build-android.sh [option]"
    echo ""
    echo "Options:"
    echo "  docker       Build using Docker (recommended if you have Docker installed)"
    echo "  github       Instructions for building via GitHub Actions (no local setup needed)"
    echo "  help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./build-android.sh docker"
    echo "  ./build-android.sh github"
}

build_with_docker() {
    echo "Building APK using Docker..."
    echo ""

    if ! command -v docker &> /dev/null; then
        echo "ERROR: Docker is not installed!"
        echo "Please install Docker from: https://docs.docker.com/get-docker/"
        exit 1
    fi

    echo "Step 1: Building Docker image (this may take 10-15 minutes first time)..."
    docker build -t pxview-builder .

    echo ""
    echo "Step 2: Building APK..."
    docker run --rm -v "$(pwd)/build-output:/app/android/app/build/outputs/apk" pxview-builder \
        bash -c "cd android && ./gradlew assembleDebug && cp -r /app/android/app/build/outputs/apk/* /app/android/app/build/outputs/apk/"

    echo ""
    echo "✓ Build complete!"
    echo "APK location: ./build-output/debug/app-debug.apk"
}

github_instructions() {
    echo "Building via GitHub Actions (Recommended - No local setup needed!)"
    echo "=================================================================="
    echo ""
    echo "GitHub Actions will automatically build your APK in the cloud."
    echo ""
    echo "Steps:"
    echo "1. Push your code to GitHub (already done if you're reading this)"
    echo "2. Go to: https://github.com/<your-username>/pxview/actions"
    echo "3. Click on 'Android Build' workflow"
    echo "4. Click 'Run workflow' button (or it runs automatically on push)"
    echo "5. Wait 5-10 minutes for the build to complete"
    echo "6. Download the APK from the 'Artifacts' section"
    echo ""
    echo "The workflow is already set up in .github/workflows/android-build.yml"
    echo ""
    echo "Your APK will be available as 'app-debug' artifact for download."
}

# Main script logic
case "${1:-help}" in
    docker)
        build_with_docker
        ;;
    github)
        github_instructions
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Unknown option: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
