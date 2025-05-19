// --- Fungsi Konversi HSL ke HEX ---
export function convertHslStringToHexString(hslStr) {
  // 1. Parse HSL string (contoh: "hsl(120, 70%, 90%)")
  const match = hslStr.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
  if (!match) {
    console.error("Format string HSL tidak valid:", hslStr);
    return "#000000"; // Fallback ke hitam jika format salah
  }
  let h = parseInt(match[1], 10); // 0-360
  let s = parseInt(match[2], 10) / 100; // 0-1
  let l = parseInt(match[3], 10) / 100; // 0-1

  // 2. HSL to RGB
  // Rumus konversi HSL ke RGB
  // (Sumber: https://www.niwa.nu/2013/05/math-behind-colorspace-conversions-rgb-hsl/)
  // (Sumber lain: https://css-tricks.com/converting-color-spaces-in-javascript/)
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  // 3. RGB to HEX
  const toHex = (c) => {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
