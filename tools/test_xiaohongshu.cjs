const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../scripts/xiaohongshu-ad-only.js'), 'utf8');
const host = 'https://edith.xiaohongshu.com/api/sns/';
function run(url, body, options = {}) {
  const calls = [];
  vm.runInNewContext(script, {
    $request: {url, method: options.method || 'GET'},
    $response: {body: typeof body === 'string' ? body : JSON.stringify(body), statusCode: options.status || 200},
    $done: result => calls.push(result),
  }, {timeout: 1000});
  assert.equal(calls.length, 1, 'one completion');
  return calls[0].body;
}
function changed(url, input) {
  const output = run(url, input);
  assert.equal(typeof output, 'string', url);
  return JSON.parse(output);
}

const ordinary = {
  id: 'normal-note', model_type: 'note', note_attributes: ['goods'], card_icon: {shop: true},
  related_ques: {text: 'normal question'}, title: '普通图文', user: {red_id: 'author-1'},
  media_save_config: {disable_save: true, disable_watermark: false},
  share_info: {function_entries: [{type: 'share'}]}, function_switch: [{type: 'video_download', enable: false}],
};
const video = {id: 'video-1', model_type: 'video', video_info_v2: {media: {stream: {h265: [{master_url: 'watermarked-url'}]}}},
  media_save_config: {disable_save: true, disable_watermark: false}, user: {red_id: 'creator'}};
const home = changed(host + 'v6/homefeed?cursor=1', {code: 0, data: [
  {id: 'sponsor', ads_info: {campaign_id: 'ad-1'}},
  ordinary, {id: 'live', model_type: 'live_v2'}, {id: 'store-note', note_attributes: ['goods']},
  {id: 'ad-flag', is_ad: true}, {id: 'null-ad-info', ads_info: null, title: 'keep'},
], update: {version: '9.0'}});
assert.deepEqual(home.data.map(x => x.id), ['normal-note', 'live', 'store-note', 'null-ad-info']);
assert.deepEqual(home.data[0], ordinary);
assert.deepEqual(home.update, {version: '9.0'});

const search = changed('https://so.rnote.com/api/sns/v2/search/notes?keyword=abc', {
  data: {items: [ordinary, {model_type: 'advertisement', id: 'ad'}, {model_type: 'user', id: 'user-1'},
    {model_type: 'note', ads_info: {ad_id: 'x'}, id: 'paid-note'}], total: 4},
  user: {red_id: 'my-account'}, settings: {navigation: ['home', 'messages']},
});
assert.deepEqual(search.data.items.map(x => x.id), ['normal-note', 'user-1']);
assert.equal(search.data.total, 4);
assert.equal(search.user.red_id, 'my-account');
assert.deepEqual(search.settings.navigation, ['home', 'messages']);

const splash = changed(host + 'v4/system_service/splash_config', {
  data: {ads_groups: [{ads: [{id: 1, start_time: 1, end_time: 2}]}], theme: 'light',
    update: {version: '9.0'}, route: '/home'}, code: 0,
});
assert.deepEqual(splash.data.ads_groups, []);
assert.equal(splash.data.theme, 'light');
assert.equal(splash.data.update.version, '9.0');
assert.equal(splash.data.route, '/home');

const config = changed(host + 'v5/system_service/config?x=1', {
  data: {splash: {ads: [{id: 1}]}, app_theme: 'dark', loading_img: 'ordinary', store: {enabled: true},
    version_update: {required: false}, navigation: ['feed', 'me'], watermark: {enabled: true},
    account: {red_id: 'own-id'}, message: {unread: 5}}, code: 0,
});
assert.equal(Object.hasOwn(config.data, 'splash'), false);
assert.equal(config.data.app_theme, 'dark');
assert.equal(config.data.loading_img, 'ordinary');
assert.deepEqual(config.data.store, {enabled: true});
assert.deepEqual(config.data.version_update, {required: false});
assert.deepEqual(config.data.navigation, ['feed', 'me']);
assert.deepEqual(config.data.watermark, {enabled: true});
assert.equal(config.data.account.red_id, 'own-id');
assert.equal(config.data.message.unread, 5);

