import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import BookmarkButton from './BookmarkButton';
import * as bookmarkIllustActionCreators from '../common/actions/bookmarkIllust';
import * as modalActionCreators from '../common/actions/modal';
import {
  MODAL_TYPES,
  LIKE_BUTTON_ACTION_TYPES,
  BOOKMARK_TYPES,
} from '../common/constants';

class BookmarkIllustButton extends Component {
  static propTypes = {
    item: PropTypes.object.isRequired,
    loading: PropTypes.bool.isRequired,
    bookmarkIllust: PropTypes.func.isRequired,
    unbookmarkIllust: PropTypes.func.isRequired,
    openModal: PropTypes.func.isRequired,
    render: PropTypes.func,
  };

  handleBookmarkAction = () => {
    const {
      item,
      loading,
      bookmarkIllust,
      unbookmarkIllust,
      actionType,
    } = this.props;
    if (!loading) {
      let bookmarkType;
      if (actionType === LIKE_BUTTON_ACTION_TYPES.PUBLIC_LIKE) {
        bookmarkType = BOOKMARK_TYPES.PUBLIC;
      } else if (actionType === LIKE_BUTTON_ACTION_TYPES.PRIVATE_LIKE) {
        bookmarkType = BOOKMARK_TYPES.PRIVATE;
      }
      if (item.is_bookmarked) {
        unbookmarkIllust(item.id);
      } else {
        bookmarkIllust(item.id, bookmarkType);
      }
    }
  };

  handleOnPress = () => {
    const { loading, actionType } = this.props;
    if (loading) return;
    if (this.bookmarkButtonRef && this.bookmarkButtonRef.handleOnPress) {
      this.bookmarkButtonRef.handleOnPress();
    } else {
      if (actionType === LIKE_BUTTON_ACTION_TYPES.EDIT_LIKE) {
        this.handleOnLongPress();
      } else {
        this.handleBookmarkAction();
      }
    }
  };

  handleOnLongPress = () => {
    const { item, loading, openModal } = this.props;
    if (!loading) {
      openModal(MODAL_TYPES.BOOKMARK_ILLUST, {
        illustId: item.id,
        isBookmark: item.is_bookmarked,
      });
    }
  };

  render() {
    const { item, size, actionType, render } = this.props;
    if (typeof render === 'function') {
      return render({
        item,
        size,
        actionType,
        onPress: this.handleOnPress,
        onLongPress: this.handleOnLongPress,
        renderButton: () => (
          <BookmarkButton
            ref={(ref) => {
              this.bookmarkButtonRef = ref;
            }}
            item={item}
            size={size}
            actionType={actionType}
            onPress={this.handleBookmarkAction}
            onLongPress={this.handleOnLongPress}
          />
        ),
      });
    }
    return (
      <BookmarkButton
        ref={(ref) => {
          this.bookmarkButtonRef = ref;
        }}
        item={item}
        size={size}
        actionType={actionType}
        onPress={this.handleBookmarkAction}
        onLongPress={this.handleOnLongPress}
      />
    );
  }
}

export default connect(
  (state) => ({
    loading: state.bookmarkIllust.loading,
    actionType: state.likeButtonSettings.actionType,
  }),
  { ...bookmarkIllustActionCreators, ...modalActionCreators },
)(BookmarkIllustButton);
