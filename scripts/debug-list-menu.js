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
  const port = 9337;
  const userDataDir = path.join(artifactDir, 'chrome-list-debug-v2-' + Date.now());

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

    // Find Desi Boyz card and click its 3-dots trigger
    const menuResult = await sendCdp(ws, 'Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const cards = Array.from(document.querySelectorAll('.cinema-poster-card.card-list-view'));
          const desiCard = cards.find(c => c.textContent.includes('Desi Boyz')) || cards[1] || cards[0];
          if (!desiCard) return { error: 'No card found' };

          const trigger = desiCard.querySelector('.poster-menu-trigger');
          if (trigger) trigger.click();

          const cardRect = desiCard.getBoundingClientRect();
          const cardComputed = window.getComputedStyle(desiCard);
          const menu = desiCard.querySelector('.poster-dropdown-menu');
          const menuRect = menu ? menu.getBoundingClientRect() : null;

          return {
            title: desiCard.querySelector('.list-movie-title')?.textContent,
            cardRect: { top: cardRect.top, bottom: cardRect.bottom, height: cardRect.height, overflow: cardComputed.overflow },
            menuRect: menuRect ? { top: menuRect.top, bottom: menuRect.bottom, height: menuRect.height } : null,
            menuItemsCount: menu ? menu.querySelectorAll('.dropdown-menu-item').length : 0,
            menuVisibleItems: menu ? Array.from(menu.querySelectorAll('.dropdown-menu-item span')).map(s => s.textContent) : []
          };
        })()
      `
    });
    console.log('List Menu Verification Diagnostics:', JSON.stringify(menuResult.result.value, null, 2));

    await new Promise((r) => setTimeout(r, 300));

    // Capture screenshot
    const { data } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(artifactDir, 'verified-list-view-menu.png');
    fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
    console.log('Saved screenshot to:', outPath);

    // Also test on Mobile List View (390px)
    await sendCdp(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 400));
    const { data: mobileData } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    const mobileOutPath = path.join(artifactDir, 'verified-mobile-list-view-menu.png');
    fs.writeFileSync(mobileOutPath, Buffer.from(mobileData, 'base64'));
    console.log('Saved mobile list screenshot to:', mobileOutPath);
  } finally {
    try {
      chromeProc.kill();
    } catch {}
  }
}

main().catch(console.error);
