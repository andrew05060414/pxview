const buildNovelShareOptions = ({ id, title }) => ({
  title,
  type: 'text/plain',
  message: `https://www.pixiv.net/novel/show.php?id=${id}`,
});

export default buildNovelShareOptions;
