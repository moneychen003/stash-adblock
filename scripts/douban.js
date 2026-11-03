// SPDX-License-Identifier: GPL-3.0-or-later
(function(){
  'use strict';
  if(!/^https:\/\/frodo\.douban\.com\/api\/v2\/feature_switch(?:\?|$)/.test(String($request.url||'')))return $done({});
  const original=$response.body;
  if(typeof original!=='string')return $done({});
  try{
    const obj=JSON.parse(original);
    if(!obj||typeof obj!=='object'||Array.isArray(obj))return $done({});
    let body=original,changed=0;
    for(const key of ['enable_sdk_ad','enable_splash_client_bid','splash_client_bid_use_preload']){
      if(obj[key]!==true)continue;
      const re=new RegExp('("'+key+'"\\s*:\\s*)true','g');
      const matches=[...body.matchAll(re)];
      if(matches.length!==1)return $done({});
      body=body.replace(re,'$1false');changed++;
    }
    if(changed){console.log('douban-ad-switches changed='+changed);return $done({body});}
  }catch(e){}
  $done({});
})();
