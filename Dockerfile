# Dockerfile for building PxView Android APK
# This provides a consistent build environment without local setup hassles

FROM ubuntu:20.04

# Avoid interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Set up environment variables
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=${PATH}:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/build-tools/29.0.2
ENV JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64

# Install required packages
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    openjdk-8-jdk \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 14.x
RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@6.14.18

# Install Android SDK
RUN mkdir -p ${ANDROID_SDK_ROOT}/cmdline-tools && \
    cd ${ANDROID_SDK_ROOT}/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-7583922_latest.zip && \
    unzip commandlinetools-linux-7583922_latest.zip && \
    rm commandlinetools-linux-7583922_latest.zip && \
    mv cmdline-tools latest

# Accept licenses and install required SDK components
RUN yes | sdkmanager --licenses || true
RUN sdkmanager "platform-tools" "platforms;android-29" "build-tools;29.0.2"

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create dummy google-services.json if it doesn't exist
RUN if [ ! -f android/app/google-services.json ]; then \
    cat > android/app/google-services.json << 'EOF'
{
  "project_info": {
    "project_number": "123456789",
    "project_id": "pxview-dummy",
    "storage_bucket": "pxview-dummy.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:123456789:android:abc123def456",
        "android_client_info": {
          "package_name": "com.utopia.pxviewr"
        }
      },
      "oauth_client": [],
      "api_key": [
        {
          "current_key": "AIzaSyDummy-Key-For-Build-Only"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": []
        }
      }
    }
  ],
  "configuration_version": "1"
}
EOF
fi

# Make gradlew executable
RUN chmod +x android/gradlew

# Build the APK
RUN cd android && ./gradlew clean && ./gradlew assembleDebug

# The APK will be available at:
# /app/android/app/build/outputs/apk/debug/app-debug.apk

CMD ["echo", "Build complete! APK is at: android/app/build/outputs/apk/debug/app-debug.apk"]
