// Offline contract tests for scripts/youtube-ad-only.js; no network or account.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts/youtube-ad-only.js'), 'utf8');
const base = 'https://youtubei.googleapis.com/youtubei/v1/';

function varint(n) {
  const out = [];
  do { const b = n % 128; n = Math.floor(n / 128); out.push(n ? b | 128 : b); } while (n);
  return Buffer.from(out);
}
function field(no, value, wire = 2) {
  return Buffer.concat([varint(no * 8 + wire),
    ...(wire === 2 ? [varint(value.length)] : []), Buffer.from(value)]);
}
function run(endpoint, body, options = {}) {
  let result, completions = 0;
  const logs = [];
  vm.runInNewContext(script, {
    $request: { url: options.url || base + endpoint },
    $response: { statusCode: options.status || 200, body },
    $done(value) { result = value; completions++; },
    console: { log(message) { logs.push(message); } },
    Uint8Array, ArrayBuffer,
  });
  assert.ok(result, 'script must call $done');
  assert.equal(completions, 1, 'single completion');
  return { result, logs };
}
function bytes(result) { return Buffer.from(result.body); }
function unchanged(result) { assert.equal(Object.keys(result).length, 0); }

// Player: remove only the two ad arrays and the page-ad tracker. Keep unrelated
// playback tracking, captions, playability and an unknown field byte-for-byte.
const tracker = Buffer.concat([field(18, Buffer.from('ad')),
  field(1, Buffer.from('normal-tracking'))]);
const retained = Buffer.concat([field(2, Buffer.from([8, 1])),
  field(9, field(1, Buffer.from('normal-tracking'))), field(10, Buffer.from([8, 0])),
  field(999, Buffer.from('unknown'))]);
const player = Buffer.concat([field(7, Buffer.from([8, 1])),
  field(68, Buffer.from([8, 2])), field(2, Buffer.from([8, 1])),
  field(9, tracker), field(10, Buffer.from([8, 0])), field(999, Buffer.from('unknown'))]);
assert.deepEqual(bytes(run('player', new Uint8Array(player)).result), retained);
unchanged(run('player', new Uint8Array(retained)).result);
unchanged(run('player', new Uint8Array(player), { status: 403 }).result);
unchanged(run('player', new Uint8Array(player), { url: base + 'browse' }).result);
unchanged(run('player', new Uint8Array([0x3a, 0x08, 0xff])).result);

// get_watch embeds a player in each content item. A sibling next stays intact.
const watch = Buffer.concat([field(1, Buffer.concat([field(2, player),
  field(3, Buffer.from([8, 2]))])), field(71, Buffer.from('other'))]);
const watchExpected = Buffer.concat([field(1, Buffer.concat([field(2, retained),
  field(3, Buffer.from([8, 2]))])), field(71, Buffer.from('other'))]);
assert.deepEqual(bytes(run('get_watch', new Uint8Array(watch)).result), watchExpected);

const adEntry = field(2, field(1, field(139608561,
  field(16, field(1, Buffer.from([1]), 0)))));
const normalEntry = field(2, field(1, field(139608561,
  field(16, field(1, Buffer.from([0]), 0)))));
const reel = Buffer.concat([normalEntry, adEntry, field(77, Buffer.from('keep'))]);
assert.deepEqual(bytes(run('reel/reel_watch_sequence', new Uint8Array(reel)).result),
  Buffer.concat([normalEntry, field(77, Buffer.from('keep'))]));

// JSON responses are supported both as text and Stash binary-mode bytes.
const jsonPlayer = { adPlacements: [{ id: 1 }], adSlots: [{ id: 2 }],
  playbackTracking: { pageadViewthroughconversion: 'ad', normal: 'keep' },
  playabilityStatus: { backgroundPlayerRender: { active: false } },
  captions: { captionTracks: ['字幕 😀'] }, premium: false };
const clean = { ...jsonPlayer, adPlacements: [], adSlots: [],
  playbackTracking: { normal: 'keep' } };
assert.deepEqual(JSON.parse(run('player', JSON.stringify(jsonPlayer)).result.body), clean);
assert.deepEqual(JSON.parse(new TextDecoder().decode(run('player',
  new TextEncoder().encode(JSON.stringify(jsonPlayer))).result.body)), clean);
assert.deepEqual(JSON.parse(new TextDecoder().decode(run('player',
  new TextEncoder().encode('  ' + JSON.stringify(jsonPlayer)).buffer).result.body)), clean);
assert.deepEqual(JSON.parse(new TextDecoder().decode(run('player',
  Buffer.concat([Buffer.from([239, 187, 191]),
    Buffer.from(JSON.stringify(jsonPlayer))])).result.body)), clean);
const watchJson = { contents: [{ player: structuredClone(jsonPlayer), next: { x: 1 } }] };
assert.deepEqual(JSON.parse(run('get_watch', JSON.stringify(watchJson)).result.body),
  { contents: [{ player: clean, next: { x: 1 } }] });
const reelJson = { entries: [{ command: { reelWatchEndpoint: { adClientParams: { isAd: true } } } },
  { command: { reelWatchEndpoint: { adClientParams: { isAd: false } } } }] };
assert.equal(JSON.parse(run('reel/reel_watch_sequence', JSON.stringify(reelJson)).result.body)
  .entries.length, 1);
unchanged(run('player', '{invalid').result);
unchanged(run('browse', JSON.stringify(jsonPlayer)).result);
const large = '{"adSlots":[{}],"adPlacements":[],"videoId":9007199254740993123,"metric":1.200e+30,"premium":false}';
const largeOutput = run('player', large).result.body;
assert(largeOutput.includes('9007199254740993123'));
assert(largeOutput.includes('1.200e+30'));
assert.equal(JSON.parse(largeOutput).premium, false);
assert.deepEqual(JSON.parse(largeOutput).adSlots, []);

// Independently ensure the published configuration does not attach a response
// modifier to Spotify's real account/authorization endpoints.
const configuration = JSON.parse(fs.readFileSync(path.join(root, 'sources/config.json'), 'utf8'));
for (const url of ['https://spclient.wg.spotify.com/bootstrap/v1/bootstrap',
  'https://spclient.wg.spotify.com/user-customization-service/v1/customize']) {
  assert(!configuration.http.script.some(binding => new RegExp(binding.match).test(url)));
}
assert.equal(fs.existsSync(path.join(root, 'scripts/spotify-ad-only.js')), false);
console.log('media ad-only: offline JSON/protobuf and Spotify boundary checks passed');
