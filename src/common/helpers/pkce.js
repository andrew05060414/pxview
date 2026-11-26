import AsyncStorage from '@react-native-async-storage/async-storage';
import pkceChallenge from 'react-native-pkce-challenge';

const PKCE_STORAGE_KEY = '@pxview/pkce';

class PKCE {
  static getPKCE = async () => {
    if (this.pkce) {
      return this.pkce;
    }

    const persistedPkce = await AsyncStorage.getItem(PKCE_STORAGE_KEY);
    if (persistedPkce) {
      this.pkce = JSON.parse(persistedPkce);
      return this.pkce;
    }

    return PKCE.generatePKCE();
  };

  static async generatePKCE() {
    const { codeChallenge, codeVerifier } = await Promise.resolve(
      pkceChallenge(),
    );
    this.pkce = {
      codeChallenge,
      codeVerifier,
    };
    await AsyncStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(this.pkce));
    return this.pkce;
  }

  static async clearPKCE() {
    this.pkce = null;
    await AsyncStorage.removeItem(PKCE_STORAGE_KEY);
  }
}

export default PKCE;
