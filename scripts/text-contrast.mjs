// Conservative solid-background sampling. Gradients/images, opacity and
// pseudo-elements need separate review; this is not a conformance scanner.
export async function textContrast(page) {
  return page.evaluate(() => {
    function rgb(value) { if (!value.startsWith("rgb")) return null; const parts = value.match(/[\d.]+/g)?.map(Number); return parts?.length >= 3 ? [...parts.slice(0, 3), parts[3] ?? 1] : null; }
    function blend(top, bottom) { return top.slice(0, 3).map((v, i) => v * top[3] + bottom[i] * (1 - top[3])); }
    function luminance(color) { const c = color.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return c[0] * .2126 + c[1] * .7152 + c[2] * .0722; }
    function background(node) {
      const layers = [];
      for (let item = node; item; item = item.parentElement) {
        const style = getComputedStyle(item);
        if (style.backgroundImage !== "none" || Number(style.opacity) !== 1) return null;
        const color = rgb(style.backgroundColor);
        if (!color) return null;
        layers.push(color);
        if (color[3] === 1) {
          let base = color.slice(0, 3);
          for (let i = layers.length - 2; i >= 0; i--) base = blend(layers[i], base);
          return base;
        }
      }
      return null;
    }
    const samples = [], skipped = [];
    for (const node of document.querySelectorAll("body *")) {
      if (!node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) || node.closest('[aria-hidden="true"],button:disabled,fieldset:disabled,.brand,.brand-mark,.company-mark,script,style,svg')) continue;
      const placeholder = node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement ? !node.value && node.placeholder : "";
      const fieldText = node instanceof HTMLInputElement && node.type !== "password" || node instanceof HTMLTextAreaElement ? node.value : node instanceof HTMLSelectElement ? node.selectedOptions[0]?.textContent : "";
      const text = placeholder || fieldText || [...node.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join("").trim();
      if (!text || node.closest("nextjs-portal")) continue;
      const style = getComputedStyle(node), foreground = placeholder ? getComputedStyle(node, "::placeholder").color : style.color;
      const fg = rgb(foreground), bg = background(node);
      const selector = node.tagName.toLowerCase() + (node.classList.length ? "." + [...node.classList].join(".") : "") + (placeholder ? "::placeholder" : "");
      let translucent = false;
      for (let item = node; item; item = item.parentElement) if (Number(getComputedStyle(item).opacity) !== 1) translucent = true;
      if (!fg || !bg || translucent) { skipped.push(selector); continue; }
      const a = luminance(blend(fg, bg)), b = luminance(bg);
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.6667 && Number(style.fontWeight) >= 700);
      samples.push({ selector, text: text.slice(0, 55), foreground, background: bg.map(Math.round), ratio: Number(ratio.toFixed(3)), required: large ? 3 : 4.5, passes: ratio >= (large ? 3 : 4.5) });
    }
    return { samples, skipped: [...new Set(skipped)] };
  });
}
