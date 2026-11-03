const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=path.join(__dirname,'../scripts');
function run(file,url,body){const results=[];vm.runInNewContext(fs.readFileSync(path.join(dir,file),'utf8'),{$request:{url,method:'GET'},$response:{body,status:200,statusCode:200,headers:{}},$done:x=>results.push(x),console:{log(){}},URL,Set,Uint8Array,Buffer},{timeout:1000});assert.equal(results.length,1,file);return results[0];}
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.js')))assert.deepEqual(run(f,'https://example.com/ordinary','{"value":1}'),{});
const raw='{"enable_sdk_ad":true,"enable_splash_client_bid":true,"splash_client_bid_use_preload":true,"id":9007199254740993123}';
const d=run('douban.js','https://frodo.douban.com/api/v2/feature_switch',raw);assert(d.body.includes('9007199254740993123'));assert.equal(JSON.parse(d.body).enable_sdk_ad,false);
const normal='{"data":{"floors":[{"floorName":"权益楼层","service":"balance"}]}}';assert.deepEqual(run('broadnet.js','https://app.10099.com.cn/contact-web/api/content/qryTouchpointContent',normal),{});
const ad=run('broadnet.js','https://app.10099.com.cn/contact-web/api/version/getFlashScreenPage','{"ok":true,"data":{"path":"https://example.com/ad.png","videoLink":"ad.mp4"}}');assert.equal(JSON.parse(ad.body).data.videoLink,'');
console.log('PASS: unknown URL passthrough, single completion, integer preservation, ad replacement and service-floor preservation');
