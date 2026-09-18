const Utils = {
  LIBRARY: {
    fuse: { lib: ['/js/fuse_7.1.0.js'], instance: 'Fuse', attr: { async: !0 } }
  },
  loadScripts(e, t, n = {}, i = document.head) {
    const o = [];
    for (const t in e)
      (o[t] = document.createElement('script')),
        o[t].setAttribute('type', 'text/javascript'),
        o[t].setAttribute('src', e[t]),
        Object.keys(n).forEach((e) => {
          o[t].setAttribute(e, n[e]);
        });
    !(function e() {
      const n = o.shift();
      let s = !1;
      i.appendChild(n),
        (n.onload = n.onreadystatechange =
          function () {
            const n = this.readyState;
            (n && 'complete' !== n && 'loaded' !== n) || s || ((s = !0), o.length ? e() : t());
          });
    })();
  },
  externalLibrary(e) {
    return new Promise((t) => {
      void 0 === window[e.instance] || null === window[e.instance]
        ? this.loadScripts(
            e.lib,
            () => {
              t(window[e.instance]);
            },
            e.attr,
            e.container
          )
        : t(window[e.instance]);
    });
  }
};
function initShareDropdown() {
  const e = document.getElementById('share-dropdown'),
    t = document.getElementById('share-trigger'),
    n = document.getElementById('share-menu');
  function i() {
    'true' === t.getAttribute('aria-expanded') && o();
  }
  function o() {
    const e = t.getBoundingClientRect();
    let i = e.right - 224,
      o = e.bottom + 8;
    const s = window.innerWidth;
    i < 8 && (i = 8),
      i + 224 > s - 8 && (i = s - 224 - 8),
      o + 300 > window.innerHeight && (o = e.top - 300 - 8),
      (n.style.left = `${i}px`),
      (n.style.top = `${o}px`);
  }
  function s() {
    t.setAttribute('aria-expanded', 'false'),
      (n.style.pointerEvents = 'none'),
      n.classList.remove('opacity-100', 'visible', 'scale-100'),
      n.classList.add('opacity-0', 'invisible', 'scale-95');
  }
  e &&
    t &&
    n &&
    (t.addEventListener('click', (e) => {
      e.preventDefault(), e.stopPropagation();
      'true' === t.getAttribute('aria-expanded')
        ? s()
        : (t.setAttribute('aria-expanded', 'true'),
          o(),
          (n.style.pointerEvents = 'auto'),
          n.classList.remove('opacity-0', 'invisible', 'scale-95'),
          n.classList.add('opacity-100', 'visible', 'scale-100'));
    }),
    document.addEventListener('click', (t) => {
      e.contains(t.target) || n.contains(t.target) || s();
    }),
    document.addEventListener('keydown', (e) => {
      'Escape' === e.key && s();
    }),
    window.addEventListener('scroll', i),
    window.addEventListener('resize', i),
    window.addEventListener('pagehide', s),
    window.addEventListener('pageshow', (e) => {
      e.persisted && s();
    }));
}
function fallbackCopyToClipboard(e) {
  const t = document.createElement('textarea');
  (t.value = e),
    (t.style.position = 'fixed'),
    (t.style.left = '-999999px'),
    (t.style.top = '-999999px'),
    document.body.appendChild(t),
    t.focus(),
    t.select();
  try {
    document.execCommand('copy'), showCopyNotification('Link copied to clipboard!');
  } catch {
    showCopyNotification('Failed to copy link');
  }
  document.body.removeChild(t);
}
function showCopyNotification(e) {
  const t = document.createElement('div');
  (t.className =
    'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300'),
    (t.textContent = e),
    document.body.appendChild(t),
    setTimeout(() => {
      t.classList.remove('translate-x-full');
    }, 100),
    setTimeout(() => {
      t.classList.add('translate-x-full'),
        setTimeout(() => {
          document.body.removeChild(t);
        }, 300);
    }, 2e3);
}
!(function () {
  function e() {
    const e = document.querySelector('.site-navbar'),
      t = document.querySelector('.site-navbar-slot');
    if (!e || !t) return;
    const n = t.closest('header'),
      i = document.documentElement;
    let o = window.scrollY,
      s = 0,
      a = !0,
      c = !1;
    function r(t) {
      n.classList.toggle('has-floating-navbar', t),
        e.classList.toggle('is-floating', t),
        e.classList.toggle('is-visible', a),
        i.classList.toggle('has-visible-navbar', t && a);
    }
    function l() {
      c = !1;
      const n = Math.max(0, i.scrollHeight - window.innerHeight),
        l = Math.max(0, Math.min(window.scrollY, n)),
        d = l - o;
      s = Math.sign(d) === Math.sign(s) ? s + d : d;
      const h = l > t.offsetTop + t.offsetHeight,
        u = e.contains(document.activeElement) || e.querySelector('[aria-expanded="true"]');
      !h || u ? (a = !0) : Math.abs(s) >= 8 && (a = s < 0), r(h), (o = l);
    }
    function d() {
      c || ((c = !0), window.requestAnimationFrame(l));
    }
    function h() {
      const n = e.getBoundingClientRect().height;
      (t.style.height = `${n}px`), i.style.setProperty('--site-navbar-height', `${n}px`), d();
    }
    e.addEventListener('focusin', () => {
      (a = !0), r(e.classList.contains('is-floating'));
    }),
      window.addEventListener('scroll', d, { passive: !0 }),
      window.addEventListener('resize', h),
      window.addEventListener('pageshow', d),
      new ResizeObserver(h).observe(e),
      h();
  }
  'loading' === document.readyState ? document.addEventListener('DOMContentLoaded', e) : e();
})(),
  (function () {
    function e() {
      const e = document.getElementById('toc-container'),
        t = document.getElementById('toc-list');
      if (!e || !t) return;
      const n = document.querySelectorAll('.h2-wrap h2');
      if (0 === n.length) return void (e.style.display = 'none');
      function i() {
        const e = document.querySelectorAll('.toc-link');
        let i = -1;
        const o = window.pageYOffset + 100;
        for (let e = n.length - 1; e >= 0; e--)
          if (n[e].offsetTop <= o) {
            i = e;
            break;
          }
        e.forEach((e, t) => {
          e.classList.remove('active'),
            t <= i ? e.classList.add('read') : e.classList.remove('read');
        }),
          i >= 0 && e[i] && e[i].classList.add('active');
        let s = 0;
        i >= 0 && (s = ((i + 1) / n.length) * 100);
        const a =
            (window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) *
            100,
          c = Math.max(s, a || 0);
        t.style.setProperty('--progress-height', `${Math.min(c, 100)}%`);
      }
      (t.innerHTML = ''),
        n.forEach((e, n) => {
          let i = e.textContent.trim().replace(/^#+\s*/, '');
          const o = e.id || `heading-${n}`;
          e.id || (e.id = o);
          const s = document.createElement('a');
          (s.href = `#${o}`),
            (s.className = 'toc-link'),
            s.setAttribute('data-tooltip', i),
            s.addEventListener('click', (e) => {
              e.preventDefault();
              const t = document.getElementById(o);
              if (t) {
                const e =
                  t.getBoundingClientRect().top + window.pageYOffset - window.innerHeight / 2;
                window.scrollTo({ top: Math.max(0, e), behavior: 'smooth' }),
                  window.history.replaceState(window.history.state, '', `#${o}`);
              }
            }),
            t.appendChild(s);
        });
      let o = !1;
      e.addEventListener(
        'touchstart',
        function () {
          (o = !0), (e.style.transition = 'none');
        },
        { passive: !1 }
      ),
        e.addEventListener(
          'touchmove',
          function (t) {
            if (!o) return;
            t.preventDefault();
            const i = t.touches[0].clientY,
              s = e.getBoundingClientRect(),
              a = s.height,
              c = (i - s.top) / a,
              r = Math.floor(c * n.length),
              l = Math.max(0, Math.min(r, n.length - 1)),
              d = document.querySelectorAll('.toc-link');
            d.forEach((e, t) => {
              e.classList.remove('active'),
                t <= l ? e.classList.add('read') : e.classList.remove('read');
            }),
              d[l] && d[l].classList.add('active');
          },
          { passive: !1 }
        ),
        e.addEventListener(
          'touchend',
          function (t) {
            if (!o) return;
            (o = !1), (e.style.transition = '');
            const i = t.changedTouches[0].clientY,
              s = e.getBoundingClientRect(),
              a = s.height,
              c = (i - s.top) / a,
              r = Math.floor(c * n.length),
              l = Math.max(0, Math.min(r, n.length - 1));
            if (n[l]) {
              const e = n[l],
                t = e.getBoundingClientRect().top + window.pageYOffset - window.innerHeight / 2;
              window.scrollTo({ top: Math.max(0, t), behavior: 'smooth' }),
                window.history.replaceState(window.history.state, '', `#${e.id}`);
            }
          },
          { passive: !1 }
        ),
        window.addEventListener('scroll', i, { passive: !0 }),
        window.addEventListener('hashchange', i),
        i();
    }
    'loading' === document.readyState ? document.addEventListener('DOMContentLoaded', e) : e();
  })(),
  (window.shareOnX = function () {
    const e = encodeURIComponent(window.location.href),
      t = encodeURIComponent(document.title);
    window.open(`https://x.com/intent/tweet?text=${t}&url=${e}`, '_blank');
  }),
  (window.shareOnFacebook = function () {
    const e = encodeURIComponent(window.location.href);
    window.open(`https://facebook.com/sharer/sharer.php?u=${e}`, '_blank');
  }),
  (window.shareOnReddit = function () {
    const e = encodeURIComponent(window.location.href),
      t = encodeURIComponent(document.title);
    window.open(`https://reddit.com/submit/?url=${e}&resubmit=true&title=${t}`, '_blank');
  }),
  (window.shareOnPinterest = function () {
    const e = encodeURIComponent(window.location.href),
      t = encodeURIComponent(document.title);
    window.open(`https://pinterest.com/pin/create/button/?url=${e}&description=${t}`, '_blank');
  }),
  (window.shareOnLinkedIn = function () {
    const e = encodeURIComponent(window.location.href),
      t = encodeURIComponent(document.title);
    window.open(`https://www.linkedin.com/shareArticle?url=${e}&title=${t}`, '_blank');
  }),
  (window.shareOnLine = function () {
    const e = encodeURIComponent(window.location.href);
    window.open(`https://social-plugins.line.me/lineit/share?url=${e}`, '_blank');
  }),
  (window.shareViaEmail = function () {
    const e = encodeURIComponent(window.location.href),
      t = encodeURIComponent(document.title);
    window.location.href = `mailto:?subject=${t}&body=${e}`;
  }),
  (window.copyToClipboard = function () {
    const e = window.location.href;
    navigator.clipboard && window.isSecureContext
      ? navigator.clipboard
          .writeText(e)
          .then(() => {
            showCopyNotification('Link copied to clipboard!');
          })
          .catch(() => {
            fallbackCopyToClipboard(e);
          })
      : fallbackCopyToClipboard(e);
  }),
  window.addEventListener('load', () => {
    function e() {
      const e = window.location.hash,
        t = document.querySelector(`a[class="h-anchor"][href="${e}"]`);
      if (null !== t) {
        const e = t.parentElement.parentElement;
        document.querySelectorAll('.boxed').forEach((e) => {
          e.classList.remove('boxed');
        });
        const n = setTimeout(() => {
          e.classList.add('boxed'), clearTimeout(n);
        }, 100);
      }
    }
    function t(e) {
      const t = e || {},
        n = {
          trigger: '#mysearch-trigger',
          container: '#mysearch',
          dbPath: `${location.protocol}//${location.host}/search.json?v=1.0`
        };
      (this.container = void 0 !== t.container ? t.container : n.container),
        (this.trigger = void 0 !== t.trigger ? t.trigger : n.trigger),
        (this.dbPath = void 0 !== t.dbPath ? t.dbPath : n.dbPath),
        (this.lastSearch = {}),
        (window.search = this);
    }
    initShareDropdown(),
      document.querySelector('#darkMode').addEventListener('click', () => {
        const e = document.documentElement.classList;
        e.toggle('dark');
        const t = e.contains('dark');
        localStorage.theme = t ? 'dark' : '';
      }),
      document.querySelectorAll('ul.collapsible > li > strong').forEach((e) => {
        const t = e.parentElement;
        t.classList.add('active'),
          e.classList.toggle('arrow-down'),
          e.addEventListener('click', function () {
            t.classList.toggle('active'), this.classList.toggle('arrow-down');
          });
      }),
      document.querySelectorAll('.h3-wrap ul').forEach((e) => {
        const t = e.querySelectorAll('li').length,
          n = e.className.match('cols-([0-9]+)'),
          i = null === n ? 1 : parseInt(n[1]),
          o = 1 === t || t % i === 0 ? i : t % i;
        for (let t = 1; t <= o; t++) {
          const n = e.querySelector(`li:nth-last-child(${t})`);
          null !== n && (n.style.borderBottom = 'none');
        }
      }),
      e(),
      window.addEventListener('popstate', e),
      (t.prototype = {
        start() {
          const e = this;
          e.fetchData(),
            (this.search = document.querySelector(this.container)),
            (this.box = document.querySelector('#mysearch-box')),
            (this.input = document.querySelector('#mysearch-input')),
            (this.result = document.querySelector('#mysearch-list')),
            (this.lastSearch.query = this.input.value),
            this.detectModal();
          document.querySelector('.cancel').addEventListener('click', () => {
            e.closeModal(!0);
          });
          document.querySelector('#mysearch-clear').addEventListener('click', () => {
            e.doSearch('', !0).then();
          });
          const t = document.querySelector(e.trigger);
          t.addEventListener('click', () => {
            e.openModal(!0);
          }),
            document.body.addEventListener('click', (n) => {
              e.isOpened() && (e.box.contains(n.target) || t.contains(n.target) || e.closeModal());
            }),
            this.input.addEventListener('input', () => {
              const t = e.input.value;
              t !== e.lastSearch.query && e.doSearch(t, !0).then();
            }),
            document.body.addEventListener('keydown', (t) => {
              if (!t.target.closest('dialog[open]'))
                if ('ArrowDown' === t.key)
                  e.isOpened() && (e.moveItem(!1), t.preventDefault(), t.stopPropagation());
                else if ('ArrowUp' === t.key)
                  e.isOpened() && (e.moveItem(!0), t.preventDefault(), t.stopPropagation());
                else if ('Enter' === t.key && e.isOpened()) {
                  if (e.isOpened()) {
                    const t = e.result.querySelector('li.active > a');
                    null !== t && (window.location.href = t.getAttribute('href'));
                  }
                  t.preventDefault(), t.stopPropagation();
                } else
                  'Escape' === t.key && e.isOpened()
                    ? (e.closeModal(), t.preventDefault(), t.stopPropagation())
                    : (!t.ctrlKey && !t.metaKey) ||
                      'k' !== t.key ||
                      t.shiftKey ||
                      (e.toggleModal(), t.preventDefault(), t.stopPropagation());
            });
        },
        moveItem(e) {
          const t = this.result.querySelector('li.active');
          if (!t) return;
          const n = e ? t.previousElementSibling : t.nextElementSibling;
          null !== n &&
            (t.classList.remove('active'),
            t.classList.add('inactive'),
            n.classList.remove('inactive'),
            n.classList.add('active'),
            this.renderPreview());
        },
        detectModal() {
          const e = window.location.href,
            t = new URL(e).searchParams.get('q');
          null !== t && ((this.input.value = t), this.openModal(!1));
        },
        isOpened() {
          return this.search.classList.contains('block');
        },
        toggleModal() {
          this.isOpened() ? this.closeModal() : this.openModal();
        },
        openModal(e) {
          this.search.classList.remove('hidden'),
            this.search.classList.add('block'),
            e && (this.input.value = ''),
            document.body.classList.add('overflow-hidden'),
            this.doSearch(this.input.value, !1),
            this.input.focus();
        },
        closeModal(e) {
          this.search.classList.remove('block'),
            this.search.classList.add('hidden'),
            e && (this.input.value = ''),
            document.body.classList.remove('overflow-hidden'),
            this.input.blur();
        },
        changeUrl(e) {
          const t = `${location.protocol}//${location.host}${location.pathname}`;
          let n = t;
          '' !== e && null !== e && (n = `${t}?${e}`), history.pushState({}, null, n);
        },
        async fetchData() {
          const e = this;
          if (void 0 === e.index)
            return await fetch(e.dbPath)
              .then((e) => e.text())
              .then(
                (t) => (
                  (e.db = JSON.parse(t)),
                  (e.index = new Fuse(e.db, {
                    includeScore: !1,
                    shouldSort: !0,
                    includeMatches: !0,
                    matchEmptyQuery: !0,
                    threshold: 0.1,
                    keys: [
                      { name: 'title', weight: 12 },
                      { name: 'tags', weight: 6 },
                      { name: 'categories', weight: 6 },
                      { name: 'sections.h3.title', weight: 5 },
                      { name: 'sections.h2.title', weight: 1 },
                      { name: 'intro', weight: 1 }
                    ]
                  })),
                  (e.lastSearch.whole = e.db.map((e, t) => ({
                    item: e,
                    score: 1,
                    refIndex: t
                  }))),
                  t
                )
              );
        },
        async doSearch(e, t) {
          const n = this;
          const request = (this.searchRequest = (this.searchRequest || 0) + 1);
          await n.fetchData().then(() => {
            if (request !== this.searchRequest) return;
            if (this.lastSearch.query === e && void 0 !== this.lastSearch.resp)
              this.renderResult(this.lastSearch.resp), this.renderPreview();
            else {
              const i = '' !== e ? n.index.search(`${e}`) : n.lastSearch.whole;
              t && this.changeUrl('' === e ? null : `q=${e}`),
                (this.lastSearch.query = e),
                (this.lastSearch.resp = i),
                this.renderResult(i),
                this.renderPreview();
            }
          });
        },
        addEventToResult() {
          const e = this;
          this.result.querySelectorAll('li').forEach((t) => {
            t.addEventListener('mouseover', function () {
              e.isOpened() &&
                (e.result.querySelectorAll('li').forEach((e) => {
                  e.classList.remove('active'), e.classList.add('inactive');
                }),
                this.classList.remove('inactive'),
                this.classList.add('active'),
                e.renderPreview());
            });
          });
        },
        mark(e, t) {
          const n = [];
          let i = t.shift();
          for (let o = 0; o < e.length; o++) {
            const s = e.charAt(o);
            i && o === i[0] && n.push('<mark>'),
              n.push(s),
              i && o === i[1] && (n.push('</mark>'), (i = t.shift()));
          }
          return n.join('');
        },
        highlightMatches(e) {
          if (void 0 === e.matches || 0 === e.item.length) return;
          const t = this;
          (e.item = JSON.parse(JSON.stringify(t.db[e.refIndex]))),
            e.matches.forEach((n) => {
              switch (n.key) {
                case 'tags':
                case 'categories':
                  e.item[n.key][n.refIndex] = t.mark(n.value, n.indices);
                  break;
                case 'sections.h2.title':
                  e.item.sections[n.refIndex].h2.title = t.mark(n.value, n.indices);
                  break;
                case 'sections.h3.title': {
                  let i = 0,
                    o = 0;
                  for (let s = 0; s < e.item.sections.length; s++) {
                    const a = e.item.sections[s].h3;
                    if (((i += a.length), n.refIndex >= o && n.refIndex < i)) {
                      e.item.sections[s].h3[n.refIndex - o].title = t.mark(n.value, n.indices);
                      break;
                    }
                    o += a.length;
                  }
                  break;
                }
                default:
                  e.item[n.key] = t.mark(n.value, n.indices);
              }
            });
        },
        renderResult(e) {
          const t = this;
          let n = '',
            i = 0;
          e.forEach((e, o) => {
            let s = 'inactive';
            0 === i && (s = 'active'), t.highlightMatches(e);
            const a = e.item,
              c = a.tags || [],
              r = a.categories || [],
              l = c.join("<span class='text-slate-300 px-1'>•</span>");
            let d = '';
            '' !== l &&
              (d = `<div class="w-px h-3 bg-indigo-300 mr-2"></div><span class="mr-2">${l}</span>`),
              (n += `<li class="group ${s} m-3" data-index="${o}">\n                                <a href="${a.path}" class="flex justify-between items-center rounded-lg py-1 px-4 transition-colors duration-100 ease-in-out overflow-hidden">\n                                    <div class="flex items-start">\n                                        <div class="flex justify-center items-center w-5 mr-5 mt-2 flex-none">\n                                            <i class="icon text-2xl">${a.icon}</i>\n                                        </div>\n                                        <div class="flex flex-col truncate">\n                                            <span class="font-semibold dark:text-slate-300 dark:group-hover:text-white">${a.title}</span>\n                                            <div class="sub-intro flex items-center text-sm leading-tight mt-4 xl:mt-2 mb-2">\n                                                <span class="mr-2">${r[0]}</span>\n                                                ${d}\n                                            </div>\n                                        </div>\n                                    </div>\n                                    <i class="w-6 ml-8 p-2 icon icon-enter"></i>\n                                </a>\n                            </li>`),
              i++;
          }),
            (this.result.innerHTML = n),
            this.addEventToResult();
        },
        renderPreview() {
          const e = this.search.querySelector('li.active');
          if (null === e) return;
          const t = e.getAttribute('data-index'),
            n = this.lastSearch.resp[parseInt(t)].item;
          let i = '';
          n.sections.forEach((e) => {
            let t = '';
            e.h3.forEach((e) => {
              const i = n.path + e.anchor;
              t += `<a href="${i}" class="inline-block mr-1 px-2 p-0.5 transition duration-200 ease-in-out rounded-full hover:bg-indigo-500 text-slate-500 dark:text-slate-300 hover:text-slate-50">${e.title.toLowerCase()}</a>`;
            });
            const o = n.path + e.h2.anchor;
            i += `<li class="text-slate-700 dark:text-slate-300 hover:underline hover:text-slate-900 mt-3 mb-2">\n                                <a href="${o}"> ${e.h2.title}</a>\n                            </li>\n                            <span>${t}</span>`;
          }),
            (document.querySelector('.preview-panel').innerHTML =
              `<section class="w-full py-3 px-5">\n                <div class="flex justify-center pt-1 pb-4">\n                    <div class="flex justify-center items-center w-8 h-8 rounded ${void 0 === n.background ? 'bg-indigo-500' : n.background} shadow-lg">\n                        <i class="text-2xl text-slate-100">${n.icon}</i>\n                    </div>\n                </div>\n                <div class="flex justify-center items-center font-medium flex-wrap dark:text-slate-200">${n.title}</div>\n                <ol class="list-inside mt-4 pt-2 text-sm list-decimal">${i}</ol>\n            </section>`);
        }
      }),
      Utils.externalLibrary(Utils.LIBRARY.fuse)
        .then((e) => {
          void 0 !== e ? new t().start() : console.error('Fuse.js library failed to load');
        })
        .catch((e) => {
          console.error('Failed to load search library:', e);
        });
  });
