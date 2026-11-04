"""Release checks for the full-source port; real-device results are documented separately."""
from pathlib import Path
from collections import Counter
import hashlib,json,re,subprocess,urllib.parse
import yaml
from build import build,ROOT
from compile_fmz import active_statements,stable_id

manifest=build(True)
c=yaml.safe_load((ROOT/'rules/stash-adblock.stoverride').read_text())
assert set(c)=={'name','desc','rule-providers','rules','http','script-providers'}
assert not any(k in c['http'] for k in ['ca','ca-passphrase'])
assert all(h not in ['*','*.*','*.com','*.cn','*.net'] for h in c['http']['mitm'])
exceptions={'DOMAIN,sdkapp.uve.weibo.com,DIRECT','DOMAIN,wbapp.uve.weibo.com,DIRECT','DOMAIN,bootpreload.uve.weibo.com,DIRECT'}
assert all(r.endswith((',REJECT',',REJECT-DROP',',REJECT,no-resolve')) or r in exceptions for r in c['rules'])
assert {b['name'] for b in c['http']['script']}==set(c['script-providers'])
assert all(0<b.get('timeout',10)<=60 and b.get('max-size',1)>0 for b in c['http']['script'])
assert not any(any(x in b['match'] for x in ['music-vip-membership','vipauth','Teenagers','youthmode']) for b in c['http']['script'])
for r in c['http']['url-rewrite']+c['http']['body-rewrite']:re.compile(r.split()[0])
for b in c['http']['script']+c['http'].get('mock',[]):re.compile(b['match'])
for p in (ROOT/'scripts').glob('*.js'):subprocess.run(['node','--check',str(p)],check=True)

coverage=json.loads((ROOT/'rules/coverage.json').read_text())
ledger=json.loads((ROOT/'rules/conversion-ledger.json').read_text())['statements']
rows,_=active_statements((ROOT/'sources/upstream/fmz-rewrite.snippet').read_text())
assert {r['line']:r['source'] for r in ledger}=={r['line']:r['source'] for r in rows}
assert len(ledger)==coverage['source_statement_count']==sum(coverage['dispositions'].values())
assert dict(Counter(r['status'] for r in ledger))==coverage['dispositions']
assert all(r['status'] in ['compiled','replaced','excluded','superseded'] for r in ledger)
outputs={'rules':{stable_id(x) for x in c['rules']}}
for key in ['url-rewrite','body-rewrite','script','mock']:outputs['http.'+key]={stable_id(x) for x in c['http'][key]}
for r in ledger:
 if r['status'] in ['compiled','replaced']:
  assert r.get('outputs') and all(x['id'] in outputs[x['kind']] for x in r['outputs']),(r['line'],'compiled output missing')
 else:assert r.get('reason'),r['line']
counts=coverage['published_counts']
assert len(c['rules'])==counts['rules'] and len(c['http']['url-rewrite'])==counts['url_rewrite']
assert len(c['http']['body-rewrite'])==counts['body_rewrite'] and len(c['http']['script'])==counts['script_bindings']
assert len(c['http']['mitm'])==counts['mitm_hosts']
version=json.loads((ROOT/'sources/version.json').read_text())
assert re.fullmatch('[0-9a-f]{40}',version['scripts_revision']),'Own scripts must use a published immutable commit'
assert hashlib.sha256((ROOT/'sources/upstream/fmz-rewrite.snippet').read_bytes()).hexdigest()==version['upstream_sha256']

locks={d['url']:d for d in json.loads((ROOT/'rules/upstream-lock.json').read_text())['dependencies']}
for v in list(c['script-providers'].values())+list(c['rule-providers'].values()):
 u=urllib.parse.urlsplit(v['url'])
 assert u.scheme=='https' and not u.username and not u.password and not u.query
 assert v['url'] in locks and locks[v['url']]['http_status']==200
 if u.hostname=='raw.githubusercontent.com':assert re.fullmatch('[0-9a-f]{40}',u.path.split('/')[3])

patterns=[r'/Users/[^\s]+',r'00008150-[A-Fa-f0-9]+',r'192\.168\.\d+\.\d+',r'127\.0\.0\.1',r'BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY',r'Authorization:\s*Bearer\s+\S+',r'(?i)ca-passphrase\s*:',r'(?i)external-controller\s*:']
for p in ROOT.rglob('*'):
 if not p.is_file() or any(x in p.parts for x in ['.git','__pycache__','.venv']):continue
 assert p.suffix.lower() not in ['.ipa','.pcap','.p12','.pfx','.pem','.key','.har','.log'],p.name
 if p==Path(__file__).resolve():continue
 text=p.read_text()
 for pattern in patterns:assert not re.search(pattern,text),f'Private material: {p.relative_to(ROOT)}'
for r in c['rules']:assert not any(x in r for x in ['safebrowsing','passport','pay.mobile','security.browser'])
print('PASS: full source accounting, reproducible output, retained repairs, pinned dependencies and public-data checks')
