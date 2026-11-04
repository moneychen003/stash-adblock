// SPDX-License-Identifier: GPL-3.0-or-later
// Ad identifiers adapted from fmz200/wool_scripts Scripts/cnftp.js (4b7830670baf235ed945085cb926dc499cf619e0).
(function () {
  'use strict';
  const url = String($request.url || '');
  const iqiyi = /(?:iqiyi\.com|\/3f1\/cards\.iqiyi\.com)\//.test(url);
  const mgtv = /mgtv\.com\//.test(url);
  if (!iqiyi && !mgtv) return $done({});
  const status = Number($response.statusCode || $response.status || 200);
  if (status < 200 || status >= 300 || typeof $response.body !== 'string') return $done({});
  try {
    const root = JSON.parse($response.body);
    if (!root || typeof root !== 'object' || Array.isArray(root)) return $done({});
    let changed = false;
    const remove = (obj, keys) => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
      for (const key of keys) if (Object.prototype.hasOwnProperty.call(obj, key)) {
        delete obj[key]; changed = true;
      }
    };
    const filter = (obj, key, predicate) => {
      if (!obj || !Array.isArray(obj[key])) return;
      const before = obj[key].length;
      obj[key] = obj[key].filter(predicate);
      if (obj[key].length !== before) changed = true;
    };
    if (iqiyi) {
      if (/\.cupid\.iqiyi\.com\/mixer\?/.test(url) && root.errorCode === 0) {
        remove(root, ['adSlots', 'splashLottieFile', 'splashUiConfig']);
      } else if (/\/views_category\/3\.0\//.test(url)) {
        remove(root.base && root.base.statistics, ['ad_str']);
        for (const card of root.cards || []) filter(card, 'blocks', block =>
          !['block_321', 'block_415', 'block_416'].includes(block && block.block_name) &&
          !(block && block.buttons && block.buttons[0] && block.buttons[0].id === 'ad'));
      } else if (/\/views_home\/3\.0\//.test(url)) {
        remove(root.base && root.base.statistics, ['ad_str']);
        filter(root, 'cards', card => !['ad_mobile_flow', 'ad_trueview', 'qy_home_vip_opr_banner'].includes(card && card.alias_name));
      } else if (/\/waterfall\/3\.0\//.test(url)) {
        remove(root.base && root.base.statistics, ['ad_str']);
        for (const card of root.cards || []) filter(card, 'blocks', block => !(block && Object.prototype.hasOwnProperty.call(block, 'block_class')));
        filter(root, 'cards', card => !(card && Object.prototype.hasOwnProperty.call(card, 'block_class')));
      } else if (/\/views_search\/3\.0\//.test(url)) {
        const adIds = new Set(['ad_mobile_flow', 'hot_query_search_top_ad', 'search_mid_text_ad', 'search_small_card_ad', 'search_vip_banner']);
        filter(root, 'cards', card => !adIds.has(card && card.strategy_com_id));
        for (const card of root.cards || []) filter(card, 'blocks', block => !(block && block.block_type === 959));
      } else if (/\/views_plt\/3\.0\/player_tabs_v2/.test(url)) {
        remove(root.kv_pair, ['vip_fixed_card']);
        filter(root, 'cards', card => !['play_ad_no_vip', 'play_vip_promotion'].includes(card && card.alias_name));
      } else if (/\/fusion\/3\.0\/common_switch/.test(url)) {
        remove(root.content && root.content.resource, ['cast_device_ad', 'ip_restriction_ad', 'ppc_feed_insert', 'speed_ad']);
      }
    } else if (mgtv) {
      if (/\/dynamic\/v1\/channel\/index\//.test(url)) {
        remove(root, ['adInfo']);
        const adModules = new Set(['842', '5418']);
        filter(root, 'data', item => !adModules.has(item && item.moduleEntityId));
        filter(root, 'moduleIDS', item => !adModules.has(item && item.moduleEntityId));
      } else if (/\/mobile\/config\?/.test(url)) {
        if (root.data && Object.prototype.hasOwnProperty.call(root.data, 'dc_adConfig')) {
          root.data.dc_adConfig = '0'; changed = true;
        }
        if (root.data && Object.prototype.hasOwnProperty.call(root.data, 'relative_ads')) {
          root.data.relative_ads = '0'; changed = true;
        }
      } else if (/\/v1\/vod\/info\?/.test(url)) {
        filter(root.data && root.data.template, 'modules', item => ![701, 702].includes(item && item.dataType));
      } else if (/\/v3\/module\/list\?/.test(url)) {
        filter(root.data, 'list', item => !(item && item.moduleType === 6));
      }
    }
    if (changed) return $done({body: JSON.stringify(root)});
  } catch (_) {}
  $done({});
})();
