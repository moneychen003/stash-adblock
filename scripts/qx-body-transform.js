// SPDX-License-Identifier: GPL-3.0-or-later
// Generic Quantumult X rewrite adapter. Bind each rule with its own JSON argument.
(function () {
  'use strict';

  let finished = false;
  function done(value) {
    if (finished) return;
    finished = true;
    $done(value);
  }

  try {
    const raw = typeof $argument === 'string' && !/^\s*[\[{]/.test($argument)
      ? decodeURIComponent($argument) : $argument;
    const options = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!options || typeof options !== 'object' || Array.isArray(options)) return done({});

    if (options.kind === 'regex') {
      if (typeof options.pattern !== 'string' || !options.pattern ||
          typeof options.replacement !== 'string') return done({});
      if (typeof $response === 'undefined' || !$response ||
          typeof $response.body !== 'string') return done({});
      const status = Number($response.status !== undefined ? $response.status : $response.statusCode);
      if (!Number.isInteger(status) || status < 200 || status >= 300 ||
          status === 204 || status === 205 || status === 206) return done({});
      const headers = $response.headers;
      if (headers && typeof headers === 'object') {
        const contentTypeKey = Object.keys(headers).find(key => key.toLowerCase() === 'content-type');
        if (contentTypeKey) {
          const contentType = headers[contentTypeKey];
          if (typeof contentType !== 'string' ||
              !/^(?:text\/[^;\s]+|application\/(?:json|[^;\s+]+\+json|javascript|xml|[^;\s+]+\+xml|x-www-form-urlencoded))(?:\s*;|\s*$)/i.test(contentType.trim())) return done({});
        }
      }
      const result = $response.body.replace(new RegExp(options.pattern, 'g'), options.replacement);
      return done(result === $response.body ? {} : {body: result});
    }

    if (options.kind === 'request-reject') {
      if (typeof options.uaPattern !== 'string' || !options.uaPattern ||
          !['empty', 'dict', 'image'].includes(options.responseType)) return done({});
      if (typeof $request === 'undefined' || !$request ||
          !$request.headers || typeof $request.headers !== 'object') return done({});
      const uaKey = Object.keys($request.headers).find(key => key.toLowerCase() === 'user-agent');
      const ua = uaKey === undefined ? undefined : $request.headers[uaKey];
      if (typeof ua !== 'string' || !new RegExp(options.uaPattern).test(ua)) return done({});

      const headers = {'Content-Type': 'text/plain; charset=utf-8'};
      let body = '';
      if (options.responseType === 'dict') {
        headers['Content-Type'] = 'application/json; charset=utf-8';
        body = '{}';
      } else if (options.responseType === 'image') {
        headers['Content-Type'] = 'image/gif';
        // Transparent 1x1 GIF89a, passed as bytes to avoid UTF-8 corruption.
        body = new Uint8Array([
          71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0,
          255, 255, 255, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0,
          1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59
        ]);
      }
      return done({response: {status: 200, headers, body}});
    }
  } catch (_) {
    // Malformed arguments, regular expressions, or response metadata leave traffic intact.
  }
  done({});
})();
