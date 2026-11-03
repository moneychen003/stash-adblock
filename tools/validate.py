"""Static release checks; this does not replace real-device acceptance."""
from pathlib import Path
import json,re,subprocess,urllib.parse
import yaml
from build import build,ROOT
assert not list(ROOT.rglob('*.ipa')), 'App installation packages must not be published'
m=build(True);s=yaml.safe_load((ROOT/'rules/stash-adblock.stoverride').read_text())
assert set(s)=={'name','desc','rule-providers','rules','http','script-providers'}
assert not any(k in s['http'] for k in ['ca','ca-passphrase'])
assert all(h!='*' and '*' not in h for h in s['http']['mitm'])
assert all(r.endswith((',REJECT',',REJECT-DROP')) for r in s['rules'])
assert all(b['name'] in s['script-providers'] for b in s['http']['script'])
assert all(b.get('timeout',0)<=5 and 0<b.get('max-size',0)<=1048576 for b in s['http']['script'])
assert not any('music-vip-membership' in b['match'] or 'vipauth' in b['match'] for b in s['http']['script'])
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
print('PASS: reproducible YAML, bounded scripts, provider references, syntax and public-data checks')
