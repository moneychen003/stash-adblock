// SPDX-License-Identifier: GPL-3.0-or-later
(function(){
'use strict';
const path=String($request.url||'').split('?')[0];
if(!/^https:\/\/app\.10099\.com\.cn\/contact-web\/api\/(?:version\/getFlashScreenPage|content\/(?:qryPosterStand))$/.test(path))return $done({});
const status=Number($response.statusCode||String($response.status||'').match(/\b[1-5]\d\d\b/)?.[0]||200);
if(status<200||status>=300)return $done({});
try{
 const b=JSON.parse($response.body);if(!b||typeof b!=='object'||Array.isArray(b)||b.ok===false)return $done({});
 let count=0;
 if(path.endsWith('/getFlashScreenPage')&&b.data&&typeof b.data==='object'&&!Array.isArray(b.data)&&('path' in b.data||'videoLink' in b.data)){b.data.path='https://app.10099.com.cn/.well-known/stash-ad-free.gif';if('videoLink' in b.data)b.data.videoLink='';if('nameCode' in b.data)b.data.nameCode='stash-ad-free-v1';count=1;}
 if(path.endsWith('/qryPosterStand')&&Array.isArray(b.data)){
  for(const slot of b.data)if(slot&&/(?:轮播图|底部广告位)/.test(String(slot.posterStandName||''))&&Array.isArray(slot.adList)){count+=slot.adList.length;slot.adList=[];if(typeof slot.showFlag==='number')slot.showFlag=0;}
 }
 const name=path.split('/').pop();
 if(count){console.log('BROADNET_CLEAN '+name+' '+count);return $done({body:JSON.stringify(b)});}
}catch(e){console.log('BROADNET_CLEAN_PARSE_ERROR');}
$done({});
})();
