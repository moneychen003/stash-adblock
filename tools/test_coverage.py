"""Check real endpoint shapes and normal functions independently of the generator."""
from pathlib import Path
import fnmatch,json,re,urllib.parse

ROOT=Path(__file__).resolve().parents[1]
c=json.loads((ROOT/'sources/config.json').read_text())

def matches(pattern,url):return re.search(pattern,url) is not None
def handler(url):
    return next((b['name'] for b in c['http']['script'] if matches(b['match'],url)),None)
def rewritten(url):
    return any(matches(r.split()[0],url) for r in c['http']['url-rewrite'])
def intercepted(url):
    host=urllib.parse.urlsplit(url).hostname
    return any(fnmatch.fnmatch(host,h.split(':')[0]) for h in c['http']['mitm'])

cases=[
 ('https://frodo.douban.com/api/v2/feature_switch','cq.douban'),
 ('https://api.weibo.cn/2/live/media_homelist','cq.weibo'),
 ('https://api.pinduoduo.com/api/alexa/cells/hub/v3','cq.pinduoduo'),
 ('https://app.10099.com.cn/contact-web/api/content/qryTouchpointContent','cq.broadnet'),
 ('https://app.10099.com.cn/contact-web/api/version/getFlashScreenPage','cq.broadnet'),
 ('https://api.m.jd.com/client.action','cq.jd-splash'),
 ('https://api.coolapk.com/v6/main/init','cq.coolapk'),
 ('https://app.bilibili.com/x/v2/splash/list','cq.bilibili-splash'),
 ('https://un-acs.youku.com/gw/mtop.youku.play.ups.appinfo.get/1.0/','cq.youku-ad-only'),
 ('https://acs.youku.com/gw/mtop.youku.columbus.home.feed/1.0/','cq.youku-ad-only'),
]
for url,name in cases:
    assert intercepted(url),f'Missing MitM host: {url}'
    assert handler(url)==name,(url,handler(url),name)
    assert not rewritten(url),f'Rejection shadows the response repair: {url}'

for url in [
 'https://music.y.qq.com/maproxy/getPbCompressAd',
 'https://frodo.douban.com/api/v2/home_banner',
 'https://api.xueqiu.com/promotion/display_ad_batch.json',
]:
    assert intercepted(url) and rewritten(url),url

jd=next(b for b in c['http']['script'] if b['name']=='cq.jd-splash')
assert not matches(jd['match'],'https://api.m.jd.com/client.action?functionId=ordinary')
for url in [
 'https://api.xueqiu.com/ucprofile/api/user/batchGetUserBasicInfo.json',
 'https://api.m.jd.com/client.action?functionId=ordinary',
 'https://acs.youku.com/gw/mtop.youku.huluwa.dispatcher.youthmode.config2/1.0/',
 'https://interface.music.163.com/eapi/music-vip-membership/client/vip/info',
]:
    assert not rewritten(url),url
    assert handler(url) is None,url
print('PASS: retained repair priority, exact ad rejection, MitM coverage and ordinary-function exclusions')

# The earlier working Douban combination also forced this API host off QUIC.
assert "AND,((DOMAIN,api.douban.com),(PROTOCOL,QUIC)),REJECT" in c["rules"]
