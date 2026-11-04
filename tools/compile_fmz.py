"""Compile every active upstream statement, with an explicit disposition ledger.

The upstream snapshot is GPL-3.0; its author and source remain in sources/upstream.
No device inventory, certificate, DNS preference or proxy subscription is an input.
"""
from pathlib import Path
from copy import deepcopy
from collections import Counter
import hashlib,json,re
from merge_reviewed import merge_reviewed

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'sources/upstream/fmz-rewrite.snippet'
ROUTES={'host':'DOMAIN','host-suffix':'DOMAIN-SUFFIX','host-keyword':'DOMAIN-KEYWORD',
        'domain':'DOMAIN','domain-suffix':'DOMAIN-SUFFIX','domain-keyword':'DOMAIN-KEYWORD',
        'ip-cidr':'IP-CIDR','ip6-cidr':'IP-CIDR6'}
META={'name','desc','version','author','homepage','icon','category','date','openUrl'}

def normalize(pattern):
    # QX atomic groups are represented as non-capturing groups in the Stash port.
    result=pattern.replace('(?>','(?:')
    re.compile(result)
    return result

def stable_id(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:16]

def unique(values):
    seen=set();result=[]
    for value in values:
        key=json.dumps(value,ensure_ascii=False,sort_keys=True)
        if key not in seen:result.append(value);seen.add(key)
    return result

def active_statements(text):
    section='未分组';hostnames=[];rows=[]
    for number,raw in enumerate(text.splitlines(),1):
        source=raw.strip()
        title=re.match(r'^#\s*>\s*(.+)$',source)
        if title:section=title[1].strip()
        if not source or source.startswith(('#',';','//')):continue
        if re.match(r'^hostname\s*=',source,re.I):
            hostnames.extend(h.strip() for h in source.split('=',1)[1].split(',') if h.strip());continue
        rows.append({'line':number,'section':section,'source':source})
    return rows,unique(hostnames)

def parse_statement(source):
    comma=[x.strip() for x in source.split(',')]
    if comma[0].lower() in ROUTES and len(comma)>=3:
        return {'kind':'route','route':','.join([ROUTES[comma[0].lower()],comma[1],comma[2].upper()]+comma[3:])}
    if comma[0].upper()=='USER-AGENT' and len(comma)==3:
        return {'kind':'ua-route','ua':comma[1],'action':comma[2].lower()}
    match=re.match(r'^(\S+)\s+url\s+(\S+)(?:\s+(.*))?$',source)
    if match:return {'kind':'url','pattern':normalize(match[1]),'action':match[2].lower(),'argument':match[3] or ''}
    match=re.match(r'^(\S+)\s+(\S+)\s+url-and-header\s+(\S+)$',source)
    if match:return {'kind':'ua-url','pattern':normalize(match[1]),'ua':match[2],'action':match[3].lower()}
    # Upstream contains one Stash-style statement among the QX statements.
    match=re.match(r'^(\S+)\s+-\s+(reject(?:-\w+)?)$',source,re.I)
    if match:return {'kind':'url','pattern':normalize(match[1]),'action':match[2].lower(),'argument':''}
    raise ValueError('Unrecognized active syntax: '+source[:150])

