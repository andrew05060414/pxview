/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */

import React, { Component } from 'react';
import {
  Platform,
  Alert,
  PermissionsAndroid,
  DeviceEventEmitter,
  Linking,
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
    ) => {
      let fileName;
      switch (saveImageSettings && saveImageSettings.fileName) {
        case SAVE_FILE_NAME_FORMAT.WORK_TITLE:
          fileName = `${workTitle}_p${index}.png`;
          break;
        case SAVE_FILE_NAME_FORMAT.WORK_ID_WORK_TITLE:
          fileName = `${workId}_${workTitle}_p${index}.png`;
          break;
        case SAVE_FILE_NAME_FORMAT.WORK_ID:
        default:
          fileName = `${workId}_p${index}.png`;
          break;
      }
      return sanitize(fileName, {
        replacement: '_',
      });
    };

    saveToGallery = async (filePath, album) => {
      const fileUri = filePath.startsWith('file://')
        ? filePath
        : `file://${filePath}`;
      const options = { type: 'photo', album };
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
      await Promise.mapSeries(imageUrls, async (url, index) => {
        const fileName = this.getImageFileName(
          workId,
          workTitle,
          workType,
          saveImageSettings,
          imageIndex || index,
        );
        let filePath = null;
        try {
          const res = await RNFetchBlob.config({
            path: `${tempDir}/${fileName}`,
          }).fetch('GET', url, {
            referer: PIXIV_REFERER,
          });
          filePath = res.path();
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
