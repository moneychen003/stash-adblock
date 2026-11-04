"""Anonymous release-time URL/hash validation; never saves signed redirect URLs."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse,hashlib,json,urllib.request
ROOT=Path(__file__).resolve().parents[1]
def main(skip_own=False):
    deps=json.loads((ROOT/'rules/upstream-lock.json').read_text())['dependencies']
    chosen={d['url']:d for d in deps if not(skip_own and d['repository']=='moneychen003/stash-adblock')}
    def check(item):
        url,expected=item;record={'url':url}
        try:
            request=urllib.request.Request(url,headers={'User-Agent':'adblock-dual-release-check'})
            with urllib.request.urlopen(request,timeout=25) as response:data=response.read();record['status']=response.status
            record.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
            record['verified']=record['status']==200 and record['bytes']==expected['bytes'] and record['sha256']==expected['sha256']
        except Exception as error:record.update(status=getattr(error,'code',None),error=type(error).__name__,verified=False)
        return record
    with ThreadPoolExecutor(max_workers=8) as pool:records=list(pool.map(check,chosen.items()))
    result={'checked_date':'2026-11-04','own_scripts_skipped':skip_own,'dependencies':records}
    target=ROOT/'rules/external-validation.json';target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    failed=[r for r in records if not r['verified']]
    print(json.dumps({'checked':len(records),'failed':len(failed),'failures':failed},ensure_ascii=False))
    if failed:raise SystemExit(1)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--skip-own',action='store_true');args=parser.parse_args();main(args.skip_own)
