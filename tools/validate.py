"""Static release checks; this does not replace real-device acceptance."""
from pathlib import Path
import json,re,subprocess,urllib.parse
import yaml
from build import build,ROOT
assert not list(ROOT.rglob('*.ipa')), 'App installation packages must not be published'
m=build(True);s=yaml.safe_load((ROOT/'rules/stash-adblock.stoverride').read_text())
assert set(s)=={'name','desc','rule-providers','rules','http','script-providers'}
assert not any(k in s['http'] for k in ['ca','ca-passphrase'])
assert all(h not in ['*','*.*','*.com','*.cn','*.net'] for h in s['http']['mitm'])
ad_rewrite_exceptions={'DOMAIN,sdkapp.uve.weibo.com,DIRECT','DOMAIN,wbapp.uve.weibo.com,DIRECT','DOMAIN,bootpreload.uve.weibo.com,DIRECT'}
assert all(r.endswith((',REJECT',',REJECT-DROP')) or r in ad_rewrite_exceptions for r in s['rules'])
assert all(b['name'] in s['script-providers'] for b in s['http']['script'])
assert all(0<b.get('timeout',10)<=60 and (b.get('max-size',1)==-1 or b.get('max-size',1)>0) for b in s['http']['script'])
assert not any('music-vip-membership' in b['match'] or 'vipauth' in b['match'] for b in s['http']['script'])
assert not any('Teenagers' in b['match'] or 'youthmode' in b['match'] for b in s['http']['script'])
assert {b['name'] for b in s['http']['script']}==set(s['script-providers']), 'Orphan or missing provider'
coverage=json.loads((ROOT/'rules/coverage.json').read_text())
assert len(s['rules'])==coverage['published_counts']['rules']
assert len(s['http']['url-rewrite'])==coverage['published_counts']['url_rewrite']
assert len(s['http']['script'])==coverage['published_counts']['script_bindings']
assert len(s['http']['mitm'])==coverage['published_counts']['mitm_hosts']
for item in coverage['removed_non_ad_rules']:assert item['rule'] not in s['rules']
for item in coverage['removed_non_ad_url_rewrites']:assert item['rule'] not in s['http']['url-rewrite']
for item in coverage['removed_non_ad_script_bindings']:
 assert not any(b['match']==item['match'] and b['name']=='cq.upstream.'+item['name'] for b in s['http']['script'])
for item in s['http']['url-rewrite']+s['http']['body-rewrite']:re.compile(item.split()[0])
for item in s['http']['script']+s['http'].get('mock',[]):re.compile(item['match'])
for p in (ROOT/'scripts').glob('*.js'):subprocess.run(['node','--check',str(p)],check=True)
patterns=[r'/Users/[^\s]+',r'00008150-[A-Fa-f0-9]+',r'192\.168\.\d+\.\d+',r'127\.0\.0\.1',r'BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY',r'Authorization:\s*Bearer\s+\S+',r'(?i)ca-passphrase\s*:',r'(?i)external-controller\s*:']
for p in ROOT.rglob('*'):
 if not p.is_file() or any(x in p.parts for x in ['.git','__pycache__','.venv']):continue
 assert p.suffix.lower() not in ['.ipa','.pcap','.p12','.pfx','.pem','.key','.har','.log'],f'Forbidden artifact: {p.name}'
 t=p.read_text()
 # Scanner source necessarily contains detection expressions, never real data.
 if p==Path(__file__).resolve():continue
 for pattern in patterns:assert not re.search(pattern,t),f'Private material: {p.relative_to(ROOT)}'
for name,v in s['script-providers'].items():
 u=urllib.parse.urlsplit(v['url']);assert u.scheme=='https' and not u.username and not u.query
for r in s['rules']:assert not any(x in r for x in ['safebrowsing','passport','pay.mobile','security.browser'])
locked={d['url'] for d in json.loads((ROOT/'rules/upstream-lock.json').read_text())['dependencies']}
for v in list(s['script-providers'].values())+list(s['rule-providers'].values()):
 if not v['url'].startswith('https://raw.githubusercontent.com/moneychen003/stash-adblock/main/'):
  assert v['url'] in locked,'External dependency missing from lock file'
print('PASS: reproducible YAML, coverage accounting, retained handlers, regex syntax, provider references and public-data checks')
