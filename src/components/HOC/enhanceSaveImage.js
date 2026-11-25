/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */

import React, { Component } from 'react';
import {
  Platform,
  Alert,
  PermissionsAndroid,
  DeviceEventEmitter,
  Linking,
  NativeModules,
} from 'react-native';
import { connect } from 'react-redux';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFetchBlob from 'react-native-blob-util';
import hoistNonReactStatic from 'hoist-non-react-statics';
import Promise from 'bluebird';
import sanitize from 'sanitize-filename';
import { connectLocalization } from '../Localization';
import {
  SAVE_FILE_NAME_USER_FOLDER_FORMAT,
  SAVE_FILE_NAME_FORMAT,
} from '../../common/constants';

const PIXIV_REFERER = 'https://www.pixiv.net';
const MIME_TYPE_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/pjpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};
const VALID_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

let saveBatchCounter = 0;

export const getExtensionFromMimeType = (contentType) => {
  if (!contentType || typeof contentType !== 'string') {
    return null;
  }
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  return MIME_TYPE_TO_EXTENSION[normalized] || null;
};

export const getExtensionFromUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  const cleanUrl = url.split(/[?#]/)[0];
  const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
  if (!match) {
    return null;
  }
  const ext = match[1].toLowerCase();
  if (!VALID_IMAGE_EXTENSIONS.has(ext)) {
    return null;
  }
  return ext === 'jpeg' ? 'jpg' : ext;
};

export const toFileUri = (filePath) => {
  const plainPath = String(filePath || '').replace(/^file:\/\//i, '');
  const encodedPath = plainPath
    .split('/')
    .map((segment) => {
      if (!segment) {
        return '';
      }
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch (_err) {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
  return `file://${encodedPath.startsWith('/') ? encodedPath : `/${encodedPath}`}`;
};

export const validateImageResponse = (res) => {
  const info = typeof res?.info === 'function' ? res.info() : null;
  if (
    info &&
    typeof info.status === 'number' &&
    (info.status < 200 || info.status >= 300)
  ) {
    throw new Error(`HTTP ${info.status}`);
  }
  const headers = info?.headers || {};
  const contentTypeKey = Object.keys(headers).find(
    (k) => k.toLowerCase() === 'content-type',
  );
  const rawContentType = contentTypeKey ? headers[contentTypeKey] : null;
  if (rawContentType && typeof rawContentType === 'string') {
    const mimeType = rawContentType.split(';')[0].trim().toLowerCase();
    if (!mimeType.startsWith('image/')) {
      throw new Error(`Unexpected content-type: ${mimeType}`);
    }
    return {
      contentType: mimeType,
      mimeExtension: getExtensionFromMimeType(mimeType),
    };
  }
  return { contentType: null, mimeExtension: null };
};

const enhanceSaveImage = (WrappedComponent) => {
  class Hoc extends Component {
    needsLegacyStoragePermission = () =>
      Platform.OS === 'android' && Number(Platform.Version) < 29;

    requestWriteExternalStoragePermission = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        );
        return granted;
      } catch (err) {
        return null;
      }
    };

    handleOnPressOpenAppSettings = () => {
      Linking.openSettings();
    };

    getAlbumName = (
      workId,
      workTitle,
      workType,
      userId,
      userName,
      saveImageSettings,
    ) => {
      let album = 'pxviewr';
      if (Platform.OS !== 'android') {
        return album;
      }
      if (saveImageSettings && saveImageSettings.userFolderName) {
        switch (saveImageSettings.userFolderName) {
          case SAVE_FILE_NAME_USER_FOLDER_FORMAT.USER_NAME:
            album += `/${sanitize(userName || '', { replacement: '_' })}`;
            break;
          case SAVE_FILE_NAME_USER_FOLDER_FORMAT.USER_ID_USER_NAME:
            album += `/${userId}_${sanitize(userName || '', {
              replacement: '_',
            })}`;
            break;
          case SAVE_FILE_NAME_USER_FOLDER_FORMAT.USER_ID:
          default:
            album += `/${userId}`;
            break;
        }
      }
      if (
        saveImageSettings &&
        saveImageSettings.isCreateMangaFolder &&
        workType === 'manga'
      ) {
        switch (saveImageSettings.fileName) {
          case SAVE_FILE_NAME_FORMAT.WORK_TITLE:
            album += `/${sanitize(workTitle || '', { replacement: '_' })}`;
            break;
          case SAVE_FILE_NAME_FORMAT.WORK_ID_WORK_TITLE:
            album += `/${workId}_${sanitize(workTitle || '', {
              replacement: '_',
            })}`;
            break;
          case SAVE_FILE_NAME_FORMAT.WORK_ID:
          default:
            album += `/${workId}`;
            break;
        }
      }
      return album;
    };

    getImageFileName = (
      workId,
      workTitle,
      workType,
      saveImageSettings,
      index,
      extension = 'png',
    ) => {
      const normalizedExt =
        String(extension || 'png')
          .replace(/^\./, '')
          .toLowerCase() || 'png';
      let fileName;
      switch (saveImageSettings && saveImageSettings.fileName) {
        case SAVE_FILE_NAME_FORMAT.WORK_TITLE:
          fileName = `${workTitle}_p${index}.${normalizedExt}`;
          break;
        case SAVE_FILE_NAME_FORMAT.WORK_ID_WORK_TITLE:
          fileName = `${workId}_${workTitle}_p${index}.${normalizedExt}`;
          break;
        case SAVE_FILE_NAME_FORMAT.WORK_ID:
        default:
          fileName = `${workId}_p${index}.${normalizedExt}`;
          break;
      }
      return sanitize(fileName, {
        replacement: '_',
      });
    };

    saveToGallery = async (filePath, album) => {
      const fileUri = toFileUri(filePath);
      if (
        Platform.OS === 'ios' &&
        NativeModules &&
        NativeModules.PXPhotoSaver &&
        typeof NativeModules.PXPhotoSaver.saveImage === 'function'
      ) {
        return NativeModules.PXPhotoSaver.saveImage(fileUri);
      }
      const options =
        Platform.OS === 'ios' ? { type: 'photo' } : { type: 'photo', album };
      if (typeof CameraRoll.saveAsset === 'function') {
        return CameraRoll.saveAsset(fileUri, options);
      }
      if (typeof CameraRoll.save === 'function') {
        return CameraRoll.save(fileUri, options);
      }
      return CameraRoll.saveToCameraRoll(fileUri, 'photo');
    };

    saveImage = async ({
      imageUrls,
      imageIndex,
      workId,
      workTitle,
      workType,
      userId,
      userName,
    }) => {
      const { i18n, saveImageSettings } = this.props;
      if (this.needsLegacyStoragePermission()) {
        const granted = await this.requestWriteExternalStoragePermission();
        if (granted === PermissionsAndroid.RESULTS.DENIED) {
          return null;
        }
        if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          return Alert.alert(
            i18n.formatString(
              i18n.permissionPromptStorageToSaveImage,
              i18n.permissionStorage,
            ),
            i18n.formatString(
              i18n.permissionPromptMessage,
              i18n.permissionStorage,
            ),
            [
              { text: i18n.permissionPromptLater },
              {
                text: i18n.permissionGrantAppSettings,
                onPress: this.handleOnPressOpenAppSettings,
              },
            ],
            { cancelable: false },
          );
        }
      }
      this.showToast(
        i18n.formatString(
          imageUrls.length > 1 ? i18n.saveImagesStart : i18n.saveImageStart,
        ),
      );
      const { dirs } = RNFetchBlob.fs;
      const cacheBaseDir = dirs.CacheDir || dirs.DocumentDir;
      const tempDir = `${cacheBaseDir}/pxviewr_save`;
      const album = this.getAlbumName(
        workId,
        workTitle,
        workType,
        userId,
        userName,
        saveImageSettings,
      );
      try {
        const dirExists = await RNFetchBlob.fs.isDir(tempDir);
        if (!dirExists) {
          await RNFetchBlob.fs.mkdir(tempDir);
        }
      } catch (err) {}
      saveBatchCounter += 1;
      const batchId = `${Date.now()}_${saveBatchCounter}`;
      await Promise.mapSeries(imageUrls, async (url, index) => {
        const urlExtension = getExtensionFromUrl(url) || 'jpg';
        let fileName = this.getImageFileName(
          workId,
          workTitle,
          workType,
          saveImageSettings,
          imageIndex || index,
          urlExtension,
        );
        const itemTempDir = `${tempDir}/${batchId}_${index}`;
        try {
          if (typeof RNFetchBlob.fs.mkdir === 'function') {
            await RNFetchBlob.fs.mkdir(itemTempDir);
          }
        } catch (err) {}
        let filePath = null;
        try {
          const res = await RNFetchBlob.config({
            path: `${itemTempDir}/${fileName}`,
          }).fetch('GET', url, {
            referer: PIXIV_REFERER,
          });
          filePath = res.path();
          const { mimeExtension } = validateImageResponse(res);
          if (mimeExtension && mimeExtension !== urlExtension) {
            const renamedFileName = this.getImageFileName(
              workId,
              workTitle,
              workType,
              saveImageSettings,
              imageIndex || index,
              mimeExtension,
            );
            const renamedPath = `${itemTempDir}/${renamedFileName}`;
            if (typeof RNFetchBlob.fs.mv === 'function' && filePath) {
              await RNFetchBlob.fs.mv(filePath, renamedPath);
              filePath = renamedPath;
              fileName = renamedFileName;
            }
          }
          await this.saveToGallery(filePath, album);
          this.showToast(i18n.formatString(i18n.saveImageSuccess, fileName));
        } catch (err) {
          this.showToast(i18n.formatString(i18n.saveImageError, fileName));
        } finally {
          if (filePath && typeof RNFetchBlob.fs.unlink === 'function') {
            try {
              await RNFetchBlob.fs.unlink(filePath);
            } catch (err) {}
          }
          if (typeof RNFetchBlob.fs.unlink === 'function') {
            try {
              await RNFetchBlob.fs.unlink(itemTempDir);
            } catch (err) {}
          }
        }
      });
      return null;
    };

    showToast = (message) => {
      DeviceEventEmitter.emit('showToast', message);
    };

    render() {
      return <WrappedComponent {...this.props} saveImage={this.saveImage} />;
    }
  }

  hoistNonReactStatic(Hoc, WrappedComponent);

  return connectLocalization(
    connect((state) => ({
      saveImageSettings: state.saveImageSettings,
    }))(Hoc),
  );
};

export default enhanceSaveImage;
