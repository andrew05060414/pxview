import extractNovelWebviewData from './novelWebviewParser';
import { NOVEL_RANKING_LANGUAGES } from '../constants';

export const NOVEL_LANGUAGE_UNKNOWN = 'unknown';

// Pixiv's novel ranking endpoint does not expose a language parameter or a
// stable language field. These conservative pairs are used against the full
// novel body, not the ranking title/caption. Text containing no decisive
// character is intentionally treated as unknown rather than Simplified Chinese.
const SIMPLIFIED_ONLY_CHARACTERS =
  '爱这个国们来说为与东书见会长开门问学车电风气后里发还过时听实现经给让当进边对关华乐万岁头声报数画网节亲阳阴难欢观务医认该变连种将总结处员区级计论识证设备标题读写买卖云从习双义专业产农卫厅厂广庆库录忆忧戏扑';
const TRADITIONAL_ONLY_CHARACTERS =
  '愛這個國們來說為與東書見會長開門問學車電風氣後裡發還過時聽實現經給讓當進邊對關華樂萬歲頭聲報數畫網節親陽陰難歡觀務醫認該變連種將總結處員區級計論識證設備標題讀寫買賣雲從習雙義專業產農衛廳廠廣慶庫錄憶憂戲撲';

const hasCharacterFrom = (text, characters) =>
  Array.from(text).some((character) => characters.includes(character));

const isHan = (character) =>
  /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(character);

const isKana = (character) => /[\u3040-\u30ff\uff66-\uff9d]/u.test(character);

export const detectNovelTextLanguage = (text) => {
  if (typeof text !== 'string' || !text.trim()) {
    return NOVEL_LANGUAGE_UNKNOWN;
  }

  const characters = Array.from(text);
  const hanCount = characters.filter(isHan).length;
  const kanaCount = characters.filter(isKana).length;

  if (hanCount < 6 || kanaCount > 0) {
    return NOVEL_LANGUAGE_UNKNOWN;
  }

  if (hasCharacterFrom(text, TRADITIONAL_ONLY_CHARACTERS)) {
    return NOVEL_LANGUAGE_UNKNOWN;
  }

  return hasCharacterFrom(text, SIMPLIFIED_ONLY_CHARACTERS)
    ? NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE
    : NOVEL_LANGUAGE_UNKNOWN;
};

const getNovelText = (novel) => {
  if (!novel || typeof novel !== 'object') {
    return '';
  }
  return novel.text || novel.content || '';
};

export const extractNovelData = (response, novelId) => {
  if (response && typeof response === 'object') {
    return response;
  }

  return extractNovelWebviewData(response, novelId);
};

export const extractNovelText = (response, novelId) => {
  return getNovelText(extractNovelData(response, novelId));
};

export const getNovelLanguageFromMetadata = (novel) => {
  const language = novel && (novel.language || novel.lang || novel.locale);
  if (typeof language !== 'string') {
    return null;
  }

  const normalizedLanguage = language.toLowerCase().trim().replace(/_/g, '-');
  if (
    ['zh-cn', 'zh-hans', 'zh-hans-cn', 'zh-sg'].includes(normalizedLanguage)
  ) {
    return NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE;
  }

  return NOVEL_LANGUAGE_UNKNOWN;
};
