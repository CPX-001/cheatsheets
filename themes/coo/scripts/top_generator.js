// Curated recommendations, independent of upstream traffic analytics.
hexo.extend.helper.register('topPosts', function (maximum = 4) {
  return (this.theme.index_recommends || [])
    .map((slug) => this.site.posts.findOne({ slug }))
    .filter(Boolean)
    .slice(0, maximum);
});
