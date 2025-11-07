import React, { Component } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import { Text } from 'react-native-paper';
import PXCacheImage from './PXCacheImage';
import * as illustDetailActionCreators from '../common/actions/illustDetail';
import { SCREENS } from '../common/constants';

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  errorText: {
    color: '#666',
    fontSize: 14,
  },
});

class NovelImage extends Component {
  componentDidMount() {
    const { illustId, item, fetchIllustDetail } = this.props;
    // Fetch illustration details if not already loaded
    if (!item || !item.image_urls) {
      fetchIllustDetail(illustId);
    }
  }

  handleOnPressImage = () => {
    const { illustId, pageNumber, navigation, item } = this.props;
    if (item && navigation) {
      // Navigate to illustration detail screen
      navigation.push(SCREENS.Detail, {
        items: [item],
        index: 0,
        parentRoute: navigation.state.routeName,
      });
    }
  };

  getImageUrl = () => {
    const { item, pageNumber } = this.props;

    if (!item || !item.image_urls) {
      return null;
    }

    // For manga/multiple pages
    if (item.page_count > 1 && item.meta_pages && item.meta_pages.length > pageNumber) {
      return item.meta_pages[pageNumber].image_urls.large ||
             item.meta_pages[pageNumber].image_urls.medium;
    }

    // For single image
    return item.image_urls.large || item.image_urls.medium;
  };

  handleFoundImageSize = (width, height, uri) => {
    // Optional: handle image size if needed
  };

  render() {
    const { item, illustDetail } = this.props;
    const imageUrl = this.getImageUrl();

    // Loading state
    if (!item && illustDetail && illustDetail.loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
          <Text style={{ marginTop: 8, color: '#666' }}>Loading image...</Text>
        </View>
      );
    }

    // Error state
    if (!imageUrl) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            [Image not available]
          </Text>
        </View>
      );
    }

    // Render image
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={this.handleOnPressImage}
        activeOpacity={0.8}
      >
        <PXCacheImage
          uri={imageUrl}
          onFoundImageSize={this.handleFoundImageSize}
          style={{ marginVertical: 5 }}
        />
      </TouchableOpacity>
    );
  }
}

const mapStateToProps = (state, props) => {
  const { illustId } = props;
  const item = state.entities.illusts && state.entities.illusts[illustId];
  const illustDetail = state.illustDetail && state.illustDetail[illustId];
  return {
    item,
    illustDetail,
  };
};

export default connect(mapStateToProps, illustDetailActionCreators)(NovelImage);
