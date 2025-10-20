# JSQRG – Lightweight SVG QR Code Generator

JSQRG is a **lightweight, dependency-free, modern QR code generator** that outputs clean SVG with optional rounded corners and gradients. Designed for speed, low footprint, and modern browsers.  


## Features

- Pure SVG output (no canvas, no images)
- Supports **rounded corners** for QR modules
- Optional **linear or radial gradients** as fill
- High error correction levels (L, M, Q, H)
- Minimal code footprint (≈1.5k lines)
- Fully dependency-free, no jQuery or global variables

## Trimmed down to be low weight

The goal of the library is to generate QR codes only. For that reason we have removed all additional code such as GIF image generation, background image support, rendering a label on top, removed some dead code, and freed it from depending on jQuery. Also, the resulting library does not use any global variables, is all strict mode, and relies on modern browser standards.

The result | Original | New
:--- | ---: | ---:
Lines of code | 2332 | 1446 (-33%)
Size | 64kB | 52kB (-22%)
Minified | 20.6kB | 14.6kB (-40%)
Gzipped | 8kB | 5.6kB (-35%)


## Installation

Just include the script in your HTML:

```html
<script src="path/to/jsqrg.js"></script>
````

No other dependencies are required.


## Usage Example

```html
<div id="qrContainer"></div>

<script>
  JSQRG({
      text: "https://example.com",
      size: 250,
      radius: 0.3,
      fill: { 
          type: "linear-gradient", 
          position: [0, 0, 1, 1], 
          colorStops: [[0, "#ff0000"], [1, "#0000ff"]]
      },
      background: "#fff",
      ecLevel: "H",
      quiet: 2
  }, document.getElementById("qrContainer"));
</script>
```


## Attributes

| Attribute  | Options           | Default | Description                                                                                             |
| ---------- | ----------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| text       | String            | ""      | Any text, link, or email. Library will auto-fit the QR code size.                                       |
| radius     | 0 .. 0.5          | 0.5     | Roundness of QR blocks. 0 = square, 0.5 = max round.                                                    |
| ecLevel    | L, M, Q, H        | L       | Error correction level: L=7%, M=15%, Q=25%, H=30%. Higher levels increase size but improve readability. |
| fill       | color or gradient | #000000 | QR code color. Use gradient objects for fancy fills.                                                    |
| background | color or null     | null    | Background color, or null for transparent.                                                              |
| size       | int               | 200     | Total QR code size in pixels (square).                                                                  |

## Gradient Fill Example

```javascript
JSQRG({
    text: "Hello World!",
    size: 200,
    radius: 0.5,
    fill: {
        type: "linear-gradient",
        position: [0, 0, 1, 1], // [x1, y1, x2, y2]
        colorStops: [
            [0, "#ff0000"],
            [1, "#00ff00"]
        ]
    },
    background: "#fff",
    ecLevel: "Q"
}, document.getElementById("qrContainer"));
```

Supports `linear-gradient` and `radial-gradient` fills.


## License

MIT License – free for personal and commercial use.
