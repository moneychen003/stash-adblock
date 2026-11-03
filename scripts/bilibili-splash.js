// SPDX-License-Identifier: GPL-3.0-or-later
(function () {
  'use strict';

  const ALLOWED_HOSTS = new Set([
    'app.bilibili.com',
    'app.biliapi.net',
    'app.biliapi.com'
  ]);
  const SPLASH_PATH = /^\/x\/v2\/splash\/(?:list|show|brand\/list|event\/list2)$/;

  function parseJsonWithRanges(source) {
    let i = 0;

    function fail(message) {
      throw new Error(message + ' at byte ' + i);
    }

    function whitespace() {
      while (i < source.length) {
        const c = source.charCodeAt(i);
        if (c !== 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) break;
        i += 1;
      }
    }

    function stringNode() {
      const start = i;
      if (source[i] !== '"') fail('expected string');
      i += 1;
      while (i < source.length) {
        const c = source.charCodeAt(i);
        if (c === 0x22) {
          i += 1;
          const raw = source.slice(start, i);
          let value;
          try {
            value = JSON.parse(raw);
          } catch (_) {
            fail('invalid string');
          }
          return { kind: 'string', start, end: i, raw, value };
        }
        if (c < 0x20) fail('control character in string');
        if (c === 0x5c) {
          i += 1;
          if (i >= source.length) fail('unterminated escape');
          const escaped = source[i];
          if (escaped === 'u') {
            if (!/^[0-9a-fA-F]{4}$/.test(source.slice(i + 1, i + 5))) {
              fail('invalid unicode escape');
            }
            i += 5;
            continue;
          }
          if (!'"\\/bfnrt'.includes(escaped)) fail('invalid escape');
        }
        i += 1;
      }
      fail('unterminated string');
    }

    function numberNode() {
      const start = i;
      const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(source.slice(i));
      if (!match) fail('expected number');
      i += match[0].length;
      return { kind: 'number', start, end: i, raw: source.slice(start, i) };
    }

    function arrayNode() {
      const start = i;
      i += 1;
      whitespace();
      const items = [];
      if (source[i] === ']') {
        i += 1;
        return { kind: 'array', start, end: i, items };
      }
      while (true) {
        items.push(valueNode());
        whitespace();
        if (source[i] === ']') {
          i += 1;
          return { kind: 'array', start, end: i, items };
        }
        if (source[i] !== ',') fail('expected comma in array');
        i += 1;
        whitespace();
      }
    }

    function objectNode() {
      const start = i;
      i += 1;
      whitespace();
      const props = [];
      if (source[i] === '}') {
        i += 1;
        return { kind: 'object', start, end: i, props };
      }
      while (true) {
        const key = stringNode();
        whitespace();
        if (source[i] !== ':') fail('expected colon in object');
        i += 1;
        whitespace();
        const value = valueNode();
        props.push({ key: key.value, keyNode: key, value });
        whitespace();
        if (source[i] === '}') {
          i += 1;
          return { kind: 'object', start, end: i, props };
        }
        if (source[i] !== ',') fail('expected comma in object');
        i += 1;
        whitespace();
      }
    }

    function valueNode() {
      whitespace();
      const start = i;
      const c = source[i];
      if (c === '{') return objectNode();
      if (c === '[') return arrayNode();
      if (c === '"') return stringNode();
      if (c === 't' && source.slice(i, i + 4) === 'true') {
        i += 4;
        return { kind: 'boolean', start, end: i, raw: 'true', value: true };
      }
      if (c === 'f' && source.slice(i, i + 5) === 'false') {
        i += 5;
        return { kind: 'boolean', start, end: i, raw: 'false', value: false };
      }
      if (c === 'n' && source.slice(i, i + 4) === 'null') {
        i += 4;
        return { kind: 'null', start, end: i, raw: 'null' };
      }
      if (c === '-' || (c >= '0' && c <= '9')) return numberNode();
      fail('unexpected token');
    }

    const root = valueNode();
    whitespace();
    if (i !== source.length) fail('trailing data');
    return root;
  }

  function uniqueProp(objectNode, name) {
    if (!objectNode || objectNode.kind !== 'object') return null;
    const matches = objectNode.props.filter((prop) => prop.key === name);
    return matches.length === 1 ? matches[0].value : null;
  }

  function numberIsZero(node) {
    return Boolean(node && node.kind === 'number' && JSON.parse(node.raw) === 0);
  }

  function numberIsNonZero(node) {
    if (!node || node.kind !== 'number') return false;
    const value = Number(node.raw);
    return Number.isFinite(value) && value !== 0;
  }

  function isExplicitAd(item) {
    if (!item || item.kind !== 'object') return false;
    const isAd = uniqueProp(item, 'is_ad');
    if (isAd && ((isAd.kind === 'boolean' && isAd.value === true) || numberIsNonZero(isAd))) {
      return true;
    }
    const adInfo = uniqueProp(item, 'ad_info');
    if (adInfo && adInfo.kind === 'object' && adInfo.props.length > 0) return true;
    if (adInfo && adInfo.kind === 'string' && adInfo.value.length > 0) return true;
    return false;
  }

  function filteredBrandArray(source, objectNode) {
    const node = uniqueProp(objectNode, 'list');
    if (!node || node.kind !== 'array') return null;
    const kept = node.items.filter((item) => !isExplicitAd(item));
    if (kept.length === node.items.length) return null;
    if (kept.length === 0) return '[]';
    const first = node.items[0];
    const last = node.items[node.items.length - 1];
    const prefix = source.slice(node.start + 1, first.start);
    const suffix = source.slice(last.end, node.end);
    return '[' + prefix + kept.map((item) => source.slice(item.start, item.end)).join(',') + suffix;
  }

  function cleanDataObject(source, data, pathname) {
    const values = new Map();
    const deletes = new Set(['event_list', 'preload', 'show']);
    const replaceIfUnique = (name, transform) => {
      const propList = data.props.filter((prop) => prop.key === name);
      if (propList.length !== 1) return;
      const value = propList[0].value;
      const replacement = transform(value);
      if (replacement !== null && replacement !== source.slice(value.start, value.end)) {
        values.set(name, replacement);
      }
    };

    replaceIfUnique('keep_ids', (node) => node.kind === 'array' ? '[]' : null);
    replaceIfUnique('max_time', (node) => node.kind === 'number' ? '0' : null);

    if (pathname === '/x/v2/splash/list' || pathname === '/x/v2/splash/show') {
      replaceIfUnique('list', (node) => node.kind === 'array' ? '[]' : null);
    } else if (pathname === '/x/v2/splash/event/list2') {
      replaceIfUnique('list', (node) => node.kind === 'array' ? '[]' : null);
    } else if (pathname === '/x/v2/splash/brand/list') {
      replaceIfUnique('list', (node) => node.kind === 'array' ? filteredBrandArray(source, data) : null);
    }

    const kept = [];
    let changed = false;
    for (const prop of data.props) {
      const duplicateTarget = data.props.filter((candidate) => candidate.key === prop.key).length !== 1;
      if (!duplicateTarget && deletes.has(prop.key)) {
        changed = true;
        continue;
      }
      let valueRaw = source.slice(prop.value.start, prop.value.end);
      if (!duplicateTarget && values.has(prop.key)) {
        valueRaw = values.get(prop.key);
        changed = true;
      }
      kept.push(source.slice(prop.keyNode.start, prop.value.start) + valueRaw);
    }
    if (!changed) return null;

    const first = data.props[0];
    const last = data.props[data.props.length - 1];
    const prefix = source.slice(data.start + 1, first.keyNode.start);
    const suffix = source.slice(last.value.end, data.end - 1);
    return '{' + prefix + kept.join(',') + suffix + '}';
  }

  function transform(raw, url, status, method) {
    if (method && String(method).toUpperCase() !== 'GET') return raw;
    if (!Number.isFinite(Number(status)) || Number(status) < 200 || Number(status) >= 300) return raw;
    if (typeof raw !== 'string' || raw.length === 0) return raw;

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (_) {
      return raw;
    }
    if (!ALLOWED_HOSTS.has(parsedUrl.hostname) || !SPLASH_PATH.test(parsedUrl.pathname)) return raw;

    let root;
    try {
      root = parseJsonWithRanges(raw);
    } catch (_) {
      return raw;
    }
    if (!root || root.kind !== 'object') return raw;

    const code = uniqueProp(root, 'code');
    if (!numberIsZero(code)) return raw;
    const data = uniqueProp(root, 'data');
    if (!data || data.kind !== 'object') return raw;

    if (data.props.length === 0) return raw;
    const replacement = cleanDataObject(raw, data, parsedUrl.pathname);
    if (replacement === null) return raw;
    return raw.slice(0, data.start) + replacement + raw.slice(data.end);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { transform, parseJsonWithRanges };
    return;
  }

  try {
    const body = $response && $response.body;
    if (typeof body !== 'string') {
      $done({});
    } else {
      const output = transform(body, $request.url, $response.status, $request.method);
      if (output === body) $done({});
      else { console.log("bili-splash-cleanup-v1: cleaned " + body.length + " -> " + output.length + " bytes"); $done({ body: output }); }
    }
  } catch (error) {
    console.log('bili-splash-cleanup: ' + String(error));
    $done({});
  }
})();
