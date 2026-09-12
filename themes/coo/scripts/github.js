hexo.extend.helper.register('request_cheatsheet', function () {
  return `${this.config.repository}/issues/new`;
});

hexo.extend.helper.register('contributing', function () {
  return this.config.repository;
});

hexo.extend.helper.register('edit_page', function () {
  const repo = this.config.repository;
  return this.page.layout === 'post'
    ? `${repo}/blob/main/source/_posts/${this.page.slug}.md`
    : repo;
});
