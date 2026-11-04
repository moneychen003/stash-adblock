"""Union the reviewed release and the fresh upstream compilation, without private inputs."""
from pathlib import Path
from copy import deepcopy
import json,hashlib
import yaml

ROOT=Path(__file__).resolve().parents[1]

def key(value):return json.dumps(value,ensure_ascii=False,sort_keys=True)
def unique(values):
    seen=set();result=[]
    for value in values:
        identifier=key(value)
        if identifier not in seen:seen.add(identifier);result.append(value)
    return result

def merge_reviewed(config,repair,own_base):
    old=json.loads((ROOT/'sources/legacy-reviewed.json').read_text())
    h=config['http'];oh=old['http'];providers=config['script-providers']
    original_bindings=deepcopy(h['script'])
    assert set(oh)<={'mitm','url-rewrite','body-rewrite','script','mock'}
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
    return {'reviewed_source_version':'2026.11.04.2','legacy_input_rules':len(old['rules']),
            'legacy_input_url_rewrites':len(oh['url-rewrite']),'legacy_input_script_bindings':len(oh['script']),
            'awa_payload_rules':len(awa),'exact_duplicates_removed':True,
            'priority':'verified response repairs, reviewed legacy handlers, fresh upstream handlers',
            '_binding_id_aliases':aliases}
