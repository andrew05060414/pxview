import React, { Component } from 'react';
import { Modal, KeyboardAvoidingView } from 'react-native';
import { Dialog, Button, TextInput } from 'react-native-paper';
import { connectLocalization } from './Localization';

class TextInputDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: props.value || '',
    };
  }

  handleOnChangeText = (value) => {
    this.setState({ value });
  };

  handleOnSubmit = () => {
    const { onSubmit } = this.props;
    const { value } = this.state;
    onSubmit(value.trim());
  };

  render() {
    const { title, placeholder, onClose, i18n } = this.props;
    const { value } = this.state;
    return (
      <Modal animationType="fade" transparent visible onRequestClose={onClose}>
        <Dialog dismissable={false} visible onDismiss={onClose}>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Content>
            <KeyboardAvoidingView behavior="padding">
              <TextInput
                value={value}
                placeholder={placeholder}
                onChangeText={this.handleOnChangeText}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={this.handleOnSubmit}
              />
            </KeyboardAvoidingView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={onClose}>{i18n.cancel}</Button>
            <Button onPress={this.handleOnSubmit}>{i18n.ok}</Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>
    );
  }
}

export default connectLocalization(TextInputDialog);
