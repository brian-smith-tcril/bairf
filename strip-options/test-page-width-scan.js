// Loads the test page fresh at each width and reports, for the worktree's strip, whether the lead-in
// wrapped and whether the row is wider than its container.
// usage: node scan.js <hash> <from> <to> <step>
const [hash, from, to, step] = process.argv.slice(2);
const dir = '/tmp/claude-1000/-var-home-bsmith-code-reviews/d962e317-7f0a-49e3-8cc0-d26796c95209/scratchpad/proto';
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

(async () => {
  const target = await (await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    nextId += 1; pending.set(nextId, resolve); ws.send(JSON.stringify({ id: nextId, method, params }));
  });
  await send('Page.enable');
  const bad = [];
  let loads = 0;
  for (let width = Number(from); width <= Number(to); width += Number(step)) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 400, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `file://${dir}/dist/index.html?w=${width}#${hash}` });
    await sleep(900);
    const { result } = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const label = document.getElementById('course-pathways-strip-label');
        if (!label) return null;
        const row = label.parentElement;
        const kids = [...row.children].filter((c) => !c.className.includes('invisible'));
        const used = kids.reduce((sum, c) => sum + c.getBoundingClientRect().width, 0);
        const inner = row.getBoundingClientRect().width - parseFloat(getComputedStyle(row).paddingLeft) - parseFloat(getComputedStyle(row).paddingRight);
        return {
          leadLines: Math.round(label.getBoundingClientRect().height / parseFloat(getComputedStyle(label).lineHeight)),
          visible: kids.length - 2,
          over: Math.round((row.scrollWidth - row.clientWidth) * 10) / 10,
          slack: Math.round((inner - used) * 10) / 10,
        };
      })()`,
    });
    loads += 1;
    const v = result.result.value;
    if (v && (v.leadLines > 1 || v.over > 0)) bad.push({ width, ...v });
  }
  console.log(`${loads} fresh loads from ${from} to ${to}px; ${bad.length} with a wrapped lead-in or an overflowing row`);
  bad.slice(0, 12).forEach((b) => console.log(JSON.stringify(b)));
  await send('Target.closeTarget', { targetId: target.id });
  ws.close();
})().catch((error) => { console.error(error); process.exit(1); });
