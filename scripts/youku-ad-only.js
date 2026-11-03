// SPDX-License-Identifier: GPL-3.0-or-later
// Ad field/type identifiers adapted from fmz200/wool_scripts, Scripts/cnftp.js.
// Source: https://github.com/fmz200/wool_scripts/blob/4b7830670baf235ed945085cb926dc499cf619e0/Scripts/cnftp.js
// This scoped implementation preserves navigation, playback data, watermarks and youth settings.
(function () {
  'use strict';
  const url = String($request.url || '');
  const page = /^https?:\/\/acs\.youku\.com\/gw\/mtop\.youku\.columbus\.(?:gateway\.new\.execute|home\.feed|home\.query|uc\.query|ycp\.query)(?:\/|\?|$)/.test(url);
  const play = /^https?:\/\/un-acs\.youku\.com\/gw\/mtop\.youku\.play\.ups\.appinfo\.get(?:\/|\?|$)/.test(url);
  const push = /^https?:\/\/push\.m\.youku\.com\/collect-api\/get_push_interval_config_wx\?/.test(url);
  if (!page && !play && !push) return $done({});
  const status = Number($response.statusCode || $response.status || 200);
  if (status < 200 || status >= 300 || typeof $response.body !== 'string') return $done({});
  try {
    const root = JSON.parse($response.body);
    if (!root || typeof root !== 'object' || Array.isArray(root)) return $done({});
    let changed = false;
    function removeFields(object, names) {
      if (!object || typeof object !== 'object' || Array.isArray(object)) return;
      for (const name of names) {
        if (Object.prototype.hasOwnProperty.call(object, name)) {
          delete object[name];
          changed = true;
        }
      }
    }
    if (play) removeFields(root.data && root.data.data, ['ad', 'ykad']);
    if (push) removeFields(root.data, ['tipContent', 'tipContentNew']);
    if (page) {
      const adTypes = new Set([
        'Phone运营banner', '播放页触达组件', '播放页广告组件', '播放页会员引导组件',
        '播放页活动组件', '播放页用户触达组件', '优酷购',
        'PHONE_FEED_CARD_S_AD', 'PHONE_FEED_CARD_B_AD', 'PHONE_H_UC_AD',
        'PHONE_YK_AD_BANNER', 'PHONE_IMG_A', 'UC广告抽屉', '橱窗广告'
      ]);
      const isHome = /columbus\.home\.(?:feed|query)/.test(url);
      const isUser = /columbus\.uc\.query/.test(url);
      const isComment = /columbus\.ycp\.query/.test(url);
      function walk(node, depth) {
        if (!node || typeof node !== 'object' || depth > 30) return;
        if (node.data && typeof node.data === 'object') {
          removeFields(node.data, ['crmSale']);
          if (isHome && Array.isArray(node.data.indexPositionResult) && node.data.indexPositionResult.length) {
            node.data.indexPositionResult = [];
            changed = true;
          }
        }
        if (Array.isArray(node.nodes)) {
          const before = node.nodes.length;
          node.nodes = node.nodes.filter(child => {
            if (!child || typeof child !== 'object') return true;
            if (adTypes.has(child.typeName)) return false;
            if (isHome && child.data && Object.prototype.hasOwnProperty.call(child.data, 'ad')) return false;
            if (isHome && [35505, 37335, 272768].includes(child.id)) return false;
            if (isUser && [32133, 32775, 22570, 35942, 38466, 110429].includes(child.id)) return false;
            if (isComment && node.id === 23243 && child.id === -1000) return false;
            return true;
          });
          if (before !== node.nodes.length) changed = true;
          for (const child of node.nodes) walk(child, depth + 1);
        }
      }
      // Only traverse the two upstream page trees; do not visit unrelated account/config objects.
      for (const key of ['2019030100', '2019061000']) {
        const tree = root.data && root.data[key] && root.data[key].data;
        if (tree) walk(tree, 0);
      }
    }
    if (changed) return $done({body: JSON.stringify(root)});
  } catch (_) {}
  $done({});
})();
