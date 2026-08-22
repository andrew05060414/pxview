import React, { useState } from 'react';
import { ScrollView, View, Alert, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Button, TextInput, useTheme } from 'react-native-paper';
import { connectLocalization } from '../../components/Localization';
import { setAiSettings } from '../../common/actions/aiSettings';
import { sendChatRequest } from '../../common/helpers/llmClient';
import { globalStyleVariables } from '../../styles';

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
  },
});

const AISettings = ({ i18n }) => {
  const aiSettings = useSelector((state) => state.aiSettings);
  const dispatch = useDispatch();
  const theme = useTheme();
  const [baseUrl, setBaseUrl] = useState(aiSettings.baseUrl);
  const [model, setModel] = useState(aiSettings.model);
  const [apiKey, setApiKey] = useState(aiSettings.apiKey);
  const [maxBatchSize, setMaxBatchSize] = useState(
    String(aiSettings.maxBatchSize),
  );
  const [isTesting, setTesting] = useState(false);

  const handleOnPressSave = () => {
    dispatch(
      setAiSettings({
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        apiKey: apiKey.trim(),
        maxBatchSize: Math.max(1, parseInt(maxBatchSize, 10) || 40),
      }),
    );
  };

  const handleOnPressTestConnection = async () => {
    setTesting(true);
    try {
      await sendChatRequest(
        {
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          apiKey: apiKey.trim(),
        },
        [{ role: 'user', content: 'ping' }],
        { max_tokens: 8 },
      );
      Alert.alert(i18n.aiSettingsTitle, i18n.aiSettingsTestSuccess);
    } catch (err) {
      Alert.alert(
        i18n.aiSettingsTitle,
        `${i18n.aiSettingsTestFailure}\n${err.message}`,
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <TextInput
        label={i18n.aiSettingsBaseUrl}
        value={baseUrl}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        onChangeText={setBaseUrl}
      />
      <TextInput
        label={i18n.aiSettingsModel}
        value={model}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        onChangeText={setModel}
      />
      <TextInput
        label={i18n.aiSettingsApiKey}
        value={apiKey}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={styles.input}
        onChangeText={setApiKey}
      />
      <TextInput
        label={i18n.aiSettingsMaxBatchSize}
        value={maxBatchSize}
        keyboardType="numeric"
        style={styles.input}
        onChangeText={setMaxBatchSize}
      />
      <View style={styles.button}>
        <Button
          mode="contained"
          color={globalStyleVariables.PRIMARY_COLOR}
          onPress={handleOnPressTestConnection}
          loading={isTesting}
          disabled={isTesting}
        >
          {i18n.aiSettingsTestConnection}
        </Button>
      </View>
      <View style={styles.button}>
        <Button
          mode="outlined"
          color={globalStyleVariables.PRIMARY_COLOR}
          onPress={handleOnPressSave}
        >
          {i18n.save}
        </Button>
      </View>
    </ScrollView>
  );
};

export default connectLocalization(AISettings);
