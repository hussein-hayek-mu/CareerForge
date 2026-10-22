// Original CareerForge motion artwork. Render locally with the existing browser;
// no stock footage, generative API, network requests, or runtime dependencies.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  channel: process.platform === "win32" ? "msedge" : "chromium", headless: true,
  args: ["--disable-gpu", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"]
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  console.log("Rendering original CareerForge film locally...");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280; canvas.height = 720;
    document.body.append(canvas);
    const ctx = canvas.getContext("2d");
    const tau = Math.PI * 2, duration = 12;
    const core = { x: 866, y: 352 };
    const smooth = (a, b, value) => { const x = Math.max(0, Math.min(1, (value - a) / (b - a))); return x * x * (3 - 2 * x); };
    function line(points, color, width = 1) {
      ctx.beginPath(); points.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }
    function draw(seconds) {
      const phase = seconds / duration, angle = phase * tau;
      ctx.fillStyle = "#0b120e"; ctx.fillRect(0, 0, 1280, 720);
      const glow = ctx.createRadialGradient(866, 344, 10, 866, 344, 580);
      glow.addColorStop(0, "#34542b88"); glow.addColorStop(.5, "#1b393155"); glow.addColorStop(1, "#0b120e00");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 1280, 720);
      // Soft aurora ribbons give the network depth without flashing behind text.
      ctx.save(); ctx.globalCompositeOperation = "screen";
      for (let ribbon = 0; ribbon < 4; ribbon++) {
        const drift = Math.sin(angle + ribbon * 1.2);
        const light = ctx.createLinearGradient(450, 600, 1200, 80);
        light.addColorStop(0, "#64d4b000");
        light.addColorStop(.5, ribbon % 2 ? "#75d9bc18" : "#b9ed7d20");
        light.addColorStop(1, "#b9ed7d00");
        ctx.beginPath(); ctx.moveTo(410, 660 + ribbon * 35);
        ctx.bezierCurveTo(670 + drift * 65, 500, 690, 100 + drift * 50, 1280, 65 + ribbon * 80);
        ctx.strokeStyle = light; ctx.lineWidth = 22 + ribbon * 15;
        ctx.shadowColor = "#8edab0"; ctx.shadowBlur = 35; ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = "#9bc7880b"; ctx.lineWidth = .6;
      for (let i = 0; i < 25; i++) { const x = i * 64; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke(); }
      for (let i = 0; i < 13; i++) { ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(1280, i * 64); ctx.stroke(); }
      const nodes = Array.from({ length: 54 }, (_, i) => {
        const a = i * 2.399963 + angle * (i % 2 ? 1 : -1);
        const r = 100 + Math.sqrt(i / 54) * 320;
        return { x: core.x + Math.cos(a) * r, y: core.y + Math.sin(a) * r * .72, depth: (Math.sin(a + angle) + 1) / 2 };
      });
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j], distance = Math.hypot(n.x - m.x, n.y - m.y);
          if (distance < 145) line([n, m], `rgba(174,226,152,${(1 - distance / 145) * .27})`, .75);
        }
        const breathing = .5 + .5 * Math.sin(angle * 2 + i);
        // Short luminous trails communicate information flowing through skills.
        if (i % 3 === 0) {
          const a = i * 2.399963 + angle * (i % 2 ? 1 : -1);
          const radius = 100 + Math.sqrt(i / 54) * 320;
          ctx.beginPath();
          ctx.ellipse(core.x, core.y, radius, radius * .72, 0, a - .075, a);
          ctx.strokeStyle = `rgba(153,224,191,${.12 + n.depth * .2})`;
          ctx.lineWidth = 1.4; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.3 + n.depth * 1.6, 0, tau);
        ctx.fillStyle = `rgba(191,235,160,${.25 + .6 * breathing})`; ctx.shadowColor = "#c5ed85"; ctx.shadowBlur = 7 + breathing * 8; ctx.fill(); ctx.shadowBlur = 0;
      }
      // Three paths communicate profile -> skills -> career opportunities.
      const anchors = [{ x: 610, y: 285 }, { x: 1110, y: 242 }, { x: 1080, y: 532 }];
      anchors.forEach((p, index) => {
        const mid = { x: (core.x + p.x) / 2, y: (core.y + p.y) / 2 - 25 };
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(mid.x, mid.y, core.x, core.y);
        ctx.strokeStyle = "#b9ec8855"; ctx.lineWidth = 1; ctx.stroke();
        for (let k = 0; k < 3; k++) {
          const t = (phase * 2 + index / 3 + k / 3) % 1;
          const x = (1-t)**2*p.x + 2*(1-t)*t*mid.x + t*t*core.x;
          const y = (1-t)**2*p.y + 2*(1-t)*t*mid.y + t*t*core.y;
          ctx.beginPath(); ctx.arc(x, y, 2.3, 0, tau); ctx.fillStyle = "#d6ffab"; ctx.shadowColor = "#c5ed85"; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
        }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(angle + index) * .035);
        ctx.fillStyle = "#12231ce8"; ctx.strokeStyle = "#8abd6a88"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(-36, -30, 72, 60, 11); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#c5ed85"; ctx.lineWidth = 1.6;
        if (index === 0) {
          ctx.beginPath(); ctx.arc(0, -7, 7, 0, tau); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 14, 13, Math.PI, tau); ctx.stroke();
        } else if (index === 1) {
          line([{ x: -9, y: -9 }, { x: -18, y: 0 }, { x: -9, y: 9 }], "#c5ed85", 1.8);
          line([{ x: 9, y: -9 }, { x: 18, y: 0 }, { x: 9, y: 9 }], "#c5ed85", 1.8);
          line([{ x: 4, y: -14 }, { x: -4, y: 14 }], "#c5ed85", 1.5);
        } else {
          ctx.strokeRect(-14, -7, 28, 21); ctx.strokeRect(-6, -14, 12, 7); line([{ x: -14, y: 1 }, { x: 14, y: 1 }], "#c5ed85", 1.5);
        }
        ctx.restore();
      });
      // The same forge/upward-path mark used by the product identity.
      const strength = .18 + .82 * smooth(.08, .32, phase) * (1 - smooth(.78, 1, phase));
      ctx.save(); ctx.translate(core.x, core.y); ctx.rotate(Math.sin(angle) * .025);
      ctx.strokeStyle = `rgba(197,237,133,${strength})`; ctx.lineWidth = 2.1;
      ctx.shadowBlur = 24 * strength; ctx.shadowColor = "#c5ed85";
      const scale = 12;
      ctx.beginPath(); ctx.moveTo(-8*scale, 5.5*scale); ctx.lineTo(0, -9*scale); ctx.lineTo(8*scale, 5.5*scale); ctx.lineTo(0, 1.3*scale); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 1.3*scale); ctx.lineTo(0, 9*scale); ctx.moveTo(-4*scale, -2*scale); ctx.lineTo(4*scale, -2*scale); ctx.stroke();
      ctx.shadowBlur = 0; ctx.restore();
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.translate(core.x, core.y); ctx.rotate(Math.sin(angle) * .22 + i * Math.PI / 3);
        ctx.beginPath(); ctx.ellipse(0, 0, 205 + i * 24, 108 + i * 13, 0, 0, tau); ctx.strokeStyle = `rgba(164,214,143,${.08 + i*.025})`; ctx.lineWidth = .8; ctx.stroke(); ctx.restore();
      }
      // Rotating segmented arcs, traveling sparks and an expanding forge pulse.
      ctx.save(); ctx.translate(core.x, core.y);
      for (let ring = 0; ring < 3; ring++) {
        const rotation = angle * (ring % 2 ? -1 : 1) + ring * 2.1;
        const radius = 155 + ring * 48;
        ctx.beginPath(); ctx.arc(0, 0, radius, rotation, rotation + .65);
        ctx.strokeStyle = ring === 1 ? "#8bdec277" : "#c5ed8588";
        ctx.lineWidth = ring === 0 ? 2.2 : 1.2;
        ctx.shadowColor = "#b4f293"; ctx.shadowBlur = 12; ctx.stroke();
        ctx.beginPath(); ctx.arc(Math.cos(rotation + .65) * radius, Math.sin(rotation + .65) * radius, 2.5, 0, tau);
        ctx.fillStyle = "#dcffb6"; ctx.fill();
      }
      ctx.shadowBlur = 0;
      for (let pulse = 0; pulse < 2; pulse++) {
        const progress = (phase * 2 + pulse / 2) % 1;
        const opacity = Math.sin(progress * Math.PI) * .13;
        ctx.beginPath(); ctx.ellipse(0, 0, 90 + progress * 240, 65 + progress * 175, 0, 0, tau);
        ctx.strokeStyle = `rgba(185,237,143,${opacity})`; ctx.lineWidth = 1; ctx.stroke();
      }
      // Fine radial particles rise from the forge into the opportunity network.
      for (let spark = 0; spark < 24; spark++) {
        const progress = (phase + spark / 24) % 1;
        const heading = spark * 2.399963;
        const radius = 70 + progress * 250;
        const x = Math.cos(heading) * radius, y = Math.sin(heading) * radius * .7;
        ctx.globalAlpha = Math.sin(progress * Math.PI) * .5;
        line([{ x: x * .96, y: y * .96 }, { x, y }], "#c5ed85", 1.2);
      }
      ctx.restore();
      const vignette = ctx.createRadialGradient(850, 340, 100, 850, 340, 750);
      vignette.addColorStop(0, "#07110b00"); vignette.addColorStop(1, "#07110bd0"); ctx.fillStyle = vignette; ctx.fillRect(0, 0, 1280, 720);
    }
    draw(4.8);
    const poster = canvas.toDataURL("image/webp", .88).split(",")[1];
    const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8"].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error("This browser cannot encode a WebM film");
    draw(0);
    const stream = canvas.captureStream(24);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_500_000 });
    const chunks = [];
    const recorded = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Video encoding timed out")), 60000);
      recorder.ondataavailable = e => { if(e.data.size) chunks.push(e.data); };
      recorder.onstop = () => { clearTimeout(timeout); resolve(new Blob(chunks, { type: mimeType })); };
      recorder.onerror = () => { clearTimeout(timeout); reject(new Error("Video encoding failed")); };
    });
    // Attach the rejection handler immediately, even while the frames render.
    void recorded.catch(() => {});
    recorder.start(250);
    const start = performance.now();
    await new Promise(resolve => {
      function frame() { const elapsed = (performance.now() - start) / 1000; draw(Math.min(duration, elapsed)); if (elapsed < duration) setTimeout(frame, 1000 / 24); else { recorder.stop(); resolve(); } }
      frame();
    });
    const bytes = new Uint8Array(await (await recorded).arrayBuffer());
    stream.getTracks().forEach(track => track.stop());
    let binary = ""; for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return { video: btoa(binary), poster, mimeType, seconds: duration };
  });
  const output = new URL("../public/media/", import.meta.url);
  await mkdir(output, { recursive: true });
  const video = Buffer.from(result.video, "base64");
  await writeFile(new URL("careerforge-neural-forge.webm", output), video);
  await writeFile(new URL("careerforge-neural-forge.webp", output), Buffer.from(result.poster, "base64"));
  console.log(JSON.stringify({ file: "public/media/careerforge-neural-forge.webm", bytes: video.length, codec: result.mimeType, seconds: result.seconds, dimensions: "1280x720" }));
} finally { await browser.close(); }
