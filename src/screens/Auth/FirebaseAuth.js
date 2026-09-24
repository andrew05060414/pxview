import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  Button,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import {
  sendPasswordReset,
  signInWithEmail,
  signUpWithEmail,
} from '../../common/helpers/firebase';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  field: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
  },
});

const FirebaseAuth = ({ navigation }) => {
  const theme = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (
      !email.trim() ||
      password.length < 6 ||
      (isSignUp && !displayName.trim())
    ) {
      setError('请输入有效邮箱、至少 6 位密码和昵称。');
      return;
    }

    setBusy(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      navigation.goBack();
    } catch (err) {
      setError(
        err && err.message ? err.message : 'Firebase 登录失败，请稍后重试。',
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    setError('');
    if (!email.trim()) {
      setError('请先输入邮箱地址。');
      return;
    }
    try {
      await sendPasswordReset(email);
      setError('密码重置邮件已发送。');
    } catch (err) {
      setError(err && err.message ? err.message : '无法发送密码重置邮件。');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="titleLarge">
          {isSignUp ? '创建 Firebase 账号' : 'Firebase 邮箱登录'}
        </Text>
        <Text style={{ marginTop: 8, marginBottom: 20 }}>
          使用项目 pxview-588fc 的 Email/Password Authentication。
        </Text>
        {isSignUp && (
          <TextInput
            label="昵称"
            value={displayName}
            onChangeText={setDisplayName}
            mode="outlined"
            style={styles.field}
            autoCapitalize="words"
          />
        )}
        <TextInput
          label="邮箱"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={styles.field}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCompleteType="email"
        />
        <TextInput
          label="密码"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={styles.field}
          secureTextEntry
          autoCapitalize="none"
        />
        {!!error && (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        )}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={busy}
          disabled={busy}
          style={styles.button}
        >
          {isSignUp ? '注册' : '登录'}
        </Button>
        {!isSignUp && (
          <Button
            mode="text"
            onPress={handlePasswordReset}
            disabled={busy}
            style={styles.button}
          >
            忘记密码
          </Button>
        )}
        <Button
          mode="outlined"
          onPress={() => setIsSignUp((value) => !value)}
          disabled={busy}
          style={styles.button}
        >
          {isSignUp ? '已有账号，返回登录' : '创建新账号'}
        </Button>
        <Text style={styles.link}>
          账号数据会保存到 Firestore 的 users/{'{uid}'} 文档。
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default FirebaseAuth;
