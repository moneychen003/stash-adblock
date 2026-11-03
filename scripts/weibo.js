// SPDX-License-Identifier: GPL-3.0-or-later
(function(){
'use strict';
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


const path=String($request.url||'').split('?')[0];
const live=/^https:\/\/api\.weibo\.cn\/2\/live\/media_homelist$/.test(path),feed=/^https:\/\/api\.weibo\.cn\/2\/statuses\/container_timeline_unread$/.test(path);
if(!live&&!feed)return $done({});
const status=Number($response.statusCode||String($response.status||'').match(/\b[1-5]\d\d\b/)?.[0]||200);if(status<200||status>=300)return $done({});
try{
 const source=String($response.body||''),root=parseJsonWithRanges(source);if(root.kind!=='object')return $done({});
 let list,count=0;
 if(live){const code=uniqueProp(root,'code');if(code?.kind!=='number'||Number(code.raw)!==100000)return $done({});list=uniqueProp(root,'data');}
 else list=uniqueProp(root,'items');
 if(list?.kind!=='array')return $done({});
 const kept=list.items.filter(item=>{const flag=live?uniqueProp(item,'from_tuijian'):uniqueProp(uniqueProp(item,'data'),'ad_marked');if(flag?.kind==='boolean'&&flag.value===true){count++;return false;}return true;});
 if(!count)return $done({});const replaced='['+kept.map(n=>source.slice(n.start,n.end)).join(',')+']';
 $done({body:source.slice(0,list.start)+replaced+source.slice(list.end)});
}catch(_){console.log('WEIBO_NATIVE_PARSE_ERROR');$done({});}
})();
