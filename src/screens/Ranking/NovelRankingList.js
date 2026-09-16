import React, { Component } from 'react';
import { InteractionManager } from 'react-native';
import { connect } from 'react-redux';
// eslint-disable-next-line import/no-named-as-default
import NovelList from '../../components/NovelList';
import * as rankingActionCreators from '../../common/actions/ranking';
import { makeGetNovelRankingItems } from '../../common/selectors';

class NovelRankingList extends Component {
  componentDidMount() {
    const {
      ranking,
      rankingMode,
      reload,
      options,
      fetchRanking,
      clearRanking,
    } = this.props;
    if (!ranking || !ranking.items || reload) {
      clearRanking(rankingMode);
      InteractionManager.runAfterInteractions(() => {
        fetchRanking(rankingMode, options);
      });
    }
  }

  componentDidUpdate(prevProps) {
    const { options, rankingMode, fetchRanking, clearRanking } = this.props;
    const { options: prevOptions } = prevProps;
    if (
      options &&
      (!prevOptions ||
        options.mode !== prevOptions.mode ||
        options.date !== prevOptions.date ||
        options.language !== prevOptions.language)
    ) {
      InteractionManager.runAfterInteractions(() => {
        clearRanking(rankingMode);
        fetchRanking(rankingMode, options);
      });
    }
  }

  loadMoreItems = () => {
    const {
      ranking: { nextUrl, loading },
      rankingMode,
      options,
      fetchRanking,
    } = this.props;
    if (!loading && nextUrl) {
      fetchRanking(rankingMode, options, nextUrl);
    }
  };

  handleOnRefresh = () => {
    const { rankingMode, options, fetchRanking, clearRanking } = this.props;
    clearRanking(rankingMode);
    fetchRanking(rankingMode, options, null, true);
  };

  render() {
    const { ranking, items, listKey, renderHeader } = this.props;
    return (
      <NovelList
        data={{ ...ranking, items }}
        listKey={listKey}
        renderHeader={renderHeader}
        loadMoreItems={this.loadMoreItems}
        onRefresh={this.handleOnRefresh}
      />
    );
  }
}

NovelRankingList.defaultProps = {
  reload: true,
};

export default connect(() => {
  const getRankingItems = makeGetNovelRankingItems();
  return (state, props) => {
    const { ranking } = state;
    return {
      ranking: ranking[props.rankingMode],
      items: getRankingItems(state, props),
      listKey: `${props.route.key}-${props.rankingMode}`,
    };
  };
}, rankingActionCreators)(NovelRankingList);
