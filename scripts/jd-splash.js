// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * Scoped JD splash handler. Ordinary API responses pass through unchanged.
 * Scope: JD api.m.jd.com/client.action splash responses.
 *
 * JD >= 15.9.50 may put functionId in the POST body, use startup instead of
 * start, and return the JSON payload as one Base64 string. This script keeps
 * the URL as a narrow host/path gate and only edits an observed splash shape.
 */

const JD_HOST_PATH = /^https?:\/\/api\.m\.jd\.com\/client\.action(?:[?#]|$)/;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64DecodeBytes(str) {
  str = String(str).replace(/\s+/g, '').replace(/=+$/, '');
  const out = [];
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < str.length; i++) {
    const value = B64.indexOf(str[i]);
    if (value === -1) continue;
    buf = (buf << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 255);
    }
  }
  return out;
}

function bytesToUtf8(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    text += String.fromCharCode.apply(null, bytes.slice(i, i + 8192));
  }
  try { return decodeURIComponent(escape(text)); }
  catch (_) { return text; }
}

function utf8ToBytes(text) {
  return unescape(encodeURIComponent(text));
}

function b64Encode(text) {
  const bytes = utf8ToBytes(text);
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const c1 = bytes.charCodeAt(i++) & 255;
    const c2 = i < bytes.length ? bytes.charCodeAt(i++) & 255 : NaN;
    const c3 = i < bytes.length ? bytes.charCodeAt(i++) & 255 : NaN;
    out += B64[c1 >> 2];
    out += B64[((c1 & 3) << 4) | ((isNaN(c2) ? 0 : c2) >> 4)];
    out += isNaN(c2) ? '=' : B64[((c2 & 15) << 2) | ((isNaN(c3) ? 0 : c3) >> 6)];
    out += isNaN(c3) ? '=' : B64[c3 & 63];
  }
  return out;
}

function addFunctionId(found, value) {
  if (!value) return;
  const form = /(?:^|[?&;\s])functionId=([A-Za-z0-9_]+)/g;
  const json = /"functionId"\s*:\s*"([A-Za-z0-9_]+)"/g;
  let match;
  while ((match = form.exec(value))) found.add(match[1]);
  while ((match = json.exec(value))) found.add(match[1]);
}

function possibleDecodedValues(value) {
  const values = [value];
  try { values.push(decodeURIComponent(value)); } catch (_) {}
  const compact = String(value).replace(/\s+/g, '');
  if (/^[A-Za-z0-9+/=]+$/.test(compact) && compact.length % 4 === 0) {
    const decoded = bytesToUtf8(b64DecodeBytes(compact));
    values.push(decoded);
  } else {
    const candidates = String(value).match(/[A-Za-z0-9+/=]{16,}/g) || [];
    for (const candidate of candidates) {
      const compactCandidate = candidate.replace(/\s+/g, '');
      if (compactCandidate.length % 4 === 0) {
        values.push(bytesToUtf8(b64DecodeBytes(compactCandidate)));
      }
    }
  }
  return values;
}

function requestFunctionIds(request) {
  const found = new Set();
  addFunctionId(found, request.url || '');
  if (typeof request.body === 'string') {
    for (const value of possibleDecodedValues(request.body)) addFunctionId(found, value);
  }
  return found;
}

function decodeResponse(body) {
  try {
    return { value: JSON.parse(body), encoded: false };
  } catch (_) {}

  const compact = String(body).replace(/\s+/g, '');
  if (/^[A-Za-z0-9+/=]+$/.test(compact) && compact.length % 4 === 0) {
    try {
      return { value: JSON.parse(bytesToUtf8(b64DecodeBytes(compact))), encoded: true };
    } catch (_) {}
  }
  return null;
}

function splashPayload(root) {
  if (root && !Array.isArray(root) && root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    return root.data;
  }
  return root;
}

function cleanKnownSplash(payload, ids) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  const isSplashId = ids.has('start') || ids.has('startup');
  // showTimesDaily is a narrow splash-specific marker. It permits a safe
  // structural fallback if a future body encoding hides functionId.
  const hasSplashShape = Object.prototype.hasOwnProperty.call(payload, 'showTimesDaily') && Array.isArray(payload.images);
  if (!isSplashId && !hasSplashShape) return false;

  let changed = false;
  if (Array.isArray(payload.images) && payload.images.length > 0) {
    payload.images = [];
    changed = true;
  }
  if (payload.showTimesDaily !== 0 && payload.showTimesDaily !== undefined) {
    payload.showTimesDaily = 0;
    changed = true;
  }
  return changed;
}

const request = $request || {};
const response = $response || {};
if (Number(response.status) < 200 || Number(response.status) >= 300 || !JD_HOST_PATH.test(request.url || '') || typeof response.body !== 'string') {
  $done({});
} else if (response.body.length > 2000000) {
  $done({});
} else {
  const decoded = decodeResponse(response.body);
  if (!decoded || !decoded.value || typeof decoded.value !== 'object') {
    $done({});
  } else {
    const payload = splashPayload(decoded.value);
    const changed = cleanKnownSplash(payload, requestFunctionIds(request));
    if (!changed) {
      $done({});
    } else {
      console.log("jd-splash-v1: cleaned splash images/showTimesDaily");
      const body = JSON.stringify(decoded.value);
      $done({ body: decoded.encoded ? b64Encode(body) : body });
    }
  }
}
