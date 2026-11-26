import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import PixivApi from './pixivApiClient';

const deviceModel = DeviceInfo.getModel();
const systemVersion = DeviceInfo.getSystemVersion();

let options;
if (Platform.OS === 'android' && systemVersion && deviceModel) {
  options = {
    headers: {
      'App-OS-Version': systemVersion,
      'User-Agent': `PixivAndroidApp/5.0.166 (Android ${systemVersion}; ${deviceModel})`,
    },
  };
}

const pixiv = new PixivApi(options);
export default pixiv;
