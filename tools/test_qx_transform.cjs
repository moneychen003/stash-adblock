const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../scripts/qx-body-transform.js'), 'utf8');

function run(argument, response, request = {headers: {}}) {
  const calls = [];
  const context = {$argument: argument, $request: request, $done: value => calls.push(value), Uint8Array};
  if (response !== undefined) context.$response = response;
  vm.runInNewContext(source, context, {timeout: 1000});
  assert.equal(calls.length, 1, 'script must call $done once');
  return calls[0];
}

function plain(value) { return JSON.parse(JSON.stringify(value)); }
const response = (body, status = 200, headers = {'Content-Type': 'application/json'}) => ({body, status, headers});

const large = '{"id":9007199254740993123,"ad":true,"other":true}';
const changed = run(JSON.stringify({kind: 'regex', pattern: '"ad":true', replacement: '"ad":false'}), response(large));
assert.equal(changed.body, '{"id":9007199254740993123,"ad":false,"other":true}');
const encoded = run(encodeURIComponent(JSON.stringify({kind:'regex',pattern:'"ad":true',replacement:'"ad":false'})),response(large));
assert.equal(encoded.body,changed.body,'Shadowrocket INI-safe arguments must preserve Stash behavior');
assert.deepEqual(plain(run('%invalid',response(large))),{});
assert.equal(run({kind: 'regex', pattern: 'ad', replacement: 'clean'}, response('ad ad')).body, 'clean clean');
assert.equal(run({kind: 'regex', pattern: '(<head>)', replacement: '$1<style>hide</style>'},
  response('<head><title>x</title>', 200, {'content-type': 'text/html'})).body,
  '<head><style>hide</style><title>x</title>');
assert.deepEqual(plain(run({kind: 'regex', pattern: 'missing', replacement: 'x'}, response(large))), {});
assert.deepEqual(plain(run({kind: 'regex', pattern: 'a', replacement: 'b'}, response('a', 500))), {});
assert.deepEqual(plain(run({kind: 'regex', pattern: 'a', replacement: 'b'}, response('a', 204))), {});
assert.deepEqual(plain(run({kind: 'regex', pattern: 'a', replacement: 'b'}, response('a', 206))), {});
assert.deepEqual(plain(run({kind: 'regex', pattern: 'a', replacement: 'b'}, response('a', 200, {'Content-Type': 'image/png'}))), {});
assert.deepEqual(plain(run({kind: 'regex', pattern: 'a', replacement: 'b'}, response(new Uint8Array([97])))), {});
assert.deepEqual(plain(run({kind: 'regex', pattern: 'a', replacement: 'b'}, undefined)), {});
for (const argument of [undefined, '{', [], {kind: 'regex', pattern: '[', replacement: ''},
  {kind: 'regex', pattern: 2, replacement: 'x'}, {kind: 'regex', pattern: 'a', replacement: 3},
  {kind: 'jq', expression: '.'}, {kind: 'request-reject', uaPattern: '[', responseType: 'dict'},
  {kind: 'request-reject', uaPattern: 'App', responseType: 'array'}]) {
  assert.deepEqual(plain(run(argument, response('a'), {headers: {'User-Agent': 'App'}})), {});
}

const reject = (responseType, headers) => run({kind: 'request-reject', uaPattern: '^TestApp/1\\.0$', responseType}, undefined, {headers});
assert.deepEqual(plain(reject('dict', {'uSeR-aGeNt': 'TestApp/1.0'})),
  {response: {status: 200, headers: {'Content-Type': 'application/json; charset=utf-8'}, body: '{}'}});
assert.deepEqual(plain(reject('empty', {'User-Agent': 'TestApp/1.0'})),
  {response: {status: 200, headers: {'Content-Type': 'text/plain; charset=utf-8'}, body: ''}});
const image = reject('image', {'user-agent': 'TestApp/1.0'}).response;
assert.equal(image.status, 200);
assert.equal(image.headers['Content-Type'], 'image/gif');
assert(image.body instanceof Uint8Array);
assert.equal(Buffer.from(image.body.subarray(0, 6)).toString('ascii'), 'GIF89a');
assert.equal(image.body[6] + (image.body[7] << 8), 1);
assert.equal(image.body[8] + (image.body[9] << 8), 1);
assert.equal(image.body[image.body.length - 1], 59);
assert.deepEqual(plain(reject('dict', {'User-Agent': 'OtherApp/1.0'})), {});
assert.deepEqual(plain(reject('dict', {})), {});
assert.deepEqual(plain(run({kind: 'request-reject', uaPattern: '^TestApp', responseType: 'dict'}, undefined,
  {headers: {'User-Agent': 123}})), {});

console.log('PASS: QX regex text, capture replacements, guards, and UA-gated request responses');
