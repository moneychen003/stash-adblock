"""Release checks for the common source and both clients; not device acceptance."""
from pathlib import Path
import json,re,subprocess,urllib.parse,hashlib,shutil
import yaml
from build import build,ROOT
m=build(True);c=json.loads((ROOT/'sources/config.json').read_text());h=c['http']
assert set(c)=={'name','desc','rule-providers','rules','http','script-providers'}
assert not any(k in h for k in ['ca','ca-passphrase'])
assert all(host not in ['*','*.*','*.com','*.cn','*.net'] for host in h['mitm'])
exceptions={'DOMAIN,sdkapp.uve.weibo.com,DIRECT','DOMAIN,wbapp.uve.weibo.com,DIRECT','DOMAIN,bootpreload.uve.weibo.com,DIRECT'}
assert all(rule.removesuffix(',no-resolve').endswith((',REJECT',',REJECT-DROP')) or rule in exceptions for rule in c['rules'])
assert all(0<b.get('timeout',10)<=60 and (b.get('max-size',1)==-1 or b.get('max-size',1)>0) for b in h['script'])
assert not any(any(x in b['match'] for x in ['music-vip-membership','vipauth','Teenagers','youthmode']) for b in h['script'])
assert {b['name'] for b in h['script']}==set(c['script-providers'])
coverage=json.loads((ROOT/'rules/coverage.json').read_text())
for key,value in {'rules':len(c['rules']),'url_rewrite':len(h['url-rewrite']),'body_rewrite':len(h['body-rewrite']),'script_bindings':len(h['script']),'mitm_hosts':len(h['mitm'])}.items():assert coverage['published_counts'][key]==value
ledger=json.loads((ROOT/'rules/conversion-ledger.json').read_text())['statements']
assert len(ledger)==coverage['source_statement_count']==len({x['line'] for x in ledger})
for x in h['url-rewrite']+h['body-rewrite']:re.compile(x.split()[0])
for b in h['script']+h.get('mock',[]):re.compile(b['match'])
for p in (ROOT/'scripts').glob('*.js'):subprocess.run(['node','--check',str(p)],check=True)
assert shutil.which('jq'),'jq 1.7+ is required to compile the response expressions'
for entry in h['body-rewrite']:
 expression=entry.split(' response-jq ',1)[1]
 result=subprocess.run(['jq','-n',expression],capture_output=True,text=True,timeout=3)
 assert result.returncode==0,'Invalid JQ expression: '+result.stderr[:160]
locks=json.loads((ROOT/'rules/upstream-lock.json').read_text())['dependencies'];locked={d['url']:d for d in locks}
for name,p in c['script-providers'].items():
 u=urllib.parse.urlsplit(p['url']);assert u.scheme=='https' and not u.username and not u.query
 assert p['url'] in locked,'Missing locked dependency: '+name
 d=locked[p['url']]
 if d['repository']=='moneychen003/stash-adblock':
  local=ROOT/'scripts'/u.path.rsplit('/',1)[-1];assert hashlib.sha256(local.read_bytes()).hexdigest()==d['sha256']
  assert d['http_status'] in [None,200]
 else:assert d['http_status']==200
for rule in c['rules']:assert not any(term in rule for term in ['safebrowsing','passport','pay.mobile','security.browser'])
patterns=[r'/Users/[^\s]+',r'00008150-[A-Fa-f0-9]+',r'192\.168\.\d+\.\d+',r'127\.0\.0\.1',r'BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY',r'Authorization:\s*Bearer\s+\S+',r'(?i)ca-passphrase\s*:',r'(?i)external-controller\s*:',r'tskey-(?:auth|api|client)-[A-Za-z0-9_-]{20,}']
for p in ROOT.rglob('*'):
 if not p.is_file() or any(x in p.parts for x in ['.git','__pycache__','.venv']):continue
 assert p.suffix.lower() not in ['.ipa','.pcap','.p12','.pfx','.pem','.key','.har','.log'],p.name
 text=p.read_text()
 if p==Path(__file__).resolve():continue
 for pattern in patterns:assert not re.search(pattern,text),'Private material in '+str(p.relative_to(ROOT))
print('PASS: reproducible dual build, complete source accounting, JS/JQ/regex checks, dependency hashes and public-data scan')
