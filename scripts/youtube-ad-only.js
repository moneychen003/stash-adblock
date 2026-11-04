// SPDX-License-Identifier: Apache-2.0
// Advertising field paths derived from Maasea/sgmodule, Script/Youtube/youtube.response.js
// pinned at 65075cdb388fc5e3094afd7e7314c67b243f3525 (Apache-2.0).
// This is a new, narrow implementation; it does not bundle the upstream runtime.
// Stash response script: use binary-mode: true for protobuf and JSON byte bodies.
(function () {
  "use strict";

  function unchanged() { $done({}); }
  function readVarint(bytes, at) {
    var value = 0;
    for (var i = 0; i < 10; i++) {
      if (at >= bytes.length) throw new Error("truncated varint");
      var b = bytes[at++];
      if (i < 8) value += (b & 127) * Math.pow(2, 7 * i);
      if (!(b & 128)) return { value: value, end: at };
    }
    throw new Error("invalid varint");
  }
  function encodeVarint(n) {
    var out = [];
    do {
      var b = n % 128;
      n = Math.floor(n / 128);
      out.push(n ? b | 128 : b);
    } while (n);
    return new Uint8Array(out);
  }
  function join(parts) {
    var size = 0;
    for (var i = 0; i < parts.length; i++) size += parts[i].length;
    var out = new Uint8Array(size), offset = 0;
    for (var j = 0; j < parts.length; j++) {
      out.set(parts[j], offset);
      offset += parts[j].length;
    }
    return out;
  }
  function decodeUtf8(bytes) {
    var text = "";
    for (var i = 0; i < bytes.length;) {
      var a = bytes[i++], code = a, count = 0;
      if (a >= 194 && a <= 223) { code = a & 31; count = 1; }
      else if (a >= 224 && a <= 239) { code = a & 15; count = 2; }
      else if (a >= 240 && a <= 244) { code = a & 7; count = 3; }
      else if (a >= 128) throw new Error("invalid UTF-8");
      for (var j = 0; j < count; j++) {
        if (i >= bytes.length || (bytes[i] & 192) !== 128) throw new Error("invalid UTF-8");
        code = code * 64 + (bytes[i++] & 63);
      }
      if ((count === 1 && code < 128) || (count === 2 && code < 2048) ||
          (count === 3 && code < 65536) || code > 1114111 ||
          (code >= 55296 && code <= 57343)) throw new Error("invalid UTF-8");
      if (code === 65279 && text.length === 0) continue;
      if (code < 65536) text += String.fromCharCode(code);
      else {
        code -= 65536;
        text += String.fromCharCode(55296 + Math.floor(code / 1024), 56320 + code % 1024);
      }
    }
    return text;
  }
  function encodeUtf8(text) {
    var bytes = [];
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      if (code >= 55296 && code <= 56319 && i + 1 < text.length) {
        var low = text.charCodeAt(i + 1);
        if (low >= 56320 && low <= 57343) {
          code = 65536 + (code - 55296) * 1024 + low - 56320;
          i++;
        }
      }
      if (code < 128) bytes.push(code);
      else if (code < 2048) bytes.push(192 | code >> 6, 128 | code & 63);
      else if (code < 65536) bytes.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63);
      else bytes.push(240 | code >> 18, 128 | code >> 12 & 63,
        128 | code >> 6 & 63, 128 | code & 63);
    }
    return new Uint8Array(bytes);
  }
  function fields(bytes) {
    var out = [], at = 0;
    while (at < bytes.length) {
      var start = at, tag = readVarint(bytes, at);
      at = tag.end;
      if (!Number.isSafeInteger(tag.value) || tag.value < 8) throw new Error("invalid tag");
      var wire = tag.value % 8, number = Math.floor(tag.value / 8), payload;
      if (wire === 0) {
        var scalar = readVarint(bytes, at);
        payload = bytes.subarray(at, scalar.end);
        at = scalar.end;
      } else if (wire === 1) {
        at += 8;
      } else if (wire === 2) {
        var length = readVarint(bytes, at);
        if (!Number.isSafeInteger(length.value)) throw new Error("invalid length");
        at = length.end;
        payload = bytes.subarray(at, at + length.value);
        at += length.value;
      } else if (wire === 5) {
        at += 4;
      } else {
        throw new Error("unsupported wire type");
      }
      if (at > bytes.length) throw new Error("truncated field");
      out.push({ number: number, wire: wire, raw: bytes.subarray(start, at),
        tag: bytes.subarray(start, tag.end), payload: payload });
    }
    return out;
  }
  // Return null if unchanged. Original wire slices and field order survive edits.
  function rewrite(bytes, edit) {
    var input = fields(bytes), parts = [], changed = false;
    for (var i = 0; i < input.length; i++) {
      var field = input[i], result = edit(field);
      if (result === false) { changed = true; continue; }
      if (result instanceof Uint8Array) {
        parts.push(field.tag, encodeVarint(result.length), result);
        changed = true;
      } else parts.push(field.raw);
    }
    return changed ? join(parts) : null;
  }
  function child(field, number, fn) {
    return field.number === number && field.wire === 2 ? rewrite(field.payload, fn) : null;
  }
  function tracking(field) {
    return field.number === 18 ? false : null; // pageadViewthroughconversion
  }
  function player(field) {
    if (field.number === 7 || field.number === 68) return false; // adPlacements, adSlots
    return child(field, 9, tracking); // playbackTracking
  }
  function watchContent(field) { return child(field, 2, player); }
  function watch(field) { return child(field, 1, watchContent); }
  function adParams(field) {
    return field.number === 1 && field.wire === 0 &&
      readVarint(field.payload, 0).value !== 0;
  }
  function reelEndpoint(field) {
    return field.number === 16 && field.wire === 2 && fields(field.payload).some(adParams);
  }
  function reelCommand(field) {
    return field.number === 139608561 && field.wire === 2 &&
      fields(field.payload).some(reelEndpoint);
  }
  function reelEntry(field) {
    return field.number === 1 && field.wire === 2 && fields(field.payload).some(reelCommand);
  }
  function reel(field) {
    return field.number === 2 && field.wire === 2 && reelEntryFromBytes(field.payload) ? false : null;
  }
  function reelEntryFromBytes(bytes) { return fields(bytes).some(reelEntry); }
  function cleanPlayer(obj) {
    if (!obj || typeof obj !== "object") return false;
    var changed = false;
    if (Array.isArray(obj.adPlacements) && obj.adPlacements.length) {
      obj.adPlacements = []; changed = true;
    }
    if (Array.isArray(obj.adSlots) && obj.adSlots.length) {
      obj.adSlots = []; changed = true;
    }
    if (obj.playbackTracking && Object.prototype.hasOwnProperty.call(
      obj.playbackTracking, "pageadViewthroughconversion")) {
      delete obj.playbackTracking.pageadViewthroughconversion; changed = true;
    }
    return changed;
  }
  function cleanJson(obj, endpoint) {
    var changed = false;
    if (endpoint === "player") return cleanPlayer(obj);
    if (endpoint === "get_watch" && Array.isArray(obj.contents)) {
      for (var i = 0; i < obj.contents.length; i++)
        changed = cleanPlayer(obj.contents[i] && obj.contents[i].player) || changed;
    }
    if (endpoint === "reel_watch_sequence" && Array.isArray(obj.entries)) {
      var before = obj.entries.length;
      obj.entries = obj.entries.filter(function (entry) {
        return !(entry && entry.command && entry.command.reelWatchEndpoint &&
          entry.command.reelWatchEndpoint.adClientParams &&
          entry.command.reelWatchEndpoint.adClientParams.isAd === true);
      });
      changed = before !== obj.entries.length;
    }
    return changed;
  }
  function preserveNumbers(source) {
    var prefix = '__CQ_YT_NUM_', numbers = [], output = '', i = 0;
    if (source.indexOf(prefix) !== -1) throw new Error('number-marker collision');
    while (i < source.length) {
      var ch = source[i];
      if (ch === '"') {
        var start = i++;
        while (i < source.length) {
          if (source[i] === '\\') { i += 2; continue; }
          if (source[i++] === '"') break;
        }
        output += source.slice(start, i); continue;
      }
      if (ch === '-' || (ch >= '0' && ch <= '9')) {
        var match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(source.slice(i));
        if (!match) throw new Error('invalid number');
        var value = match[0];
        if (/^-?\d+$/.test(value) && value !== '-0' && Number.isSafeInteger(Number(value))) output += value;
        else { output += JSON.stringify(prefix + numbers.length + '__'); numbers.push(value); }
        i += value.length; continue;
      }
      output += ch; i++;
    }
    return {text: output, numbers: numbers};
  }
  try {
    var url = $request && $request.url || "";
    var match = /^https:\/\/youtubei\.googleapis\.com\/youtubei\/v1\/(player|get_watch|reel\/reel_watch_sequence)(?:[?#]|$)/.exec(url);
    var endpoint = match && match[1].split("/").pop();
    var status = Number(($response.statusCode || $response.status || 200).toString().match(/\d{3}/)[0]);
    if (!endpoint || status !== 200) return unchanged();
    var body = $response.body;
    var binary = body instanceof Uint8Array || body instanceof ArrayBuffer;
    if (body instanceof ArrayBuffer) body = new Uint8Array(body);
    if (binary && !body.length) return unchanged();
    if (!binary && typeof body !== "string") return unchanged();
    var first = 0;
    if (binary && body.length >= 3 && body[0] === 239 && body[1] === 187 && body[2] === 191) first = 3;
    if (binary) while (first < body.length &&
      (body[first] === 32 || body[first] === 9 || body[first] === 10 || body[first] === 13)) first++;
    var jsonBytes = binary && (body[first] === 123 || body[first] === 91);
    if (!binary || jsonBytes) {
      var source = binary ? decodeUtf8(body) : body;
      var protectedInput = preserveNumbers(source);
      var data = JSON.parse(protectedInput.text);
      if (!cleanJson(data, endpoint)) return unchanged();
      var output = JSON.stringify(data).replace(/"__CQ_YT_NUM_(\d+)__"/g, function (_, index) {
        return protectedInput.numbers[Number(index)];
      });
      return $done({ body: binary ? encodeUtf8(output) : output });
    }
    var edited = rewrite(body, endpoint === "player" ? player :
      endpoint === "get_watch" ? watch : reel);
    return edited ? $done({ body: edited }) : unchanged();
  } catch (error) {
    console.log("youtube-ad-only: unchanged after parse error: " + String(error));
    return unchanged();
  }
})();
