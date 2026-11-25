import React from 'react';
import {
  View,
  Alert,
  DeviceEventEmitter,
  Platform,
  PermissionsAndroid,
  Linking,
  NativeModules,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'react-native-paper';
import DeviceInfo from 'react-native-device-info';
import moment from 'moment';
import RNFetchBlob from 'react-native-blob-util';
import { useLocalization } from '../../components/Localization';
import PXListItem from '../../components/PXListItem';
import { globalStyles } from '../../styles';
import {
  restoreReadingSettings,
  restoreSaveImageSettings,
  restoreInitialScreenSettings,
  restoreLikeButtonSettings,
  restoreTrendingSearchSettings,
  restoreMuteSettings,
  restoreHighlightTags,
  restoreMuteTags,
  restoreMuteUsers,
  restoreNovelSettings,
  restoreNovelRankingSettings,
  restoreSearchHistory,
  restoreTheme,
} from '../../common/actions/dataBackup';

const { dirs, isDir, mkdir, writeFile, readFile, exists } = RNFetchBlob.fs;

const Backup = () => {
  const dispatch = useDispatch();
  const readingSettings = useSelector((state) => state.readingSettings);
  const saveImageSettings = useSelector((state) => state.saveImageSettings);
  const initialScreenSettings = useSelector(
    (state) => state.initialScreenSettings,
  );
  const likeButtonSettings = useSelector((state) => state.likeButtonSettings);
  const trendingSearchSettings = useSelector(
    (state) => state.trendingSearchSettings,
  );
  const highlightTags = useSelector((state) => state.highlightTags);
  const muteSettings = useSelector((state) => state.muteSettings);
  const muteTags = useSelector((state) => state.muteTags);
  const muteUsers = useSelector((state) => state.muteUsers);
  const novelSettings = useSelector((state) => state.novelSettings);
  const novelRankingSettings = useSelector(
    (state) => state.novelRankingSettings,
  );
  const themeSettings = useSelector((state) => state.theme);
  const searchHistory = useSelector((state) => state.searchHistory);

  const theme = useTheme();
  const { i18n } = useLocalization();
  const baseDir = Platform.OS === 'android' ? dirs.SDCardDir : dirs.DocumentDir;
  const backupFileDir = `${baseDir}/pxviewr/backup`;
  const backupFilePath = `${backupFileDir}/backup.json`;
  const legacyBackupFilePath =
    Platform.OS === 'android' &&
    dirs.LegacySDCardDir &&
    dirs.LegacySDCardDir !== dirs.SDCardDir
      ? `${dirs.LegacySDCardDir}/pxviewr/backup/backup.json`
      : null;

  const showToast = (message) => {
    DeviceEventEmitter.emit('showToast', message);
  };

  const handleOnPressOpenAppSettings = () => {
    Linking.openSettings();
  };

  const needsLegacyStoragePermission = () =>
    Platform.OS === 'android' && Number(Platform.Version) < 29;

  const requestWriteExternalStoragePermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      );
      return granted;
    } catch (err) {
      return null;
    }
  };

  const checkPermission = async () => {
    if (!needsLegacyStoragePermission()) {
      return true;
    }
    const granted = await requestWriteExternalStoragePermission();
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }
    if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        i18n.formatString(
          i18n.permissionPromptStorageToBackup,
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
            onPress: handleOnPressOpenAppSettings,
          },
        ],
        { cancelable: false },
      );
    }
    return false;
  };

  const applyBackupContent = (rawContent) => {
    let parsedData;
    try {
      parsedData = JSON.parse(rawContent);
    } catch (_err) {
      showToast(i18n.backupInvalidFile);
      return false;
    }
    if (!parsedData?.data || typeof parsedData.data !== 'object') {
      showToast(i18n.backupInvalidFile);
      return false;
    }
    const { data } = parsedData;
    if (data.readingSettings) {
      dispatch(restoreReadingSettings(data.readingSettings));
    }
    if (data.saveImageSettings) {
      dispatch(restoreSaveImageSettings(data.saveImageSettings));
    }
    if (data.initialScreenSettings) {
      dispatch(restoreInitialScreenSettings(data.initialScreenSettings));
    }
    if (data.likeButtonSettings) {
      dispatch(restoreLikeButtonSettings(data.likeButtonSettings));
    }
    if (data.trendingSearchSettings) {
      dispatch(restoreTrendingSearchSettings(data.trendingSearchSettings));
    }
    if (data.highlightTags) {
      dispatch(restoreHighlightTags(data.highlightTags));
    }
    if (data.muteSettings) {
      dispatch(restoreMuteSettings(data.muteSettings));
    }
    if (data.muteTags) {
      dispatch(restoreMuteTags(data.muteTags));
    }
    if (data.muteUsers) {
      dispatch(restoreMuteUsers(data.muteUsers));
    }
    if (data.novelSettings) {
      dispatch(restoreNovelSettings(data.novelSettings));
    }
    if (data.novelRankingSettings) {
      dispatch(restoreNovelRankingSettings(data.novelRankingSettings));
    }
    if (data.searchHistory) {
      dispatch(restoreSearchHistory(data.searchHistory));
    }
    if (data.theme) {
      dispatch(restoreTheme(data.theme));
    }
    showToast(i18n.backupRestoreSuccessfully);
    return true;
  };

  const handleOnPressRestoreFromFile = async () => {
    try {
      const picker = NativeModules?.PXFilePicker;
      if (!picker || typeof picker.pickJsonFile !== 'function') {
        showToast(i18n.backupFileNotFound);
        return null;
      }
      const picked = await picker.pickJsonFile();
      if (!picked || !picked.content) {
        return null;
      }
      applyBackupContent(picked.content);
      return null;
    } catch (_err) {
      showToast(i18n.backupInvalidFile);
      return null;
    }
  };

  const handleOnPressConfirmBackup = async () => {
    try {
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        return null;
      }
      const backupSettings = JSON.stringify({
        appVersion: DeviceInfo.getVersion(),
        createdAt: moment().toDate(),
        data: {
          readingSettings,
          saveImageSettings,
          initialScreenSettings,
          likeButtonSettings,
          trendingSearchSettings,
          highlightTags,
          muteSettings,
          muteTags,
          muteUsers,
          novelSettings,
          novelRankingSettings,
          theme: themeSettings,
          searchHistory,
        },
      });
      const backupFileDirExists = await isDir(backupFileDir);
      if (!backupFileDirExists) {
        await mkdir(backupFileDir);
      }
      await writeFile(backupFilePath, backupSettings, 'utf8');
      showToast(i18n.formatString(i18n.backupSuccessfully, backupFilePath));
      return null;
    } catch (_err) {
      showToast(i18n.backupError);
      return null;
    }
  };

  const handleOnPressConfirmRestore = async () => {
    try {
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        return null;
      }
      const candidatePaths = [
        backupFilePath,
        ...(legacyBackupFilePath ? [legacyBackupFilePath] : []),
      ];
      let sawCorruptFile = false;
      for (let i = 0; i < candidatePaths.length; i += 1) {
        const candidatePath = candidatePaths[i];
        try {
          // eslint-disable-next-line no-await-in-loop
          const isBackupExists = await exists(candidatePath);
          if (isBackupExists) {
            // eslint-disable-next-line no-await-in-loop
            const response = await readFile(candidatePath, 'utf8');
            if (response) {
              const applied = applyBackupContent(response);
              if (applied) {
                return null;
              }
              sawCorruptFile = true;
            }
          }
        } catch (_err) {
          // Scoped storage on modern Android can deny direct reads of legacy shared storage.
        }
      }
      if (sawCorruptFile) {
        return null;
      }
      if (typeof NativeModules?.PXFilePicker?.pickJsonFile === 'function') {
        Alert.alert(
          i18n.backupFileNotFound,
          i18n.backupRestoreFromFileDescription,
          [
            { text: i18n.cancel, style: 'cancel' },
            {
              text: i18n.backupChooseFile,
              onPress: handleOnPressRestoreFromFile,
            },
          ],
          { cancelable: true },
        );
      } else {
        showToast(i18n.backupFileNotFound);
      }
      return null;
    } catch (_err) {
      showToast(i18n.backupError);
      return null;
    }
  };

  const handleOnPressBackup = () => {
    Alert.alert(
      i18n.backupConfirm,
      null,
      [
        { text: i18n.cancel, style: 'cancel' },
        { text: i18n.ok, onPress: handleOnPressConfirmBackup },
      ],
      { cancelable: false },
    );
  };

  const handleOnPressRestore = () => {
    Alert.alert(
      i18n.backupRestoreConfirm,
      null,
      [
        { text: i18n.cancel, style: 'cancel' },
        { text: i18n.ok, onPress: handleOnPressConfirmRestore },
      ],
      { cancelable: false },
    );
  };

  return (
    <View
      style={[
        globalStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <PXListItem
        title={i18n.backupData}
        description={i18n.backupDataDescription}
        onPress={handleOnPressBackup}
      />
      <PXListItem
        title={i18n.backupRestoreData}
        onPress={handleOnPressRestore}
      />
      <PXListItem
        title={i18n.backupRestoreFromFile}
        description={i18n.backupRestoreFromFileDescription}
        onPress={handleOnPressRestoreFromFile}
      />
    </View>
  );
};

export default Backup;
