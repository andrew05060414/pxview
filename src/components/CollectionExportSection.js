import React from 'react';
import {
  View,
  Alert,
  DeviceEventEmitter,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Button, useTheme } from 'react-native-paper';
import RNFetchBlob from 'rn-fetch-blob';
import Share from 'react-native-share';
import { connectLocalization } from './Localization';
import {
  toCsv,
  toJson,
  buildExportFileName,
} from '../common/helpers/bookmarkExport';
import { globalStyleVariables } from '../styles';

const { dirs, isDir, mkdir, writeFile } = RNFetchBlob.fs;

const styles = {
  container: {
    padding: 10,
  },
  button: {
    marginTop: 10,
  },
};

const CollectionExportSection = ({ i18n }) => {
  const items = useSelector((state) => state.bookmarkLibrary.items);
  const theme = useTheme();
  const isEmpty = !items || !Object.keys(items).length;

  const handleOnPressOpenAppSettings = () => {
    Linking.openSettings();
  };

  const checkPermission = async () => {
    if (Platform.OS !== 'android') {
      return;
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
    if (granted === PermissionsAndroid.RESULTS.DENIED) {
      throw new Error('storage permission denied');
    }
    if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        i18n.formatString(
          i18n.permissionPromptStorageToBackup,
          i18n.permissionStorage,
        ),
        i18n.formatString(i18n.permissionPromptMessage, i18n.permissionStorage),
        [
          { text: i18n.permissionPromptLater },
          {
            text: i18n.permissionGrantAppSettings,
            onPress: handleOnPressOpenAppSettings,
          },
        ],
        { cancelable: false },
      );
      throw new Error('storage permission never ask again');
    }
  };

  const handleOnPressExport = async (format) => {
    if (isEmpty) {
      return;
    }
    try {
      await checkPermission();
      const baseDir =
        Platform.OS === 'android' ? dirs.SDCardDir : dirs.DocumentDir;
      const exportDir = `${baseDir}/pxviewr/export`;
      if (!(await isDir(exportDir))) {
        await mkdir(exportDir);
      }
      const path = `${exportDir}/${buildExportFileName(format)}`;
      const data = format === 'csv' ? toCsv(items) : toJson(items);
      await writeFile(path, data, 'utf8');
      DeviceEventEmitter.emit(
        'showToast',
        i18n.formatString(i18n.collectionExportSuccess, path),
      );
      Share.open({
        title: 'PXView',
        url: `file://${path}`,
        type: format === 'csv' ? 'text/csv' : 'application/json',
      }).catch(() => {
        // user dismissed the share sheet
      });
    } catch (err) {
      // permission denied or write failed; toast/Alert already shown
    }
  };

  return (
    <View style={styles.container}>
      <Button
        mode="outlined"
        disabled={isEmpty}
        color={globalStyleVariables.PRIMARY_COLOR}
        style={styles.button}
        onPress={() => handleOnPressExport('csv')}
      >
        {i18n.collectionExportCsv}
      </Button>
      <Button
        mode="outlined"
        disabled={isEmpty}
        color={globalStyleVariables.PRIMARY_COLOR}
        style={styles.button}
        onPress={() => handleOnPressExport('json')}
      >
        {i18n.collectionExportJson}
      </Button>
      {isEmpty && (
        <Button
          disabled
          mode="text"
          color={theme.colors.disabled}
          style={styles.button}
        >
          {i18n.collectionExportEmpty}
        </Button>
      )}
    </View>
  );
};

export default connectLocalization(CollectionExportSection);
