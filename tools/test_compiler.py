"""Independent conversion contracts and coverage for previously missing applications."""
from pathlib import Path
import json,re,shutil,subprocess
from compile_fmz import parse_statement,normalize,active_statements

ROOT=Path(__file__).resolve().parents[1]
assert parse_statement('host-suffix, ads.example.com, reject')['route']=='DOMAIN-SUFFIX,ads.example.com,REJECT'
assert parse_statement('DOMAIN, ads.example.com, reject')['route']=='DOMAIN,ads.example.com,REJECT'
assert parse_statement(r'^https://example\.com/ad url reject-dict')['action']=='reject-dict'
assert parse_statement(r'^http://example\.com/gateway App* url-and-header reject')['ua']=='App*'
html=r'^https://example\.com/ url response-body (<head>) response-body $1<style> a { display:none } </style>'
parsed=parse_statement(html)
assert parsed['argument'].partition(' response-body ')[2]=='$1<style> a { display:none } </style>'
assert '(?:' in normalize(r'^https://example\.com/(?>ads|banner)')
try:parse_statement('unsupported active format')
except ValueError:pass
else:raise AssertionError('Unknown syntax must fail, not disappear')

c=json.loads((ROOT/'sources/config.json').read_text());h=c['http']
patterns=[r.split()[0] for key in ['url-rewrite','body-rewrite'] for r in h[key]]+[b['match'] for b in h['script']]
def covered(url):return any(re.search(p,url) for p in patterns)
for url in [
 'https://edith.xiaohongshu.com/api/sns/v1/system_service/splash_config',
 'https://kjp.cupid.iqiyi.com/mixer?test=1',
 'https://cards.iqiyi.com/views_home/3.0/qy_home?test=1',
 'https://mobile-thor.api.mgtv.com/v1/vod/info?test=1',
 'https://res.kfc.com.cn/advertisement/test',
]:assert covered(url),url
for term in ['xiaohongshu','iqiyi','mgtv','ximalaya','keep','qidian']:
 assert any(term in p for p in patterns),'Whole application accidentally dropped: '+term
assert not any(b['match']==r'^https?://' for b in h['script']),'Global UA rejection is not an ad endpoint'
rows,_=active_statements((ROOT/'sources/upstream/fmz-rewrite.snippet').read_text())
ledger=json.loads((ROOT/'rules/conversion-ledger.json').read_text())['statements']
assert len(rows)>4000 and len(rows)==len(ledger)
assert sum('jsonjq-response-body' in r['source'] and r['status'] in ['compiled','replaced'] for r in ledger)>0
assert sum(' response-body ' in r['source'] and r['status'] in ['compiled','replaced'] for r in ledger)>0
if shutil.which('jq'):
 for r in h['body-rewrite']:
  pattern,action,expression=r.split(' ',2)
  if action=='response-jq':
   result=subprocess.run(['jq','-c',expression],input='{}',text=True,capture_output=True)
   assert result.returncode==0,('jq conversion error',pattern,result.stderr)
 print('PASS: native jq expressions compile and unexpected response shapes do not fail')
else:print('SKIP: jq CLI not installed; use the device check for native jq expressions')
print('PASS: QX syntax contracts, complete source accounting and previously missing application coverage')
