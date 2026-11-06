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
  throw new Error('Failed to connect to Chrome remote debugger');
}

async function main() {
  const port = 9339;
  const userDataDir = path.join(artifactDir, 'chrome-menu-test-v2-' + Date.now());

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1200,800',
    'about:blank'
  ]);

  try {
    const targets = await getJsonList(port);
    const pageTarget = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'DOM.enable');
    await sendCdp(ws, 'Runtime.enable');

    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173' });

    // Wait for cards
    await sendCdp(ws, 'Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        new Promise((resolve) => {
          const iv = setInterval(() => {
            const cards = document.querySelectorAll('.cinema-poster-card');
            if (cards.length > 0) {
              clearInterval(iv);
              resolve(true);
            }
          }, 100);
        })
      `
    });

    // Switch to List View
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const listBtn = document.querySelector('.view-mode-btn[aria-label="List view"]');
          if (listBtn) listBtn.click();
        })()
      `
    });

    await new Promise((r) => setTimeout(r, 600));

    // Click 3-dots trigger on first list card and wait for menu
    const clickReport = await sendCdp(ws, 'Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        new Promise((resolve) => {
          const firstCard = document.querySelector('.cinema-poster-card.card-list-view');
          if (!firstCard) return resolve({ error: 'No list card found' });
          const trigger = firstCard.querySelector('.poster-menu-trigger');
          if (!trigger) return resolve({ error: 'No trigger found' });
          trigger.click();

          let attempts = 0;
          const iv = setInterval(() => {
            attempts++;
            const menu = firstCard.querySelector('.poster-dropdown-menu');
            if (menu) {
              clearInterval(iv);
              const menuRect = menu.getBoundingClientRect();
              const cardRect = firstCard.getBoundingClientRect();
              resolve({
                title: firstCard.querySelector('.list-movie-title')?.textContent,
                hasMenu: true,
                menuRect: { top: menuRect.top, bottom: menuRect.bottom, left: menuRect.left, right: menuRect.right, height: menuRect.height },
                cardRect: { top: cardRect.top, bottom: cardRect.bottom, height: cardRect.height },
                menuItems: Array.from(menu.querySelectorAll('.dropdown-menu-item span')).map(s => s.textContent)
              });
            } else if (attempts > 30) {
              clearInterval(iv);
              resolve({ error: 'Timeout waiting for menu' });
            }
          }, 50);
        })
      `
    });
    console.log('Click report:', JSON.stringify(clickReport.result.value, null, 2));

    await new Promise((r) => setTimeout(r, 400));

    // Capture screenshot
    const { data } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(artifactDir, 'list-view-open-menu-desktop.png');
    fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
    console.log('Saved screenshot to:', outPath);
  } finally {
    try {
      chromeProc.kill();
    } catch {}
  }
}

main().catch(console.error);