const banners = changed(host + 'v2/search/banner_list', {
  code: 0, data: {items: [{id: 'search-ad'}]}, account: {red_id: 'preserved'}, version: '9.0',
});
assert.deepEqual(banners.data, {});
assert.equal(banners.account.red_id, 'preserved');
assert.equal(banners.version, '9.0');

for (const version of ['v3', 'v4']) {
  const url = host + version + '/note/videofeed?cursor=1';
  const feed = changed(url, {data: [video, {id: 'ad-video', ads_info: {campaign: 1}},
    {id: 'video-2', is_ad: false, media_save_config: {disable_watermark: false}}],
  comments: [{author: {red_id: 'commenter'}}]});
  assert.deepEqual(feed.data.map(x => x.id), ['video-1', 'video-2']);
  assert.deepEqual(feed.data[0], video);
  assert.equal(feed.comments[0].author.red_id, 'commenter');
}

const huge = '{"data":[{"id":900719925474099312345,"ads_info":{"id":1}}, {"id":900719925474099312346,"model_type":"video","user":{"red_id":123456789012345678901},"watermark":true,"metric":1.200e+30}],"cursor":900719925474099312347}';
const hugeOutput = run(host + 'v6/homefeed?cursor=1', huge);
assert.ok(hugeOutput.includes('900719925474099312346'));
assert.ok(hugeOutput.includes('123456789012345678901'));
assert.ok(hugeOutput.includes('900719925474099312347'));
assert.ok(hugeOutput.includes('1.200e+30'));
assert.ok(!hugeOutput.includes('900719925474099312345'));
assert.equal(run(host + 'v6/homefeed?cursor=1', '{"data": [ {"id":1} ], "cursor": 900719925474099312347 }'), undefined);

const payload = JSON.stringify({data: [ordinary, {ads_info: {id: 1}}]});
for (const url of [
  host + 'v6/homefeed/extra?x=1', host + 'v5/homefeed?x=1',
  host + 'v2/note/imagefeed?x=1', host + 'v2/note/feed?x=1',
  host + 'v4/note/live_photo/save?x=1', host + 'v10/note/video/save?x=1',
  host + 'v5/note/comment/list?x=1', host + 'v6/search/hint?x=1',
  host + 'v6/search/trending?x=1', host + 'v6/search/hot_list?x=1',
  host + 'v6/note/widgets?x=1', host + 'v4/followfeed?x=1',
  'https://edith.xiaohongshu.com.evil.test/api/sns/v6/homefeed?x=1',
]) assert.equal(run(url, payload), undefined, url);
assert.equal(run(host + 'v6/homefeed?x=1', payload, {status: 500}), undefined);
assert.equal(JSON.parse(run(host + 'v6/homefeed?x=1', payload, {method: 'POST'})).data.length, 1);
assert.equal(run(host + 'v6/homefeed?x=1', payload, {method: 'DELETE'}), undefined);
assert.equal(run(host + 'v6/homefeed?x=1', '{broken'), undefined);
assert.equal(run(host + 'v6/homefeed?x=1', '{"data":{"unexpected":42}}'), undefined);
assert.equal(run(host + 'v6/homefeed?x=1', '{"data":[{"id":"normal","ads_info":null}]}'), undefined);
assert.equal(run(host + 'v6/homefeed?x=1', '{"data":[{"id":"normal","ads_info":{}}]}'), undefined);
assert.equal(run(host + 'v6/homefeed?x=1', '{"data":[{"id":"normal","ads_info":""}]}'), undefined);

console.log('PASS xiaohongshu ad-only: search, splash, config, home/video feeds, preserved content and numeric lexemes, pass-through');
