// SPDX-License-Identifier: GPL-3.0-or-later
// ZhihuAdOnly v1: local response filtering. No network, storage or account changes.
(function () {
  function done(value) { $done(value || {}); }
  try {
    if (!$request || $request.method !== 'GET' || !$response || Number($response.status) !== 200 || typeof $response.body !== 'string') return done();
    var url = $request.url;
    var allowed = /^https:\/\/(?:api|web-render)\.zhihu\.com\/(?:topstory\/(?:recommend|hot-lists?)|questions\/\d+\/feeds?|v4\/questions\/\d+\/answers|next-render)(?:[/?]|$)/;
    if (!allowed.test(url)) return done();
    var input = $response.body;
    var prefix = '__ZH_ADONLY_NUMBER_';
    if (input.indexOf(prefix) !== -1) return done();
    // Preserve large integer IDs and fractional/exponent lexemes when reserializing JSON.
    var numbers = [], safe = '', i = 0;
    while (i < input.length) {
      var ch = input[i];
      if (ch === '"') {
        var start = i++;
        while (i < input.length) {
          if (input[i] === '\\') { i += 2; continue; }
          if (input[i++] === '"') break;
        }
        safe += input.slice(start, i); continue;
      }
      if (ch === '-' || (ch >= '0' && ch <= '9')) {
        var match = input.slice(i).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
        if (!match) return done();
        var token = match[0];
        if (/^-?\d+$/.test(token) && token !== '-0' && Number.isSafeInteger(Number(token))) safe += token;
        else { safe += JSON.stringify(prefix + numbers.length + '__'); numbers.push(token); }
        i += token.length; continue;
      }
      safe += ch; i++;
    }
    var body = JSON.parse(safe), removed = 0;
    if (!body || typeof body !== 'object') return done();
    function isAd(item) {
      return !!item && typeof item === 'object' &&
        (item.type === 'feed_advert' || (item.target && item.target.type === 'feed_advert') || item.is_advert === true || item.is_advert === 1);
    }
    function filter(container, key) {
      if (!container || typeof container !== 'object' || !Array.isArray(container[key])) return;
      var before = container[key];
      var after = before.filter(function (item) { return !isAd(item); });
      if (before.length !== after.length) { removed += before.length - after.length; container[key] = after; }
    }
    filter(body, 'data'); filter(body, 'items'); filter(body, 'feeds');
    if (body.data && !Array.isArray(body.data) && typeof body.data === 'object') {
      filter(body.data, 'data'); filter(body.data, 'items'); filter(body.data, 'feeds');
    }
    // On answer/feed endpoints, clear only explicitly named advertising metadata.
    if (/\/(?:questions\/\d+\/feeds?|v4\/questions\/\d+\/answers|next-render)(?:[/?]|$)/.test(url)) {
      [body, body.data].forEach(function (obj) {
        if (obj && !Array.isArray(obj) && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, 'ad_info') && obj.ad_info !== null) { obj.ad_info = null; removed++; }
      });
    }
    if (!removed) return done();
    var output = JSON.stringify(body).replace(/"__ZH_ADONLY_NUMBER_(\d+)__"/g, function (_, index) { return numbers[Number(index)]; });
    console.log('[ZhihuAdOnly] removed=' + removed);
    return done({body: output});
  } catch (_) { return done(); }
})();
