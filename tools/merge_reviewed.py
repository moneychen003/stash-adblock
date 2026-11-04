"""Union the reviewed release and the fresh upstream compilation, without private inputs."""
from pathlib import Path
from copy import deepcopy
import json,hashlib,re
import yaml

ROOT=Path(__file__).resolve().parents[1]

def key(value):return json.dumps(value,ensure_ascii=False,sort_keys=True)
def unique(values):
    seen=set();result=[]
    for value in values:
        identifier=key(value)
        if identifier not in seen:seen.add(identifier);result.append(value)
    return result

def merge_reviewed(config,repair,own_base,policy,script_policy,dependencies):
    old=json.loads((ROOT/'sources/legacy-reviewed.json').read_text())
    h=config['http'];oh=old['http'];providers=config['script-providers']
    input_counts={'rules':len(old['rules']),'url_rewrites':len(oh['url-rewrite']),'script_bindings':len(oh['script'])}
    original_bindings=deepcopy(h['script'])
    assert set(oh)<={'mitm','url-rewrite','body-rewrite','script','mock'}
    # A legacy union must not undo newer reviews of account, media or ordinary UI changes.
    dep_by_source={d.get('original_url',d['url']):d for d in dependencies}
    def normalized(pattern):return pattern.replace(r'\/', '/').replace('(?>','(?:')
    drop_rules={};drop_urls={};drop_scripts={};adjustments=[]
    routes={'host':'DOMAIN','host-suffix':'DOMAIN-SUFFIX','host-keyword':'DOMAIN-KEYWORD','ip-cidr':'IP-CIDR','ip6-cidr':'IP-CIDR6'}
    for item in policy.get('excluded',[])+policy.get('replacements',[])+script_policy.get('exclusions',[])+script_policy.get('replacements',[]):
        source=item['source'];parts=[x.strip() for x in source.split(',')]
        if parts[0].lower() in routes and len(parts)>=3:
            drop_rules[','.join([routes[parts[0].lower()],parts[1],parts[2].upper()]+parts[3:])]=item['reason']
        match=re.match(r'^(\S+)\s+url\s+(reject(?:-\S+)?)$',source)
        if match:drop_urls[(normalized(match[1]),match[2])]=item['reason']
        match=re.match(r'^(\S+)\s+url\s+script-\S+\s+(https?://\S+)$',source)
        if match:
            url=dep_by_source.get(match[2],{}).get('url',match[2])
            drop_scripts[(normalized(match[1]),url)]=item['reason']
    kept=[]
    for rule in old['rules']:
        if rule in drop_rules:adjustments.append({'kind':'rules','value':rule,'reason':drop_rules[rule]})
        else:kept.append(rule)
    old['rules']=kept
    kept=[]
    for rule in oh['url-rewrite']:
        parts=rule.split();identifier=(normalized(parts[0]),parts[-1])
        if identifier in drop_urls:adjustments.append({'kind':'http.url-rewrite','value':rule,'reason':drop_urls[identifier]})
        else:kept.append(rule)
    oh['url-rewrite']=kept
    overrides={}
    for item in script_policy.get('overrides',[]):
        pinned=dep_by_source[item['original_url']]['url'];overrides[pinned]=item
    legacy_bindings=[]
    for binding in deepcopy(oh['script']):
        old_url=old['script-providers'][binding['name']]['url']
        identifier=(normalized(binding['match']),old_url)
        if identifier in drop_scripts:
            adjustments.append({'kind':'http.script','value':binding['match'],'provider_url':old_url,'reason':drop_scripts[identifier]});continue
        if old_url in overrides:
            item=overrides[old_url];scopes=[b for b in h['script'] if b['name']==item['provider']]
            assert scopes,('Reviewed replacement has no binding',item['provider'])
            adjustments.append({'kind':'http.script-adaptation','value':binding['match'],'provider_url':old_url,'replacement_provider':item['provider'],'reason':item['reason']})
            # The current reviewed binding is the authority for both ad-only scope and binary flags.
            for scope in scopes:legacy_bindings.append(deepcopy(scope))
            continue
        legacy_bindings.append(binding)
    oh['script']=legacy_bindings
    for name,provider in old['script-providers'].items():
        provider=deepcopy(provider)
        if provider['url'].startswith('https://raw.githubusercontent.com/moneychen003/stash-adblock/'):
            provider['url']=own_base+provider['url'].rsplit('/',1)[1]
        if name in providers:assert providers[name]==provider,('Provider collision',name)
        else:providers[name]=provider
    config['rules']=unique(config['rules']+old['rules'])
    for section in ['mitm','url-rewrite','body-rewrite','mock']:
        h[section]=unique(h.get(section,[])+oh.get(section,[]))
    # Keep observed response repairs before legacy and upstream broad handlers.
    repairs={key(b) for b in repair['http']['script']}
    ordered=[b for b in h['script'] if key(b) in repairs]+deepcopy(oh['script'])+[b for b in h['script'] if key(b) not in repairs]
    seen={};bindings=[]
    for binding in ordered:
        semantic={k:v for k,v in binding.items() if k not in ['name','timeout','max-size']}
        semantic['script_url']=providers[binding['name']]['url']
        identifier=key(semantic)
        if identifier in seen:
            existing=seen[identifier]
            existing['timeout']=max(existing.get('timeout',10),binding.get('timeout',10))
            if 'max-size' in existing or 'max-size' in binding:
                limits=[existing.get('max-size',0),binding.get('max-size',0)]
                existing['max-size']=-1 if -1 in limits else max(limits)
        else:seen[identifier]=binding;bindings.append(binding)
    h['script']=bindings
    def binding_key(binding):
        result={k:v for k,v in binding.items() if k not in ['name','timeout','max-size']}
        result['script_url']=providers[binding['name']]['url']
        return key(result)
    def identifier(value):return hashlib.sha256(key(value).encode()).hexdigest()[:16]
    aliases={identifier(b):identifier(seen[binding_key(b)]) for b in original_bindings}
    # Inline the same pinned AWA payload on both clients; no Clash-YAML URL is handed to Shadowrocket.
    awa_meta=json.loads((ROOT/'sources/upstream/awa-source.json').read_text())
    data=(ROOT/'sources/upstream/awa-ads.yaml').read_bytes()
    assert hashlib.sha256(data).hexdigest()==awa_meta['sha256']
    awa=yaml.safe_load(data)['payload'];assert len(awa)==awa_meta['rules']
    expanded=[]
    for rule in config['rules']:
        if rule=='RULE-SET,AWAvenue-OnlyAds,REJECT':
            expanded.extend(r+',REJECT' for r in awa)
        else:expanded.append(rule)
    config['rules']=unique(expanded)
    assert set(config['rule-providers'])=={'AWAvenue-OnlyAds'}
    config['rule-providers']={}
    return {'reviewed_source_version':'2026.11.04.2','legacy_input_rules':input_counts['rules'],
            'legacy_input_url_rewrites':input_counts['url_rewrites'],'legacy_input_script_bindings':input_counts['script_bindings'],
            'legacy_after_current_review':{'rules':len(old['rules']),'url_rewrites':len(oh['url-rewrite']),'script_bindings':len(oh['script'])},
            'awa_payload_rules':len(awa),'exact_duplicates_removed':True,
            'priority':'verified response repairs, reviewed legacy handlers, fresh upstream handlers',
            'legacy_review_adjustments':adjustments,
            '_binding_id_aliases':aliases}