def compile_source(check=False):
    version=json.loads((ROOT/'sources/version.json').read_text())
    raw=SOURCE.read_bytes();digest=hashlib.sha256(raw).hexdigest()
    assert digest==version['upstream_sha256'],'Upstream snapshot does not match release version'
    policy=json.loads((ROOT/'sources/fmz-policy.json').read_text())
    script_policy=json.loads((ROOT/'sources/fmz-script-policy.json').read_text())
    assert policy['source_sha256']==script_policy['source_sha256']==digest
    rows,hosts=active_statements(raw.decode())
    original={r['line']:r for r in rows}
    excluded={};replacements={}
    for items,kind in [(policy.get('excluded',[]),'excluded'),(script_policy.get('exclusions',[]),'excluded'),
                       (policy.get('replacements',[]),'replacement'),(script_policy.get('replacements',[]),'replacement')]:
        for item in items:
            assert item['line'] in original and original[item['line']]['source']==item['source'],('Policy/source drift',item['line'])
            (excluded if kind=='excluded' else replacements)[item['line']]=item
    dep_list=json.loads((ROOT/'sources/dependencies.json').read_text())['dependencies']
    legacy_deps=json.loads((ROOT/'sources/legacy-reviewed-lock.json').read_text())['dependencies']
    dep_list=unique(dep_list+legacy_deps)
    deps={d.get('original_url',d['url']):d for d in dep_list}
    deps.update({d['url']:d for d in dep_list})
    compatibility={r['original_url']:r for r in script_policy.get('compatibility',[])}
    overrides={r['original_url']:r for r in script_policy.get('overrides',[])}
    repair=json.loads((ROOT/'sources/verified-repairs.json').read_text())
    config={
        'name':version['name'],
        'desc':f"完整 fmz 源规则逐项适配 {version['version']}，保留实测修复，剔除非广告功能。覆盖量不等于全部 App 实测；旧广告素材可能需清理或重装。",
        'rule-providers':deepcopy(repair.get('rule-providers',{})),
        'rules':deepcopy(repair.get('rules',[])),
        'http':deepcopy(repair['http']),
        'script-providers':deepcopy(repair['script-providers']),
    }
    h=config['http'];providers=config['script-providers']
    own_base='https://raw.githubusercontent.com/moneychen003/stash-adblock/'+version['scripts_revision']+'/scripts/'
    for p in providers.values():
        if p.get('url','').startswith('https://raw.githubusercontent.com/moneychen003/stash-adblock/'):
            p['url']=own_base+p['url'].rsplit('/',1)[1]
    # These endpoints must reach the response repair, not an upstream rejection.
    repair_probes=[
        'https://app.10099.com.cn/contact-web/api/version/getFlashScreenPage',
        'https://app.10099.com.cn/contact-web/api/content/qryPosterStand',
        'https://app.10099.com.cn/contact-web/api/content/qryTouchpointContent',
        'https://api.m.jd.com/client.action?functionId=start',
        'https://api.m.jd.com/client.action?functionId=startup',
        'https://api.coolapk.com/v6/main/init',
        'https://app.bilibili.com/x/v2/splash/list',
        'https://bootpreload.uve.weibo.com/v2/ad/preload',
        'https://wbapp.uve.weibo.com/wbapplua/wbpullad.lua',
    ]
    ledger=[];used_urls=set();by_section=Counter();transforms=Counter()
    def own_provider(name,file):
        providers[name]={'url':own_base+file,'interval':86400}
        return name
    def bind(pattern,name,kind='response',body=True,binary=False,argument=None,timeout=10):
        b={'match':pattern,'name':name,'type':kind,'require-body':body,'timeout':timeout}
        if body:b['max-size']=3145728
        if binary:b['binary-mode']=True
        if argument is not None:b['argument']=json.dumps(argument,ensure_ascii=False,separators=(',',':'))
        h['script'].append(b);return b
    for row in rows:
        number=row['line'];record={**row}
        if number in excluded:
            record.update(status='excluded',reason=excluded[number]['reason']);ledger.append(record);continue
        source=replacements.get(number,{}).get('replacement',row['source'])
        parsed=parse_statement(source);kind=parsed['kind'];outputs=[]
        if number in replacements:record.update(replacement=source,reason=replacements[number]['reason'])
        if kind=='route':
            config['rules'].append(parsed['route']);outputs.append(('rules',parsed['route']))
        elif kind in ['ua-url','ua-route']:
            name=own_provider('cq.qx-body-transform','qx-body-transform.js')
            ua='^'+re.escape(parsed['ua']).replace(r'\*','.*').replace(r'\?','.')+'$'
            response_type={'reject':'empty','reject-200':'empty','reject-dict':'dict','reject-img':'image'}[parsed['action']]
            b=bind(parsed.get('pattern',r'^https?://'),name,'request',False,
                   argument={'kind':'request-reject','uaPattern':ua,'responseType':response_type})
            outputs.append(('http.script',b))
        else:
            pattern,action,arg=parsed['pattern'],parsed['action'],parsed['argument']
            if action.startswith('reject') and any(re.search(pattern,u) for u in repair_probes):
                record.update(status='superseded',reason='由同一目标接口的实测响应修复处理，避免上游直接拒绝抢先命中。')
                ledger.append(record);continue
            if action.startswith('reject'):
                assert action in ['reject','reject-200','reject-dict','reject-img','reject-array'],action
                item=pattern+' - '+action;h['url-rewrite'].append(item);outputs.append(('http.url-rewrite',item))
            elif action in ['302','307']:
                target=deps[arg]['url'] if arg in deps else arg
                if arg in deps:used_urls.add(target)
                item=pattern+' '+target+' '+action;h['url-rewrite'].append(item);outputs.append(('http.url-rewrite',item))
            elif action=='jsonjq-response-body':
                expr=arg.strip()
                if len(expr)>1 and expr[0]==expr[-1] and expr[0] in ['\"',"'"]:expr=expr[1:-1]
                expr='. as $__cq_original | try ('+expr+') catch $__cq_original'
                item=pattern+' response-jq '+expr;h['body-rewrite'].append(item);outputs.append(('http.body-rewrite',item))
            elif action=='response-body':
                search,sep,replacement=arg.partition(' response-body ')
                assert sep and search,('Invalid response-body parameters',number)
                name=own_provider('cq.qx-body-transform','qx-body-transform.js')
                b=bind(pattern,name,argument={'kind':'regex','pattern':search,'replacement':replacement})
                outputs.append(('http.script',b))
            elif action=='echo-response':
                # This one resource is a small functional mock, not executable JS.
                mock=json.loads((ROOT/'sources/mocks/caiyun.json').read_text())
                item={'match':pattern,'status-code':200,'headers':{'Content-Type':'application/json'},'text':json.dumps(mock,ensure_ascii=False,separators=(',',':'))}
                h['mock'].append(item);outputs.append(('http.mock',item))
            elif action.startswith('script-'):
                assert action in ['script-response-body','script-request-body','script-request-header','script-response-header','script-analyze-echo-response'],action
                override=overrides.get(arg)
                comp=compatibility.get(arg)
                if override:
                    name=override['provider'];file=override.get('file',name.removeprefix('cq.')+'.js')
                    own_provider(name,file)
                    record['implementation']=override['reason']
                else:
                    assert arg in deps,('Unpinned script dependency',number,arg)
                    assert comp and comp.get('mode')=='native',('Script needs an explicit compatibility adaptation',number,arg,comp)
                    d=deps[arg];assert d['http_status']==200
                    name='cq.fmz.'+hashlib.sha256(d['url'].encode()).hexdigest()[:12]
                    providers[name]={'url':d['url'],'interval':86400};used_urls.add(d['url'])
                stage='request' if action in ['script-request-body','script-request-header','script-analyze-echo-response'] else 'response'
                require=action not in ['script-request-header','script-response-header']
                binary=bool(override and override.get('binary_mode')) or bool(comp and comp.get('binary_mode')) or arg.rsplit('/',1)[-1] in ['tieba-proto.js','baidumap.js']
                b=bind(pattern,name,stage,require,binary,timeout=30 if 'BahamutAnimeAds' in arg else 10)
                outputs.append(('http.script',b))
            else:raise ValueError(f'Unconverted QX action at {number}: {action}')
        record.update(status='replaced' if number in replacements else 'compiled',outputs=[{'kind':k,'id':stable_id(v)} for k,v in outputs])
        ledger.append(record);by_section[row['section']]+=1;transforms[parsed.get('action','route')]+=1
    # Prioritize repairs, deduplicate exact entries only; do not replace normal proxy config.
    config['rules']=unique(config['rules'])
    for key in ['url-rewrite','body-rewrite','script','mock']:h[key]=unique(h.get(key,[]))
    h['mitm']=unique(h.get('mitm',[])+[host for host in hosts if host not in ['*','*.*','*.com','*.cn','*.net']])
    merge_report=merge_reviewed(config,repair,own_base,policy,script_policy,dep_list)
    binding_aliases=merge_report.pop('_binding_id_aliases')
    merge_report['semantic_binding_aliases']=sum(a!=b for a,b in binding_aliases.items())
    for record in ledger:
        for output in record.get('outputs',[]):
            if output['kind']=='http.script':
                old_id=output['id'];output['id']=binding_aliases[old_id]
                if old_id!=output['id']:output['upstream_id']=old_id
    used_names={b['name'] for b in h['script']}
    config['script-providers']={k:v for k,v in providers.items() if k in used_names}
    for v in list(config['script-providers'].values())+list(config['rule-providers'].values()):used_urls.add(v['url'])
    known_deps={d['url']:d for d in dep_list}
    locks=[{k:d[k] for k in ['url','repository','http_status','bytes','sha256']} for url,d in sorted(known_deps.items()) if url in used_urls]
    # Own scripts are in the same repository; pin to the published script revision.
    publication_file=ROOT/'sources/published-scripts.json'
    publication=json.loads(publication_file.read_text()) if publication_file.exists() else {}
    for v in config['script-providers'].values():
        if v['url'].startswith(own_base):
            p=ROOT/'scripts'/v['url'].rsplit('/',1)[-1];assert p.is_file(),p.name
            data=p.read_bytes();sha=hashlib.sha256(data).hexdigest();verified=publication.get(v['url'],{}).get('sha256')==sha
            locks.append({'url':v['url'],'repository':'moneychen003/stash-adblock','http_status':200 if verified else None,'verification':'anonymous-http-sha256' if verified else 'local-sha256; pending-publication','bytes':len(data),'sha256':sha})
    coverage={'version':version['version'],'source_sha256':digest,'source_commit':version['upstream_commit'],
              'source_statement_count':len(rows),'dispositions':dict(Counter(r['status'] for r in ledger)),
              'compiled_source_sections':len(by_section),'compiled_action_types':dict(transforms),
              'published_counts':{'rules':len(config['rules']),'url_rewrite':len(h['url-rewrite']),'body_rewrite':len(h['body-rewrite']),'script_bindings':len(h['script']),'script_providers':len(config['script-providers']),'mitm_hosts':len(h['mitm']),'local_scripts':sum(v['url'].startswith(own_base) for v in config['script-providers'].values())},
              'reviewed_release_union':merge_report,
              'note':'每条启用源语句都有编译、拆窄、排除或实测补丁替代记录，并合并已审核旧版。覆盖数量不是全部App实机验收数；无设备清单、CA、节点、账号或个人网络设置。'}
    assert len(ledger)==len(rows)==len({r['line'] for r in ledger})
    products={ROOT/'sources/config.json':config,ROOT/'rules/coverage.json':coverage,
              ROOT/'rules/conversion-ledger.json':{'version':version['version'],'source_sha256':digest,'statements':ledger},
              ROOT/'rules/upstream-lock.json':{'checked_date':'2026-11-04','dependencies':unique(locks)}}
    for path,value in products.items():
        body=json.dumps(value,ensure_ascii=False,indent=2)+'\n'
        if check:assert path.read_text()==body,'Generated file differs: '+str(path.relative_to(ROOT))
        else:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(body)
    return coverage

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    print(json.dumps(compile_source(args.check),ensure_ascii=False))
