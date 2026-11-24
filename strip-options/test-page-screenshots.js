// Drives the headless Chrome started with --remote-debugging-port=9333.
// usage: node cdp.js <out.png> <hash> <width> <height> [scale] [action ...]
// actions, run in order after the page settles:
//   hover:<selector>   move the pointer to the element's centre
//   click:<selector>   click the element's centre
//   resize:<width>    change the viewport width after load, as a window resize would
//   tab:<n>            press Tab n times
//   focus:<selector>   give the element keyboard focus
//   clip:<selector>    screenshot only this element (plus padding) instead of the viewport
//   info:<selector>    print the element's bounding box and a few computed styles
const fs = require('fs');

const [out, hash, width, height, scale = '1', ...actions] = process.argv.slice(2);
const dir = '/tmp/claude-1000/-var-home-bsmith-code-reviews/d962e317-7f0a-49e3-8cc0-d26796c95209/scratchpad/proto';
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

(async () => {
  const target = await (await fetch(`http://127.0.0.1:9333/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    nextId += 1;
    pending.set(nextId, resolve);
    ws.send(JSON.stringify({ id: nextId, method, params }));
  });
  const evaluate = async (expression) => {
    const { result } = await send('Runtime.evaluate', { expression, returnByValue: true });
    return result.result.value;
  };
  const boxOf = (selector) => evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, scrollY: window.scrollY };
  })()`);

  await send('Emulation.setDeviceMetricsOverride', {
    width: Number(width), height: Number(height), deviceScaleFactor: Number(scale), mobile: false,
  });
  await send('Page.enable');
  await send('Page.navigate', { url: `file://${dir}/dist/index.html#${hash}` });
  await sleep(2500);

  let clip;
  for (const action of actions) {
    const [kind, ...rest] = action.split(':');
    const arg = rest.join(':');
    if (kind === 'resize') {
      await send('Emulation.setDeviceMetricsOverride', {
        width: Number(arg), height: Number(height), deviceScaleFactor: Number(scale), mobile: false,
      });
      await sleep(600);
    } else if (kind === 'tab') {
      for (let i = 0; i < Number(arg); i += 1) {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      }
    } else {
      const box = await boxOf(arg);
      if (!box) {
        console.log(`no element for ${arg}`);
      } else if (kind === 'hover' || kind === 'click') {
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        if (kind === 'click') {
          await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
          await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        }
      } else if (kind === 'focus') {
        // A Tab press first, so the browser treats the focus as keyboard focus
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        await evaluate(`document.querySelector(${JSON.stringify(arg)}).focus()`);
      } else if (kind === 'clip') {
        const pad = 12;
        clip = {
          x: Math.max(box.x - pad, 0), y: Math.max(box.y + box.scrollY - pad, 0), width: box.width + 2 * pad, height: box.height + 2 * pad, scale: 1,
        };
      } else if (kind === 'info') {
        const styles = await evaluate(`(() => {
          const s = getComputedStyle(document.querySelector(${JSON.stringify(arg)}));
          return { color: s.color, background: s.backgroundColor, borderLeft: s.borderLeft, fontSize: s.fontSize, lineHeight: s.lineHeight, padding: s.padding };
        })()`);
        console.log(arg, JSON.stringify({ ...box, ...styles }));
      }
    }
    await sleep(350);
  }
  const overflow = await evaluate('document.documentElement.scrollWidth - window.innerWidth');
  if (overflow > 0) {
    console.log(`page is ${overflow}px wider than the ${width}px viewport`);
  }
  const { result } = await send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: Boolean(clip), ...(clip ? { clip } : {}),
  });
  fs.writeFileSync(`${dir}/shots/${out}`, Buffer.from(result.data, 'base64'));
  await send('Target.closeTarget', { targetId: target.id });
  ws.close();
  console.log(`wrote shots/${out}`);
})().catch((error) => { console.error(error); process.exit(1); });
