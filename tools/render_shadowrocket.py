"""Render the shared reviewed configuration as a native Shadowrocket module."""
import base64,json,re
from urllib.parse import quote

def shadow_rule(rule):
    # Stash calls the transport matcher NETWORK; Shadowrocket calls it PROTOCOL.
    return re.sub(r'(?<![A-Z-])NETWORK,(TCP|UDP)(?=[,)])',r'PROTOCOL,\1',rule)

def render(config,version):
    assert not config.get('rule-providers'),'Rule sets must be flattened from pinned inputs first'
    h=config['http']
    assert set(h)<={'mitm','url-rewrite','body-rewrite','script','mock'},'Unimplemented HTTP field'
    lines=[f"#!name={version['name']} · Shadowrocket",f"#!desc=上游广告规则＋已审核旧版＋实测修复，版本 {version['version']}。请勿与上游广告合集重复启用。",
           '#!author=陈前；fmz200 与各上游作者，详见 THIRD_PARTY.md',
           '#!homepage=https://github.com/moneychen003/stash-adblock',
           '# Generated from sources/config.json. Contains no proxies, DNS preferences or certificates.','',
           '[Rule]',*[shadow_rule(r) for r in config['rules']],'','[URL Rewrite]',*h['url-rewrite'],'','[Body Rewrite]']
    for item in h['body-rewrite']:
        pattern,sep,expression=item.partition(' response-jq ')
        assert sep and "'" not in expression and '\n' not in expression,'JQ requires explicit quoting support'
        lines.append("http-response-jq "+pattern+" '"+expression+"'")
    lines+=['','[Map Local]']
    for mock in h.get('mock',[]):
        assert set(mock)<={'match','status-code','headers','text','base64'}
        assert mock.get('status-code',200)==200,'Only reviewed HTTP 200 mocks are supported'
        data=mock.get('base64')
        if data is None:data=base64.b64encode(mock['text'].encode()).decode()
        base64.b64decode(data,validate=True)
        headers='\r\n'.join(k+':'+v for k,v in mock.get('headers',{}).items())
        lines.append(mock['match']+' data-type=base64 data='+json.dumps(data)+' status-code=200 header='+json.dumps(headers,ensure_ascii=False))
    lines+=['','[Script]']
    for index,b in enumerate(h['script'],1):
        assert set(b)<={'match','name','type','require-body','max-size','timeout','binary-mode','argument'}
        assert b['type'] in ['request','response']
        provider=config['script-providers'][b['name']]
        assert set(provider)<={'url','interval'} and provider['url'].startswith('https://')
        name=re.sub(r'[^a-zA-Z0-9_.-]','_',b['name'])+'.'+str(index)
        options=['type=http-'+b['type'],'pattern='+b['match'],'script-path='+provider['url'],
                 'requires-body='+str(b.get('require-body',False)).lower()]
        if 'max-size' in b:options.append('max-size='+str(b['max-size']))
        if 'timeout' in b:options.append('timeout='+str(b['timeout']))
        if b.get('binary-mode'):options.append('binary-body-mode=true')
        if b.get('argument') is not None:
            argument=b['argument'];assert isinstance(argument,str)
            if provider['url'].endswith('/qx-body-transform.js'):
                # Avoid commas, quotes and CRLF being mistaken for INI option boundaries.
                argument=quote(argument,safe='')
            assert not any(x in argument for x in [',','\n','\r']),('Unencoded script argument',name)
            options.append('argument='+argument)
        lines.append(name+' = '+', '.join(options))
    assert all(x!='*' for x in h['mitm'])
    lines+=['','[MITM]','hostname = %APPEND% '+', '.join(h['mitm']),'']
    return '\n'.join(lines)
