const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname, '../scripts/fmz-video-ad-only.js'), 'utf8');

function run(url, value, statusCode = 200) {
  const calls = [];
  vm.runInNewContext(script, {
    $request: {url},
    $response: {body: JSON.stringify(value), statusCode},
    $done: result => calls.push(result),
  }, {timeout: 1000});
  assert.equal(calls.length, 1);
  return calls[0].body ? JSON.parse(calls[0].body) : value;
}

const iqiyi = run('https://cards.iqiyi.com/views_home/3.0/qy_home?x=1', {
  base: {statistics: {ad_str: 'x', content: 'keep'}},
  cards: [{alias_name: 'ad_mobile_flow'}, {alias_name: 'video', top_banner: {l_blocks: [{buttons: [{id: 'play'}]}]}}],
  vip: {paid: false},
});
assert.equal(iqiyi.cards.length, 1);
assert.equal(iqiyi.cards[0].top_banner.l_blocks[0].buttons[0].id, 'play');
assert.equal(iqiyi.base.statistics.content, 'keep');
assert.equal(iqiyi.vip.paid, false);

const splash = run('https://kjp.cupid.iqiyi.com/mixer?x=1', {
  errorCode: 0, adSlots: [{id: 1}], splashLottieFile: 'ad', playback: {stream: 'keep'},
});
assert.equal(splash.adSlots, undefined);
assert.equal(splash.playback.stream, 'keep');

const ip = run('https://1.2.3.4/3f1/cards.iqiyi.com/waterfall/3.0/feed?x=1', {
  cards: [{block_class: 'ad'}, {alias_name: 'movie', blocks: [{block_class: 'ad'}, {title: 'episode'}]}],
});
assert.equal(ip.cards.length, 1);
assert.equal(ip.cards[0].blocks[0].title, 'episode');

const mg = run('https://mobile-thor.api.mgtv.com/v1/vod/info?x=1', {
  data: {config: {ad: {wmShowTime: 8}, videoRcMod: {toastStatus: 1}},
    tabs: [{type: '1'}, {type: '3'}],
    template: {modules: [{dataType: 701}, {dataType: 202}, {dataType: 201}], theme: 'keep'},
    paid: true, stream: {url: 'keep'}},
});
assert.deepEqual(mg.data.template.modules.map(x => x.dataType), [202, 201]);
assert.equal(mg.data.config.ad.wmShowTime, 8);
assert.equal(mg.data.config.videoRcMod.toastStatus, 1);
assert.equal(mg.data.tabs.length, 2);
assert.equal(mg.data.template.theme, 'keep');
assert.equal(mg.data.stream.url, 'keep');

const untouched = {data: {youthmode: {enabled: true}, watermark: 'keep'}};
assert.deepEqual(run('https://acs.youku.com/gw/mtop.youku.huluwa.dispatcher.youthmode.config2', untouched), untouched);
assert.deepEqual(run('https://cards.iqiyi.com/views_home/3.0/qy_home?x=1', untouched, 500), untouched);
console.log('PASS fmz video ad-only: IQIY, MGTV, playback, navigation, watermark, paid and youth preservation');
