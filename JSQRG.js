(function (vendor_qrcode) {
    // Default settings
    // ----------------
    var defaults = {
        // version range somewhere in 1 .. 40
        'minVersion': 1,
        'maxVersion': 40,

        // error correction level: `'L'`, `'M'`, `'Q'` or `'H'`
        'ecLevel': 'L',

        // offset in pixel if drawn onto existing canvas
        'left': 0,
        'top': 0,

        // size in pixel
        'size': 200,

        // code color or image element
        'fill': '#000',

        // background color, `null` for transparent background
        'background': null,

        // content
        'text': 'no text',

        // corner radius relative to module width: 0.0 .. 0.5
        'radius': 0.5,

        // quiet zone in modules
        'quiet': 0,

    };

    // Register the plugin
    // -------------------f
    window.JSQRG = function (options, $element) {
        var settings = {};
        Object.assign(settings, defaults, options);
        // ... (keep your mapping lines as-is)
        settings.minVersion = settings['minVersion'];
        settings.maxVersion = settings['maxVersion'];
        settings.ecLevel = settings['ecLevel'];
        settings.left = settings['left'];
        settings.top = settings['top'];
        settings.size = settings['size'];
        settings.fill = settings['fill'];
        settings.background = settings['background'];
        settings.text = settings['text'];
        settings.radius = settings['radius'];
        settings.quiet = settings['quiet'];


        const svg = createSvg(settings);
        $element.appendChild(svg);
    };

    // --- SVG fill defs (kept behavior) ---
    function createSvgFillDef(svg, settings) {
        const fill = settings.fill;
        if (typeof fill === 'string') return null;

        const type = fill.type;
        const pos = fill.position || [0, 0, 1, 0];
        const colorStops = fill.colorStops || [];
        const defs = svg.querySelector('defs') || (function () {
            const d = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svg.appendChild(d);
            return d;
        })();

        const id = 'qr_grad_' + Math.random().toString(36).slice(2, 9);

        if (type === 'linear-gradient') {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            g.setAttribute('id', id);
            g.setAttribute('x1', String(pos[0]));
            g.setAttribute('y1', String(pos[1]));
            g.setAttribute('x2', String(pos[2]));
            g.setAttribute('y2', String(pos[3]));
            for (let i = 0; i < colorStops.length; i++) {
                const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stop.setAttribute('offset', String(colorStops[i][0]));
                stop.setAttribute('stop-color', colorStops[i][1]);
                g.appendChild(stop);
            }
            defs.appendChild(g);
        } else if (type === 'radial-gradient') {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
            g.setAttribute('id', id);
            g.setAttribute('cx', String(pos[0]));
            g.setAttribute('cy', String(pos[1]));
            g.setAttribute('r', String(pos[2] || 0.5));
            for (let i = 0; i < colorStops.length; i++) {
                const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stop.setAttribute('offset', String(colorStops[i][0]));
                stop.setAttribute('stop-color', colorStops[i][1]);
                g.appendChild(stop);
            }
            defs.appendChild(g);
        } else {
            throw new Error('Unsupported fill for SVG');
        }
        return id;
    }

    // ---------- QR builder helpers (unchanged logic) ----------
    function createQRCode(text, level, version, quiet) {
        var qr = {};
        var vqr = vendor_qrcode(version, level);
        vqr.addData(text);
        vqr.make();

        quiet = quiet || 0;

        var qrModuleCount = vqr.getModuleCount(),
            quietModuleCount = vqr.getModuleCount() + 2 * quiet;

        function isDark(row, col) {
            row -= quiet;
            col -= quiet;
            if (row < 0 || row >= qrModuleCount || col < 0 || col >= qrModuleCount) return false;
            return vqr.isDark(row, col);
        }

        qr.text = text;
        qr.level = level;
        qr.version = version;
        qr.moduleCount = quietModuleCount;
        qr.isDark = isDark;
        return qr;
    }
    function createMinQRCode(text, level, minVersion, maxVersion, quiet) {
        minVersion = Math.max(1, minVersion || 1);
        maxVersion = Math.min(40, maxVersion || 40);
        for (var version = minVersion; version <= maxVersion; version += 1) {
            try {
                return createQRCode(text, level, version, quiet);
            } catch (err) { }
        }
        return undefined;
    }

    const r2 = v => Math.round(v * 100) / 100;
    // ---------- Main optimized createSvg ----------
    function createSvg(settings) {
        const size = settings.size;
        const qr = createMinQRCode(settings.text, settings.ecLevel, settings.minVersion, settings.maxVersion, settings.quiet);
        if (!qr) return null;

        const n = qr.moduleCount, s = size / n,
            rad = Math.min(0.5, Math.max(0, settings.radius || 0)) * s;
        const grid = new Uint8Array(n * n);
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) grid[r * n + c] = qr.isDark(r, c);

        const dark = (r, c) => r >= 0 && c >= 0 && r < n && c < n && grid[r * n + c];
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

        if (settings.background) {
            const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bg.setAttribute('width', size);
            bg.setAttribute('height', size);
            bg.setAttribute('fill', settings.background);
            svg.appendChild(bg);
        }

        const fillAttr = typeof settings.fill === 'string'
            ? settings.fill
            : `url(#${createSvgFillDef(svg, settings) || ''})` || '#000';

        const visited = new Uint8Array(n * n), stack = [], groups = [];
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            const i = r * n + c;
            if (!grid[i] || visited[i]) continue;
            const g = [];
            stack.push(i); visited[i] = 1;
            while (stack.length) {
                const id = stack.pop(), rr = ~~(id / n), cc = id % n;
                g.push([rr, cc]);
                const nb = [id - n, id + n, id - 1, id + 1];
                if (rr > 0 && grid[nb[0]] && !visited[nb[0]]) { visited[nb[0]] = 1; stack.push(nb[0]); }
                if (rr + 1 < n && grid[nb[1]] && !visited[nb[1]]) { visited[nb[1]] = 1; stack.push(nb[1]); }
                if (cc > 0 && grid[nb[2]] && !visited[nb[2]]) { visited[nb[2]] = 1; stack.push(nb[2]); }
                if (cc + 1 < n && grid[nb[3]] && !visited[nb[3]]) { visited[nb[3]] = 1; stack.push(nb[3]); }
            }
            groups.push(g);
        }

        for (const g of groups) {
            const edges = [], used = [];
            const adj = {};
            const addEdge = (x1, y1, x2, y2) => {
                const i = edges.length;
                const a = `${r2(x1)},${r2(y1)}`, b = `${r2(x2)},${r2(y2)}`;
                edges.push({ x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2) });
                used.push(0);
                (adj[a] ||= []).push(i);
                (adj[b] ||= []);
            };

            for (const [r, c] of g) {
                const x = settings.left + c * s, y = settings.top + r * s;
                if (!dark(r - 1, c)) addEdge(x, y, x + s, y);
                if (!dark(r, c + 1)) addEdge(x + s, y, x + s, y + s);
                if (!dark(r + 1, c)) addEdge(x + s, y + s, x, y + s);
                if (!dark(r, c - 1)) addEdge(x, y + s, x, y);
            }
            if (!edges.length) continue;

            const keys = Object.keys(adj), seen = {}, comps = [];
            for (const k of keys) if (!seen[k]) {
                const q = [k], comp = [k]; seen[k] = 1;
                while (q.length) {
                    const cur = q.shift();
                    for (const e of adj[cur]) {
                        const nb = `${edges[e].x2},${edges[e].y2}`;
                        if (!seen[nb]) { seen[nb] = 1; comp.push(nb); q.push(nb); }
                    }
                }
                comps.push(comp);
            }

            const loops = [];
            for (const comp of comps) {
                const set = Object.fromEntries(comp.map(v => [v, 1]));
                const local = {};
                const list = edges.map((e, i) => [`${e.x1},${e.y1}`, i])
                    .filter(([a, i]) => set[a] && set[`${edges[i].x2},${edges[i].y2}`]);
                for (const [a, i] of list) (local[a] ||= []).push(i);

                const nextEdge = k => {
                    const a = local[k]; while (a && a.length) {
                        const i = a.pop(); if (!used[i]) return i;
                    } return -1;
                };

                for (const [_, start] of list) {
                    if (used[start]) continue;
                    const pts = [{ x: edges[start].x1, y: edges[start].y1 }, { x: edges[start].x2, y: edges[start].y2 }];
                    let cur = `${edges[start].x2},${edges[start].y2}`, first = `${edges[start].x1},${edges[start].y1}`;
                    used[start] = 1;
                    let safety = 0;
                    while (cur !== first && safety++ < 1e5) {
                        let ni = nextEdge(cur);
                        if (ni >= 0) {
                            used[ni] = 1;
                            pts.push({ x: edges[ni].x2, y: edges[ni].y2 });
                            cur = `${edges[ni].x2},${edges[ni].y2}`;
                        } else {
                            const rev = list.find(([, i]) => !used[i] && `${edges[i].x2},${edges[i].y2}` === cur);
                            if (!rev) break;
                            used[rev[1]] = 1;
                            pts.push({ x: edges[rev[1]].x1, y: edges[rev[1]].y1 });
                            cur = `${edges[rev[1]].x1},${edges[rev[1]].y1}`;
                        }
                    }
                    if (pts.length < 3) continue;
                    if (pts[0].x !== pts.at(-1).x || pts[0].y !== pts.at(-1).y) pts.push(pts[0]);
                    const clean = pts.filter((p, i) => !i || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y);
                    if (clean.length >= 3) loops.push(clean);
                }
            }
            function makePath(pts) {
                if (pts.length <= 2) return '';
                const n = pts.length - 1, out = [];
                for (let i = 0; i < n; i++) {
                    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
                    const vinx = p1.x - p0.x, viny = p1.y - p0.y, voutx = p2.x - p1.x, vouty = p2.y - p1.y;
                    const lin = Math.hypot(vinx, viny), lout = Math.hypot(voutx, vouty);
                    const ninx = vinx / (lin || 1), niny = viny / (lin || 1), noutx = voutx / (lout || 1), nouty = vouty / (lout || 1);
                    const o = Math.min(rad, lin / 2, lout / 2);
                    out[i] = { pin: { x: p1.x - ninx * o, y: p1.y - niny * o }, cur: p1, pout: { x: p1.x + noutx * o, y: p1.y + nouty * o } };
                }
                let d = `M${r2(out[0].pin.x)} ${r2(out[0].pin.y)} `;
                for (let i = 0; i < n; i++) {
                    const a = out[i], b = out[(i + 1) % n];
                    d += `L${r2(a.pin.x)} ${r2(a.pin.y)} `;
                    const off = Math.hypot(a.pout.x - a.cur.x, a.pout.y - a.cur.y);
                    d += off < 1e-3
                        ? `L${r2(b.pin.x)} ${r2(b.pin.y)} `
                        : `Q${r2(a.cur.x)} ${r2(a.cur.y)} ${r2(a.pout.x)} ${r2(a.pout.y)} `;
                }
                return d + 'Z';
            };

            if (loops.length) {
                const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                p.setAttribute('fill', fillAttr);
                p.setAttribute('d', loops.map(makePath).join(' '));
                svg.appendChild(p);
            }
        }
        return svg;
    }


}(function () {
    // `qrcode` is the single public function defined by the `QR Code Generator`
    //---------------------------------------------------------------------
    //
    // QR Code Generator for JavaScript
    //
    // Copyright (c) 2009 Kazuhiko Arase
    //
    // URL: http://www.d-project.com/
    //
    // Licensed under the MIT license:
    //  http://www.opensource.org/licenses/mit-license.php
    //
    // The word 'QR Code' is registered trademark of
    // DENSO WAVE INCORPORATED
    //  http://www.denso-wave.com/qrcode/faqpatent-e.html
    //
    //---------------------------------------------------------------------

    var qrcode = function () {

        //---------------------------------------------------------------------
        // qrcode
        //---------------------------------------------------------------------

        /**
         * qrcode
         * @param typeNumber 1 to 40
         * @param errorCorrectLevel 'L','M','Q','H'
         */
        var qrcode = function (typeNumber, errorCorrectLevel) {

            var PAD0 = 0xEC,
                PAD1 = 0x11,
                _typeNumber = typeNumber,
                _errorCorrectLevel = QRErrorCorrectLevel[errorCorrectLevel],
                _modules = null,
                _moduleCount = 0,
                _dataCache = null,
                _dataList = new Array(),
                _this = {},
                makeImpl = function (test, maskPattern) {

                    _moduleCount = _typeNumber * 4 + 17;
                    _modules = function (moduleCount) {
                        var modules = new Array(moduleCount);
                        for (var row = 0; row < moduleCount; row += 1) {
                            modules[row] = new Array(moduleCount);
                            for (var col = 0; col < moduleCount; col += 1) {
                                modules[row][col] = null;
                            }
                        }
                        return modules;
                    }(_moduleCount);

                    setupPositionProbePattern(0, 0);
                    setupPositionProbePattern(_moduleCount - 7, 0);
                    setupPositionProbePattern(0, _moduleCount - 7);
                    setupPositionAdjustPattern();
                    setupTimingPattern();
                    setupTypeInfo(test, maskPattern);

                    if (_typeNumber >= 7) {
                        setupTypeNumber(test);
                    }

                    if (_dataCache == null) {
                        _dataCache = createData(_typeNumber, _errorCorrectLevel, _dataList);
                    }

                    mapData(_dataCache, maskPattern);
                },

                setupPositionProbePattern = function (row, col) {

                    for (var r = -1; r <= 7; r += 1) {

                        if (row + r <= -1 || _moduleCount <= row + r) continue;

                        for (var c = -1; c <= 7; c += 1) {

                            if (col + c <= -1 || _moduleCount <= col + c) continue;

                            if ((0 <= r && r <= 6 && (c == 0 || c == 6)) ||
                                (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
                                (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
                                _modules[row + r][col + c] = true;
                            } else {
                                _modules[row + r][col + c] = false;
                            }
                        }
                    }
                },

                getBestMaskPattern = function () {

                    var minLostPoint = 0,
                        pattern = 0;

                    for (var i = 0; i < 8; i += 1) {

                        makeImpl(true, i);

                        var lostPoint = QRUtil.getLostPoint(_this);

                        if (i == 0 || minLostPoint > lostPoint) {
                            minLostPoint = lostPoint;
                            pattern = i;
                        }
                    }

                    return pattern;
                },

                setupTimingPattern = function () {

                    for (var r = 8; r < _moduleCount - 8; r += 1) {
                        if (_modules[r][6] != null) {
                            continue;
                        }
                        _modules[r][6] = (r % 2 == 0);
                    }

                    for (var c = 8; c < _moduleCount - 8; c += 1) {
                        if (_modules[6][c] != null) {
                            continue;
                        }
                        _modules[6][c] = (c % 2 == 0);
                    }
                },

                setupPositionAdjustPattern = function () {

                    var pos = QRUtil.getPatternPosition(_typeNumber);

                    for (var i = 0; i < pos.length; i += 1) {

                        for (var j = 0; j < pos.length; j += 1) {

                            var row = pos[i];
                            var col = pos[j];

                            if (_modules[row][col] != null) {
                                continue;
                            }

                            for (var r = -2; r <= 2; r += 1) {

                                for (var c = -2; c <= 2; c += 1) {

                                    _modules[row + r][col + c] = r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0);
                                }
                            }
                        }
                    }
                },

                // TODO rm5 can be removed if we fix type to 5 (this method is called at 7 only)
                setupTypeNumber = function (test) {

                    var bits = QRUtil.getBCHTypeNumber(_typeNumber);

                    for (var i = 0; i < 18; i += 1) {
                        var mod = (!test && ((bits >> i) & 1) == 1);
                        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
                    }

                    for (var i = 0; i < 18; i += 1) {
                        var mod = (!test && ((bits >> i) & 1) == 1);
                        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
                    }
                },

                setupTypeInfo = function (test, maskPattern) {

                    var data = (_errorCorrectLevel << 3) | maskPattern;
                    var bits = QRUtil.getBCHTypeInfo(data);

                    for (var i = 0; i < 15; i += 1) {
                        let mod = (!test && ((bits >> i) & 1) == 1);

                        // vertical then horizontal
                        _modules[i < 6 ? i : (i < 8 ? i + 1 : _moduleCount - 15 + i)][8] = mod;
                        _modules[8][i < 8 ? _moduleCount - i - 1 : (i < 9 ? 15 - i : 14 - i)] = mod;
                    }

                    // fixed module
                    _modules[_moduleCount - 8][8] = (!test);
                },

                mapData = function (data, maskPattern) {

                    var inc = -1,
                        row = _moduleCount - 1,
                        bitIndex = 7,
                        byteIndex = 0,
                        maskFunc = QRUtil.getMaskFunction(maskPattern);

                    for (var col = _moduleCount - 1; col > 0; col -= 2) {

                        if (col == 6) col -= 1;

                        while (true) {

                            for (var c = 0; c < 2; c += 1) {

                                if (_modules[row][col - c] == null) {

                                    var dark = false;

                                    if (byteIndex < data.length) {
                                        dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
                                    }

                                    var mask = maskFunc(row, col - c);

                                    if (mask) {
                                        dark = !dark;
                                    }

                                    _modules[row][col - c] = dark;
                                    bitIndex -= 1;

                                    if (bitIndex == -1) {
                                        byteIndex += 1;
                                        bitIndex = 7;
                                    }
                                }
                            }

                            row += inc;

                            if (row < 0 || _moduleCount <= row) {
                                row -= inc;
                                inc = -inc;
                                break;
                            }
                        }
                    }
                },

                createBytes = function (buffer, rsBlocks) {

                    var offset = 0,
                        maxDcCount = 0,
                        maxEcCount = 0,
                        dcdata = new Array(rsBlocks.length),
                        ecdata = new Array(rsBlocks.length);

                    for (var r = 0; r < rsBlocks.length; r += 1) {

                        var dcCount = rsBlocks[r].dataCount,
                            ecCount = rsBlocks[r].totalCount - dcCount;

                        maxDcCount = Math.max(maxDcCount, dcCount);
                        maxEcCount = Math.max(maxEcCount, ecCount);

                        dcdata[r] = new Array(dcCount);

                        for (var i = 0; i < dcdata[r].length; i += 1) {
                            dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
                        }
                        offset += dcCount;

                        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount),
                            rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1),
                            modPoly = rawPoly.mod(rsPoly);

                        ecdata[r] = new Array(rsPoly.getLength() - 1);
                        for (var i = 0; i < ecdata[r].length; i += 1) {
                            var modIndex = i + modPoly.getLength() - ecdata[r].length;
                            ecdata[r][i] = (modIndex >= 0) ? modPoly.getAt(modIndex) : 0;
                        }
                    }

                    var totalCodeCount = 0;
                    for (var i = 0; i < rsBlocks.length; i += 1) {
                        totalCodeCount += rsBlocks[i].totalCount;
                    }

                    var data = new Array(totalCodeCount);
                    var index = 0;

                    for (var i = 0; i < maxDcCount; i += 1) {
                        for (var r = 0; r < rsBlocks.length; r += 1) {
                            if (i < dcdata[r].length) {
                                data[index] = dcdata[r][i];
                                index += 1;
                            }
                        }
                    }

                    for (var i = 0; i < maxEcCount; i += 1) {
                        for (var r = 0; r < rsBlocks.length; r += 1) {
                            if (i < ecdata[r].length) {
                                data[index] = ecdata[r][i];
                                index += 1;
                            }
                        }
                    }

                    return data;
                },

                createData = function (typeNumber, errorCorrectLevel, dataList) {

                    var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel),
                        buffer = qrBitBuffer();

                    for (var i = 0; i < dataList.length; i += 1) {
                        var data = dataList[i];
                        buffer.put(data.getMode(), 4);
                        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber));
                        data.write(buffer);
                    }

                    // calc num max data.
                    var totalDataCount = 0;
                    for (var i = 0; i < rsBlocks.length; i += 1) {
                        totalDataCount += rsBlocks[i].dataCount;
                    }

                    if (buffer.getLengthInBits() > totalDataCount * 8) {
                        throw new Error('code length overflow. (' +
                            buffer.getLengthInBits() +
                            '>' +
                            totalDataCount * 8 +
                            ')');
                    }

                    // end code
                    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
                        buffer.put(0, 4);
                    }

                    // padding
                    while (buffer.getLengthInBits() % 8 != 0) {
                        buffer.putBit(false);
                    }

                    // padding
                    while (true) {

                        if (buffer.getLengthInBits() >= totalDataCount * 8) {
                            break;
                        }
                        buffer.put(PAD0, 8);

                        if (buffer.getLengthInBits() >= totalDataCount * 8) {
                            break;
                        }
                        buffer.put(PAD1, 8);
                    }

                    return createBytes(buffer, rsBlocks);
                };

            _this.addData = function (data) {
                var newData = qr8BitByte(data);
                _dataList.push(newData);
                _dataCache = null;
            };

            _this.isDark = function (row, col) {
                if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
                    throw new Error(row + ',' + col);
                }
                return _modules[row][col];
            };

            _this.getModuleCount = function () {
                return _moduleCount;
            };

            _this.make = function () {
                makeImpl(false, getBestMaskPattern());
            };

            return _this;
        };

        //---------------------------------------------------------------------
        // qrcode.stringToBytes
        //---------------------------------------------------------------------

        // UTF-8 version
        qrcode.stringToBytes = function (s) {
            // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
            function toUTF8Array(str) {
                var utf8 = [];
                for (var i = 0; i < str.length; i++) {
                    var charcode = str.charCodeAt(i);
                    if (charcode < 0x80) utf8.push(charcode);
                    else if (charcode < 0x800) {
                        utf8.push(0xc0 | (charcode >> 6),
                            0x80 | (charcode & 0x3f));
                    } else if (charcode < 0xd800 || charcode >= 0xe000) {
                        utf8.push(0xe0 | (charcode >> 12),
                            0x80 | ((charcode >> 6) & 0x3f),
                            0x80 | (charcode & 0x3f));
                    }
                    // surrogate pair
                    else {
                        i++;
                        // UTF-16 encodes 0x10000-0x10FFFF by
                        // subtracting 0x10000 and splitting the
                        // 20 bits of 0x0-0xFFFFF into two halves
                        charcode = 0x10000 + (((charcode & 0x3ff) << 10) |
                            (str.charCodeAt(i) & 0x3ff));
                        utf8.push(0xf0 | (charcode >> 18),
                            0x80 | ((charcode >> 12) & 0x3f),
                            0x80 | ((charcode >> 6) & 0x3f),
                            0x80 | (charcode & 0x3f));
                    }
                }
                return utf8;
            }
            return toUTF8Array(s);
        };

        //---------------------------------------------------------------------
        // QRMode
        //---------------------------------------------------------------------

        var QRMode = {
            MODE_8BIT_BYTE: 1 << 2,
        };

        //---------------------------------------------------------------------
        // QRErrorCorrectLevel
        //---------------------------------------------------------------------

        var QRErrorCorrectLevel = {
            'L': 1,
            'M': 0,
            'Q': 3,
            'H': 2
        };

        //---------------------------------------------------------------------
        // QRMaskPattern
        //---------------------------------------------------------------------

        var QRMaskPattern = {
            PATTERN000: 0,
            PATTERN001: 1,
            PATTERN010: 2,
            PATTERN011: 3,
            PATTERN100: 4,
            PATTERN101: 5,
            PATTERN110: 6,
            PATTERN111: 7
        };

        //---------------------------------------------------------------------
        // QRUtil
        //---------------------------------------------------------------------

        var QRUtil = function () {

            var PATTERN_POSITION_TABLE = [
                [],
                [6, 18],
                [6, 22],
                [6, 26],
                [6, 30],
                [6, 34],
                [6, 22, 38],
                [6, 24, 42],
                [6, 26, 46],
                [6, 28, 50],
                [6, 30, 54],
                [6, 32, 58],
                [6, 34, 62],
                [6, 26, 46, 66],
                [6, 26, 48, 70],
                [6, 26, 50, 74],
                [6, 30, 54, 78],
                [6, 30, 56, 82],
                [6, 30, 58, 86],
                [6, 34, 62, 90],
                [6, 28, 50, 72, 94],
                [6, 26, 50, 74, 98],
                [6, 30, 54, 78, 102],
                [6, 28, 54, 80, 106],
                [6, 32, 58, 84, 110],
                [6, 30, 58, 86, 114],
                [6, 34, 62, 90, 118],
                [6, 26, 50, 74, 98, 122],
                [6, 30, 54, 78, 102, 126],
                [6, 26, 52, 78, 104, 130],
                [6, 30, 56, 82, 108, 134],
                [6, 34, 60, 86, 112, 138],
                [6, 30, 58, 86, 114, 142],
                [6, 34, 62, 90, 118, 146],
                [6, 30, 54, 78, 102, 126, 150],
                [6, 24, 50, 76, 102, 128, 154],
                [6, 28, 54, 80, 106, 132, 158],
                [6, 32, 58, 84, 110, 136, 162],
                [6, 26, 54, 82, 110, 138, 166],
                [6, 30, 58, 86, 114, 142, 170]
            ],
                G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
                G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
                G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),

                _this = {},

                getBCHDigit = function (data) {
                    var digit = 0;
                    while (data != 0) {
                        digit += 1;
                        data >>>= 1;
                    }
                    return digit;
                };

            _this.getBCHTypeInfo = function (data) {
                var d = data << 10;
                while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
                    d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15)));
                }
                return ((data << 10) | d) ^ G15_MASK;
            };

            // TODO rm5 (see rm5 above)
            _this.getBCHTypeNumber = function (data) {
                var d = data << 12;
                while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
                    d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18)));
                }
                return (data << 12) | d;
            };

            _this.getPatternPosition = function (typeNumber) {
                return PATTERN_POSITION_TABLE[typeNumber - 1];
            };

            _this.getMaskFunction = function (maskPattern) {

                switch (maskPattern) {

                    case QRMaskPattern.PATTERN000:
                        return function (i, j) { return (i + j) % 2 == 0; };
                    case QRMaskPattern.PATTERN001:
                        return function (i, j) { return i % 2 == 0; };
                    case QRMaskPattern.PATTERN010:
                        return function (i, j) { return j % 3 == 0; };
                    case QRMaskPattern.PATTERN011:
                        return function (i, j) { return (i + j) % 3 == 0; };
                    case QRMaskPattern.PATTERN100:
                        return function (i, j) { return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0; };
                    case QRMaskPattern.PATTERN101:
                        return function (i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
                    case QRMaskPattern.PATTERN110:
                        return function (i, j) { return ((i * j) % 2 + (i * j) % 3) % 2 == 0; };
                    case QRMaskPattern.PATTERN111:
                        return function (i, j) { return ((i * j) % 3 + (i + j) % 2) % 2 == 0; };

                    default:
                        throw new Error('bad maskPattern:' + maskPattern);
                }
            };

            _this.getErrorCorrectPolynomial = function (errorCorrectLength) {
                var a = qrPolynomial([1], 0);
                for (var i = 0; i < errorCorrectLength; i += 1) {
                    a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0));
                }
                return a;
            };

            _this.getLengthInBits = function (mode, type) {
                if (mode != QRMode.MODE_8BIT_BYTE || type < 1 || type > 40)
                    throw new Error('mode: ' + mode + '; type: ' + type);

                return type < 10 ? 8 : 16;
            };

            _this.getLostPoint = function (qrcode) {

                var moduleCount = qrcode.getModuleCount(),
                    lostPoint = 0;

                // LEVEL1

                for (var row = 0; row < moduleCount; row += 1) {
                    for (var col = 0; col < moduleCount; col += 1) {

                        var sameCount = 0,
                            dark = qrcode.isDark(row, col);

                        for (var r = -1; r <= 1; r += 1) {

                            if (row + r < 0 || moduleCount <= row + r) {
                                continue;
                            }

                            for (var c = -1; c <= 1; c += 1) {

                                if (col + c < 0 || moduleCount <= col + c) {
                                    continue;
                                }

                                if (r == 0 && c == 0) {
                                    continue;
                                }

                                if (dark == qrcode.isDark(row + r, col + c)) {
                                    sameCount += 1;
                                }
                            }
                        }

                        if (sameCount > 5) {
                            lostPoint += (3 + sameCount - 5);
                        }
                    }
                };

                // LEVEL2

                for (var row = 0; row < moduleCount - 1; row += 1) {
                    for (var col = 0; col < moduleCount - 1; col += 1) {
                        var count = 0;
                        if (qrcode.isDark(row, col)) count += 1;
                        if (qrcode.isDark(row + 1, col)) count += 1;
                        if (qrcode.isDark(row, col + 1)) count += 1;
                        if (qrcode.isDark(row + 1, col + 1)) count += 1;
                        if (count == 0 || count == 4) {
                            lostPoint += 3;
                        }
                    }
                }

                // LEVEL3

                for (var row = 0; row < moduleCount; row += 1) {
                    for (var col = 0; col < moduleCount - 6; col += 1) {
                        if (qrcode.isDark(row, col) &&
                            !qrcode.isDark(row, col + 1) &&
                            qrcode.isDark(row, col + 2) &&
                            qrcode.isDark(row, col + 3) &&
                            qrcode.isDark(row, col + 4) &&
                            !qrcode.isDark(row, col + 5) &&
                            qrcode.isDark(row, col + 6)) {
                            lostPoint += 40;
                        }
                    }
                }

                for (var col = 0; col < moduleCount; col += 1) {
                    for (var row = 0; row < moduleCount - 6; row += 1) {
                        if (qrcode.isDark(row, col) &&
                            !qrcode.isDark(row + 1, col) &&
                            qrcode.isDark(row + 2, col) &&
                            qrcode.isDark(row + 3, col) &&
                            qrcode.isDark(row + 4, col) &&
                            !qrcode.isDark(row + 5, col) &&
                            qrcode.isDark(row + 6, col)) {
                            lostPoint += 40;
                        }
                    }
                }

                // LEVEL4

                var darkCount = 0;

                for (var col = 0; col < moduleCount; col += 1) {
                    for (var row = 0; row < moduleCount; row += 1) {
                        if (qrcode.isDark(row, col)) {
                            darkCount += 1;
                        }
                    }
                }

                var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
                lostPoint += ratio * 10;

                return lostPoint;
            };

            return _this;
        }();

        //---------------------------------------------------------------------
        // QRMath
        //---------------------------------------------------------------------

        var QRMath = function () {

            var EXP_TABLE = new Array(256),
                LOG_TABLE = new Array(256);

            // initialize tables
            for (var i = 0; i < 8; i += 1) {
                EXP_TABLE[i] = 1 << i;
            }
            for (var i = 8; i < 256; i += 1) {
                EXP_TABLE[i] = EXP_TABLE[i - 4] ^
                    EXP_TABLE[i - 5] ^
                    EXP_TABLE[i - 6] ^
                    EXP_TABLE[i - 8];
            }
            for (var i = 0; i < 255; i += 1) {
                LOG_TABLE[EXP_TABLE[i]] = i;
            }

            var _this = {};

            _this.glog = function (n) {

                if (n < 1) {
                    throw new Error('glog(' + n + ')');
                }

                return LOG_TABLE[n];
            };

            _this.gexp = function (n) {

                while (n < 0) {
                    n += 255;
                }

                while (n >= 256) {
                    n -= 255;
                }

                return EXP_TABLE[n];
            };

            return _this;
        }();

        //---------------------------------------------------------------------
        // qrPolynomial
        //---------------------------------------------------------------------

        function qrPolynomial(num, shift) {

            if (typeof num.length == 'undefined') {
                throw new Error(num.length + '/' + shift);
            }

            var _num = function () {
                var offset = 0;
                while (offset < num.length && num[offset] == 0) {
                    offset += 1;
                }
                var _num = new Array(num.length - offset + shift);
                for (var i = 0; i < num.length - offset; i += 1) {
                    _num[i] = num[i + offset];
                }
                return _num;
            }();

            var _this = {};

            _this.getAt = function (index) {
                return _num[index];
            };

            _this.getLength = function () {
                return _num.length;
            };

            _this.multiply = function (e) {

                var num = new Array(_this.getLength() + e.getLength() - 1);

                for (var i = 0; i < _this.getLength(); i += 1) {
                    for (var j = 0; j < e.getLength(); j += 1) {
                        num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i)) + QRMath.glog(e.getAt(j)));
                    }
                }

                return qrPolynomial(num, 0);
            };

            _this.mod = function (e) {

                if (_this.getLength() - e.getLength() < 0) {
                    return _this;
                }

                var ratio = QRMath.glog(_this.getAt(0)) - QRMath.glog(e.getAt(0));

                var num = new Array(_this.getLength());
                for (var i = 0; i < _this.getLength(); i += 1) {
                    num[i] = _this.getAt(i);
                }

                for (var i = 0; i < e.getLength(); i += 1) {
                    num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
                }

                // recursive call
                return qrPolynomial(num, 0).mod(e);
            };

            return _this;
        };

        //---------------------------------------------------------------------
        // QRRSBlock
        //---------------------------------------------------------------------

        var QRRSBlock = function () {

            // TODO is it possible to generate this block with JS in let kB?
            var RS_BLOCK_TABLE = [

                // L
                // M
                // Q
                // H

                // 1
                [1, 26, 19],
                [1, 26, 16],
                [1, 26, 13],
                [1, 26, 9],

                // 2
                [1, 44, 34],
                [1, 44, 28],
                [1, 44, 22],
                [1, 44, 16],

                // 3
                [1, 70, 55],
                [1, 70, 44],
                [2, 35, 17],
                [2, 35, 13],

                // 4
                [1, 100, 80],
                [2, 50, 32],
                [2, 50, 24],
                [4, 25, 9],

                // 5
                [1, 134, 108],
                [2, 67, 43],
                [2, 33, 15, 2, 34, 16],
                [2, 33, 11, 2, 34, 12],

                // 6
                [2, 86, 68],
                [4, 43, 27],
                [4, 43, 19],
                [4, 43, 15],

                // 7
                [2, 98, 78],
                [4, 49, 31],
                [2, 32, 14, 4, 33, 15],
                [4, 39, 13, 1, 40, 14],

                // 8
                [2, 121, 97],
                [2, 60, 38, 2, 61, 39],
                [4, 40, 18, 2, 41, 19],
                [4, 40, 14, 2, 41, 15],

                // 9
                [2, 146, 116],
                [3, 58, 36, 2, 59, 37],
                [4, 36, 16, 4, 37, 17],
                [4, 36, 12, 4, 37, 13],

                // 10
                [2, 86, 68, 2, 87, 69],
                [4, 69, 43, 1, 70, 44],
                [6, 43, 19, 2, 44, 20],
                [6, 43, 15, 2, 44, 16],

                // 11
                [4, 101, 81],
                [1, 80, 50, 4, 81, 51],
                [4, 50, 22, 4, 51, 23],
                [3, 36, 12, 8, 37, 13],

                // 12
                [2, 116, 92, 2, 117, 93],
                [6, 58, 36, 2, 59, 37],
                [4, 46, 20, 6, 47, 21],
                [7, 42, 14, 4, 43, 15],

                // 13
                [4, 133, 107],
                [8, 59, 37, 1, 60, 38],
                [8, 44, 20, 4, 45, 21],
                [12, 33, 11, 4, 34, 12],

                // 14
                [3, 145, 115, 1, 146, 116],
                [4, 64, 40, 5, 65, 41],
                [11, 36, 16, 5, 37, 17],
                [11, 36, 12, 5, 37, 13],

                // 15
                [5, 109, 87, 1, 110, 88],
                [5, 65, 41, 5, 66, 42],
                [5, 54, 24, 7, 55, 25],
                [11, 36, 12, 7, 37, 13],

                // 16
                [5, 122, 98, 1, 123, 99],
                [7, 73, 45, 3, 74, 46],
                [15, 43, 19, 2, 44, 20],
                [3, 45, 15, 13, 46, 16],

                // 17
                [1, 135, 107, 5, 136, 108],
                [10, 74, 46, 1, 75, 47],
                [1, 50, 22, 15, 51, 23],
                [2, 42, 14, 17, 43, 15],

                // 18
                [5, 150, 120, 1, 151, 121],
                [9, 69, 43, 4, 70, 44],
                [17, 50, 22, 1, 51, 23],
                [2, 42, 14, 19, 43, 15],

                // 19
                [3, 141, 113, 4, 142, 114],
                [3, 70, 44, 11, 71, 45],
                [17, 47, 21, 4, 48, 22],
                [9, 39, 13, 16, 40, 14],

                // 20
                [3, 135, 107, 5, 136, 108],
                [3, 67, 41, 13, 68, 42],
                [15, 54, 24, 5, 55, 25],
                [15, 43, 15, 10, 44, 16],

                // 21
                [4, 144, 116, 4, 145, 117],
                [17, 68, 42],
                [17, 50, 22, 6, 51, 23],
                [19, 46, 16, 6, 47, 17],

                // 22
                [2, 139, 111, 7, 140, 112],
                [17, 74, 46],
                [7, 54, 24, 16, 55, 25],
                [34, 37, 13],

                // 23
                [4, 151, 121, 5, 152, 122],
                [4, 75, 47, 14, 76, 48],
                [11, 54, 24, 14, 55, 25],
                [16, 45, 15, 14, 46, 16],

                // 24
                [6, 147, 117, 4, 148, 118],
                [6, 73, 45, 14, 74, 46],
                [11, 54, 24, 16, 55, 25],
                [30, 46, 16, 2, 47, 17],

                // 25
                [8, 132, 106, 4, 133, 107],
                [8, 75, 47, 13, 76, 48],
                [7, 54, 24, 22, 55, 25],
                [22, 45, 15, 13, 46, 16],

                // 26
                [10, 142, 114, 2, 143, 115],
                [19, 74, 46, 4, 75, 47],
                [28, 50, 22, 6, 51, 23],
                [33, 46, 16, 4, 47, 17],

                // 27
                [8, 152, 122, 4, 153, 123],
                [22, 73, 45, 3, 74, 46],
                [8, 53, 23, 26, 54, 24],
                [12, 45, 15, 28, 46, 16],

                // 28
                [3, 147, 117, 10, 148, 118],
                [3, 73, 45, 23, 74, 46],
                [4, 54, 24, 31, 55, 25],
                [11, 45, 15, 31, 46, 16],

                // 29
                [7, 146, 116, 7, 147, 117],
                [21, 73, 45, 7, 74, 46],
                [1, 53, 23, 37, 54, 24],
                [19, 45, 15, 26, 46, 16],

                // 30
                [5, 145, 115, 10, 146, 116],
                [19, 75, 47, 10, 76, 48],
                [15, 54, 24, 25, 55, 25],
                [23, 45, 15, 25, 46, 16],

                // 31
                [13, 145, 115, 3, 146, 116],
                [2, 74, 46, 29, 75, 47],
                [42, 54, 24, 1, 55, 25],
                [23, 45, 15, 28, 46, 16],

                // 32
                [17, 145, 115],
                [10, 74, 46, 23, 75, 47],
                [10, 54, 24, 35, 55, 25],
                [19, 45, 15, 35, 46, 16],

                // 33
                [17, 145, 115, 1, 146, 116],
                [14, 74, 46, 21, 75, 47],
                [29, 54, 24, 19, 55, 25],
                [11, 45, 15, 46, 46, 16],

                // 34
                [13, 145, 115, 6, 146, 116],
                [14, 74, 46, 23, 75, 47],
                [44, 54, 24, 7, 55, 25],
                [59, 46, 16, 1, 47, 17],

                // 35
                [12, 151, 121, 7, 152, 122],
                [12, 75, 47, 26, 76, 48],
                [39, 54, 24, 14, 55, 25],
                [22, 45, 15, 41, 46, 16],

                // 36
                [6, 151, 121, 14, 152, 122],
                [6, 75, 47, 34, 76, 48],
                [46, 54, 24, 10, 55, 25],
                [2, 45, 15, 64, 46, 16],

                // 37
                [17, 152, 122, 4, 153, 123],
                [29, 74, 46, 14, 75, 47],
                [49, 54, 24, 10, 55, 25],
                [24, 45, 15, 46, 46, 16],

                // 38
                [4, 152, 122, 18, 153, 123],
                [13, 74, 46, 32, 75, 47],
                [48, 54, 24, 14, 55, 25],
                [42, 45, 15, 32, 46, 16],

                // 39
                [20, 147, 117, 4, 148, 118],
                [40, 75, 47, 7, 76, 48],
                [43, 54, 24, 22, 55, 25],
                [10, 45, 15, 67, 46, 16],

                // 40
                [19, 148, 118, 6, 149, 119],
                [18, 75, 47, 31, 76, 48],
                [34, 54, 24, 34, 55, 25],
                [20, 45, 15, 61, 46, 16]
            ];

            var qrRSBlock = function (totalCount, dataCount) {
                var _this = {};
                _this.totalCount = totalCount;
                _this.dataCount = dataCount;
                return _this;
            };

            var _this = {};

            var getRsBlockTable = function (typeNumber, errorCorrectLevel) {
                switch (errorCorrectLevel) {
                    case QRErrorCorrectLevel['L']:
                        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
                    case QRErrorCorrectLevel['M']:
                        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
                    case QRErrorCorrectLevel['Q']:
                        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
                    case QRErrorCorrectLevel['H']:
                        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
                    default:
                        return undefined;
                }
            };

            _this.getRSBlocks = function (typeNumber, errorCorrectLevel) {

                var rsBlock = getRsBlockTable(typeNumber, errorCorrectLevel);

                if (typeof rsBlock == 'undefined') {
                    throw new Error('bad rs block @ typeNumber:' + typeNumber +
                        '/errorCorrectLevel:' + errorCorrectLevel);
                }

                var length = rsBlock.length / 3,
                    list = new Array();

                for (var i = 0; i < length; i += 1) {

                    var count = rsBlock[i * 3 + 0],
                        totalCount = rsBlock[i * 3 + 1],
                        dataCount = rsBlock[i * 3 + 2];

                    for (var j = 0; j < count; j += 1) {
                        list.push(qrRSBlock(totalCount, dataCount));
                    }
                }

                return list;
            };

            return _this;
        }();

        //---------------------------------------------------------------------
        // qrBitBuffer
        //---------------------------------------------------------------------

        var qrBitBuffer = function () {

            var _buffer = new Array(),
                _length = 0,
                _this = {};

            _this.getBuffer = function () {
                return _buffer;
            };

            _this.getAt = function (index) {
                var bufIndex = Math.floor(index / 8);
                return ((_buffer[bufIndex] >>> (7 - index % 8)) & 1) == 1;
            };

            _this.put = function (num, length) {
                for (var i = 0; i < length; i += 1) {
                    _this.putBit(((num >>> (length - i - 1)) & 1) == 1);
                }
            };

            _this.getLengthInBits = function () {
                return _length;
            };

            _this.putBit = function (bit) {

                var bufIndex = Math.floor(_length / 8);
                if (_buffer.length <= bufIndex) {
                    _buffer.push(0);
                }

                if (bit) {
                    _buffer[bufIndex] |= (0x80 >>> (_length % 8));
                }

                _length += 1;
            };

            return _this;
        };

        //---------------------------------------------------------------------
        // qr8BitByte
        //---------------------------------------------------------------------

        var qr8BitByte = function (data) {

            var _mode = QRMode.MODE_8BIT_BYTE,
                _data = data,
                _bytes = qrcode.stringToBytes(data),
                _this = {};

            _this.getMode = function () {
                return _mode;
            };

            _this.getLength = function (buffer) {
                return _bytes.length;
            };

            _this.write = function (buffer) {
                for (var i = 0; i < _bytes.length; i += 1) {
                    buffer.put(_bytes[i], 8);
                }
            };

            return _this;
        };

        // returns qrcode function.
        return qrcode;
    }();

    return qrcode; // eslint-disable-line no-undef
}()));

