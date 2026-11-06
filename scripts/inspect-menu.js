const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\pc\\.gemini\\antigravity\\brain\\52754e2b-8ff1-43df-b413-c52c9baea817';

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function getJsonList(port) {
  for (let i = 0; i < 20; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
      });
      if (data && data.length > 0) return data;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
}

async function run() {
  const port = 9342;
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(artifactDir, 'chrome-inspect-run')}`,
    '--window-size=1280,900',
    'about:blank'
  ]);

  try {
    const targets = await getJsonList(port);
    const pageTarget = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'DOM.enable');
    await sendCdp(ws, 'Runtime.enable');
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173' });

    await sendCdp(ws, 'Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        new Promise((resolve) => {
          const iv = setInterval(() => {
            if (document.querySelectorAll('.cinema-poster-card').length > 0) {
              clearInterval(iv);
              resolve(true);
            }
          }, 100);
        })
      `
    });

    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `document.querySelector('.view-mode-btn[aria-label="List view"]')?.click()`
    });
    await new Promise((r) => setTimeout(r, 600));

    const debugResult = await sendCdp(ws, 'Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        new Promise((resolve) => {
          const card = document.querySelector('.cinema-poster-card.card-list-view');
          const trigger = card?.querySelector('.poster-menu-trigger');
          trigger?.click();
          setTimeout(() => {
            const menu = card?.querySelector('.poster-dropdown-menu');
            if (!menu) return resolve({ error: 'No menu found' });
            const beforeContain = window.getComputedStyle(card).contain;
            const beforeContentVis = window.getComputedStyle(card).contentVisibility;

            // Remove containment & test
            card.style.contentVisibility = 'visible';
            card.style.contain = 'none';

            const afterContain = window.getComputedStyle(card).contain;
            const afterContentVis = window.getComputedStyle(card).contentVisibility;

            const elAtItem2 = document.elementFromPoint(1060, 630);

            resolve({
              beforeContain,
              beforeContentVis,
              afterContain,
              afterContentVis,
              elAtItem2: { tag: elAtItem2?.tagName, class: elAtItem2?.className, text: elAtItem2?.innerText }
            });
          }, 300);
        })
      `
    });

    console.log('DEBUG RESULT:');
    console.log(JSON.stringify(debugResult, null, 2));

    const { data } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, 'inspect-open-menu.png'), Buffer.from(data, 'base64'));
  } finally {
    try {
      chromeProc.kill();
    } catch {}
  }
}

run().catch(console.error);
