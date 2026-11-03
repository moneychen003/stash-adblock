// SPDX-License-Identifier: GPL-3.0-or-later
/*
 * Candidate only. Scope: api.coolapk.com/v6/main/init.
 *
 * Public API captures place SplashAd.Type and ad network app ids in the
 * extraData of card 6390. Preserve the card and its normal navigation fields;
 * remove only splash/ad decision keys. Exact entities 944/945 are removed.
 */

const INIT_URL = /^https?:\/\/api\.coolapk\.com\/v6\/main\/init(?:[?#]|$)/;
const AD_KEYS = new Set([
  'SplashAd.Type',
  'SplashAd.Expires',
  'SplashAd.onResume',
  'Ad.TT_APP_ID',
  'Ad.GDT_APP_ID'
]);
const REMOVE_ENTITY_IDS = new Set([944, 945]);

function stripAdKeys(object) {
  let changed = false;
  if (!object || typeof object !== 'object' || Array.isArray(object)) return changed;
  for (const key of AD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      delete object[key];
      changed = true;
    }
  }
  return changed;
}

function walk(value) {
  let changed = false;
  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const item = value[i];
      if (item && typeof item === 'object' && REMOVE_ENTITY_IDS.has(Number(item.entityId))) {
        value.splice(i, 1);
        changed = true;
        continue;
      }
      if (walk(item)) changed = true;
    }
    return changed;
  }
  if (!value || typeof value !== 'object') return changed;

  if (value.extraDataArr && typeof value.extraDataArr === 'object') {
    if (stripAdKeys(value.extraDataArr)) changed = true;
  }
  if (typeof value.extraData === 'string' && value.extraData.length > 0) {
    try {
      const data = JSON.parse(value.extraData);
      if (stripAdKeys(data)) {
        value.extraData = JSON.stringify(data);
        changed = true;
      }
    } catch (_) {}
  }
  for (const key of Object.keys(value)) {
    if (walk(value[key])) changed = true;
  }
  return changed;
}

const request = $request || {};
const response = $response || {};
if (Number(response.status) < 200 || Number(response.status) >= 300 || !INIT_URL.test(request.url || '') || typeof response.body !== 'string') {
  $done({});
} else {
  try {
    const object = JSON.parse(response.body);
    if (walk(object)) { console.log("coolapk-init-v1: removed splash decision fields"); $done({ body: JSON.stringify(object) }); }
    else $done({});
  } catch (_) {
    $done({});
  }
}
