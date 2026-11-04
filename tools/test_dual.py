"""Decode the two shipped formats and compare their complete ordered behavior."""
from pathlib import Path
import base64,json,re
from urllib.parse import unquote
import yaml

ROOT=Path(__file__).resolve().parents[1]
c=json.loads((ROOT/'sources/config.json').read_text());h=c['http']
stash=yaml.safe_load((ROOT/'rules/stash-adblock.stoverride').read_text());assert stash==c
sections={};section=None
for raw in (ROOT/'rules/stash-adblock.shadowrocket.module').read_text().splitlines():
    line=raw.strip()
    if not line or line.startswith('#'):continue
    if line.startswith('[') and line.endswith(']'):
        section=line;assert section not in sections;sections[section]=[]
    else:assert section;sections[section].append(line)
assert set(sections)=={'[Rule]','[URL Rewrite]','[Body Rewrite]','[Map Local]','[Script]','[MITM]'}
def transport(rule):return re.sub(r'(NETWORK|PROTOCOL),(TCP|UDP)(?=[,)])',r'TRANSPORT,\2',rule)
assert list(map(transport,sections['[Rule]']))==list(map(transport,c['rules']))
assert sections['[Rule]'][:3]==['DOMAIN,sdkapp.uve.weibo.com,DIRECT','DOMAIN,wbapp.uve.weibo.com,DIRECT','DOMAIN,bootpreload.uve.weibo.com,DIRECT']
assert sections['[URL Rewrite]']==h['url-rewrite']
body=[]
for line in sections['[Body Rewrite]']:
    action,pattern,expression=line.split(' ',2)
    assert action=='http-response-jq' and expression[0]==expression[-1]=="'"
    body.append(pattern+' response-jq '+expression[1:-1])
assert body==h['body-rewrite']
assert len(sections['[Script]'])==len(h['script'])
names=set()
for line,binding in zip(sections['[Script]'],h['script']):
    name,options=line.split(' = ',1);assert name not in names;names.add(name)
    opts=dict(item.split('=',1) for item in re.split(r',\s+(?=[a-z-]+=)',options))
    expected={'type':'http-'+binding['type'],'pattern':binding['match'],
              'script-path':c['script-providers'][binding['name']]['url'],
              'requires-body':str(binding.get('require-body',False)).lower()}
    for key in ['timeout','max-size']:
        if key in binding:expected[key]=str(binding[key])
    if binding.get('binary-mode'):expected['binary-body-mode']='true'
    if binding.get('argument') is not None:
        actual=opts.pop('argument')
        if expected['script-path'].endswith('/qx-body-transform.js'):actual=unquote(actual)
        assert actual==binding['argument'],'Argument changed in native INI encoding'
    assert opts==expected,('Script option loss',name)
    re.compile(opts['pattern'])
assert len(sections['[Map Local]'])==len(h['mock'])
for line,mock in zip(sections['[Map Local]'],h['mock']):
    match=re.fullmatch(r'(\S+) data-type=base64 data="([A-Za-z0-9+/=]+)" status-code=200 header=(".*")',line)
    assert match and match[1]==mock['match']
    raw=base64.b64decode(match[2],validate=True)
    expected=base64.b64decode(mock['base64']) if 'base64' in mock else mock['text'].encode()
    assert raw==expected,'Static response bytes changed'
    headers=dict(item.split(':',1) for item in json.loads(match[3]).split('\r\n') if item)
    assert headers==mock.get('headers',{}),'Static response headers changed'
assert sections['[MITM]']==['hostname = %APPEND% '+', '.join(h['mitm'])]
assert c['rule-providers']=={} and not any(r.startswith('RULE-SET,') for r in c['rules'])
# Keep the legacy review's coverage while adding upstream; no count-based truncation.
legacy=json.loads((ROOT/'sources/legacy-reviewed.json').read_text())
assert set(legacy['rules'])-{'RULE-SET,AWAvenue-OnlyAds,REJECT'}<=set(c['rules'])
assert set(legacy['http']['url-rewrite'])<=set(h['url-rewrite'])
assert set(legacy['http']['mitm'])<=set(h['mitm'])
def identifier(value):
    import hashlib
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:16]
actual={'rules':set(map(identifier,c['rules']))}
for name in ['url-rewrite','body-rewrite','script','mock']:actual['http.'+name]=set(map(identifier,h[name]))
ledger=json.loads((ROOT/'rules/conversion-ledger.json').read_text())['statements']
for row in ledger:
    assert row['status'] in ['compiled','replaced','excluded','superseded']
    for output in row.get('outputs',[]):assert output['id'] in actual[output['kind']],('Ledger points at dropped output',row['line'])
print('PASS: both complete outputs preserve ordered routes, rewrites, script flags/arguments, binary mocks, hosts and legacy coverage')
