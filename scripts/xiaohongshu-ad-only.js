// SPDX-License-Identifier: GPL-3.0-or-later
// Original adapter. Ad endpoint and field evidence: fmz200/wool_scripts,
// Scripts/xiaohongshu/xiaohongshu.js at 4b7830670baf235ed945085cb926dc499cf619e0.
// The upstream source is GPL-3.0; this adapter does no storage or network I/O.
(function () {
  'use strict';
  function pass() { $done({}); }

  var url = String(($request && $request.url) || '');
  var match = /^https?:\/\/([^/?#]+)\/api\/sns\/(v\d+)\/(search\/(?:banner_list|notes)|system_service\/(?:config|splash_config)|homefeed|note\/videofeed)(?:[?#]|$)/.exec(url);
  if (!match) return pass();
  var host = match[1], version = match[2], endpoint = match[3];
  var edith = /^edith\.(?:xiaohongshu|rnote)\.com$/.test(host);
  var feedHost = /^(?:edith|rec|www)\.(?:xiaohongshu|rnote)\.com$/.test(host);
  if (endpoint === 'search/banner_list' || endpoint.indexOf('system_service/') === 0) {
    if (!edith) return pass();
  } else if (endpoint === 'search/notes') {
    if (!/^(?:so|edith)\.(?:xiaohongshu|rnote)\.com$/.test(host)) return pass();
  } else if (endpoint === 'homefeed') {
    if (!feedHost || version !== 'v6') return pass();
  } else if (!feedHost || !/^(?:v3|v4)$/.test(version)) return pass();

  if ($request.method && !['GET', 'POST'].includes(String($request.method).toUpperCase())) return pass();
  var status = Number($response && ($response.statusCode || $response.status || 200));
  if (status !== 200 || !$response || typeof $response.body !== 'string') return pass();
  var source = $response.body;
  if (!source) return pass();

  // Parse only to locate JSON spans. Every retained value is copied verbatim,
  // including integer IDs beyond Number.MAX_SAFE_INTEGER and unusual number lexemes.
  function parse(text) {
    var i = 0;
    function ws() { while (i < text.length && /[ \t\r\n]/.test(text[i])) i++; }
    function string() {
      var start = i++;
      if (text[start] !== '"') throw Error('string');
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i++] === '"') {
          var raw = text.slice(start, i);
          return {kind: 'string', start: start, end: i, value: JSON.parse(raw)};
        }
      }
      throw Error('string end');
    }
    function value() {
      ws();
      var start = i, c = text[i], items, props, key, node, m;
      if (c === '"') return string();
      if (c === '[') {
        i++; items = []; ws();
        if (text[i] !== ']') while (true) {
          items.push(value()); ws();
          if (text[i] === ']') break;
          if (text[i++] !== ',') throw Error('array comma');
        }
        i++; return {kind: 'array', start: start, end: i, items: items};
      }
      if (c === '{') {
        i++; props = []; ws();
        if (text[i] !== '}') while (true) {
          ws(); key = string(); ws();
          if (text[i++] !== ':') throw Error('object colon');
          node = value(); props.push({key: key.value, start: key.start, end: node.end, value: node});
          ws(); if (text[i] === '}') break;
          if (text[i++] !== ',') throw Error('object comma');
        }
        i++; return {kind: 'object', start: start, end: i, props: props};
      }
      m = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
      if (m) { i += m[0].length; return {kind: 'number', start: start, end: i, value: m[0]}; }
      for (var literal of ['true', 'false', 'null']) {
        if (text.slice(i, i + literal.length) === literal) {
          i += literal.length;
          return {kind: literal, start: start, end: i, value: literal === 'true'};
        }
      }
      throw Error('value');
    }
    var root = value(); ws();
    if (i !== text.length) throw Error('trailing data');
    return root;
  }
  function prop(obj, name) {
    if (!obj || obj.kind !== 'object') return null;
    var matches = obj.props.filter(function (p) { return p.key === name; });
    return matches.length === 1 ? matches[0].value : null;
  }
  function has(obj, name) {
    return !!(obj && obj.kind === 'object' && obj.props.some(function (p) { return p.key === name; }));
  }
  function str(obj, name) {
    var n = prop(obj, name);
    return n && n.kind === 'string' ? n.value : '';
  }
  function truthy(node) {
    return !!node && (node.kind === 'true' || (node.kind === 'number' && node.value === '1'));
  }
  function ad(item) {
    if (!item || item.kind !== 'object') return false;
    var info = prop(item, 'ads_info');
    if (info && ((info.kind === 'object' && info.props.length) ||
        (info.kind === 'array' && info.items.length) ||
        (info.kind === 'string' && info.value.length) || truthy(info))) return true;
    if (truthy(prop(item, 'is_ad')) || truthy(prop(item, 'is_advert')) || truthy(prop(item, 'is_advertisement'))) return true;
    return /^(?:ad|ads|advert|advertisement|sponsored|feed_ad)$/.test(str(item, 'model_type')) ||
      /^(?:ad|ads|advert|advertisement|sponsored|feed_ad)$/.test(str(item, 'type'));
  }
  var edits = [], count = 0;
  function replace(node, value) { edits.push({start: node.start, end: node.end, value: value}); count++; }
  function filter(list) {
    if (!list || list.kind !== 'array') return;
    var kept = list.items.filter(function (item) { return !ad(item); });
    if (kept.length === list.items.length) return;
    replace(list, '[' + kept.map(function (item) { return source.slice(item.start, item.end); }).join(',') + ']');
  }

  try {
    var root = parse(source), data = prop(root, 'data');
    if (!root || root.kind !== 'object' || !data) return pass();
    if (endpoint === 'search/banner_list') {
      // Dedicated search banner inventory in the GPL source; retain response metadata.
      if (data.kind === 'object' && data.props.length) replace(data, '{}');
      else if (data.kind === 'array' && data.items.length) replace(data, '[]');
    } else if (endpoint === 'system_service/config') {
      // Upstream also removed app_theme/loading_img/store. They are ordinary UI.
      if (data.kind === 'object' && has(data, 'splash')) {
        var kept = data.props.filter(function (p) { return p.key !== 'splash'; });
        replace(data, '{' + kept.map(function (p) { return source.slice(p.start, p.end); }).join(',') + '}');
      }
    } else if (endpoint === 'system_service/splash_config') {
      var groups = prop(data, 'ads_groups');
      if (groups && groups.kind === 'array' && groups.items.length) replace(groups, '[]');
    } else if (endpoint === 'search/notes') {
      filter(prop(data, 'items'));
    } else {
      filter(data);
      // Some feed versions wrap the same inventory in data.items.
      if (data.kind === 'object') filter(prop(data, 'items'));
    }
    if (!count) return pass();
    edits.sort(function (a, b) { return b.start - a.start; });
    var output = source;
    for (var edit of edits) output = output.slice(0, edit.start) + edit.value + output.slice(edit.end);
    $done({body: output});
  } catch (_) { pass(); }
})();
