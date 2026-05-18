// Tool Registry — júisimdi instrumentalar
const tools = new Map();

export function registerTool(def) {
  tools.set(def.name, def);
}

export function getTool(name) {
  return tools.get(name);
}

export function getAllTools() {
  return [...tools.values()];
}

// OpenAI tools format for API
export function getToolsForAPI() {
  return [...tools.values()].map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }
  }));
}

// Búkil tik qurúlǵan instrumentalardy tirký
export function registerAllTools() {
  // Shell
  registerTool({
    name: 'shell_exec',
    description: 'Bash komandasy ornatady. Natyje stdout/stderr qaitarady. Jumys isteytin instrumental: build, test, npm, pip, git, h.t.b.',
    dangerous: true,
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Ornatylatyn bash komandasy (mysal: npm test, ls -la, python main.py)' },
        cwd: { type: 'string', description: 'Jumys katalogy (opsional, default — agymdaǵy katalog)' }
      },
      required: ['command']
    },
    handler: async (args) => {
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        const opts = { encoding: 'utf-8', timeout: 30000, maxBuffer: 1024 * 1024 };
        if (args.cwd) opts.cwd = args.cwd;
        exec(args.command, opts, (err, stdout, stderr) => {
          if (err) {
            resolve(JSON.stringify({ error: err.message, stdout: stdout || '', stderr: stderr || '', exitCode: err.code || 1 }));
          } else {
            resolve(JSON.stringify({ stdout: stdout || '', stderr: stderr || '', exitCode: 0 }));
          }
        });
      });
    }
  });

  // File read
  registerTool({
    name: 'file_read',
    description: 'Fayldy oqydy. Kod fayllary, konfig fayllary, log fayllaryn oqý ushyn.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Fayl joly (mysal: src/index.js)' },
        lines: { type: 'number', description: 'Neshe jol oqy (opsional, default — barlyǵy)' }
      },
      required: ['path']
    },
    handler: async (args) => {
      const fs = await import('fs');
      try {
        let content = fs.readFileSync(args.path, 'utf-8');
        if (args.lines) {
          content = content.split('\n').slice(0, args.lines).join('\n');
        }
        return content;
      } catch (e) {
        return `Qate: ${e.message}`;
      }
    }
  });

  // File write
  registerTool({
    name: 'file_write',
    description: 'Faylǵa jazady. Kod jazý, konfig ózgertý ushyn.',
    dangerous: true,
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Fayl joly' },
        content: { type: 'string', description: 'Jazylynatyn mazmun' },
        append: { type: 'boolean', description: 'Qosý rejimi (true — sońyna qosý, false — aýystyryp jazý)' }
      },
      required: ['path', 'content']
    },
    handler: async (args) => {
      const fs = await import('fs');
      const path = await import('path');
      try {
        const dir = path.dirname(args.path);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (args.append) {
          fs.appendFileSync(args.path, args.content);
        } else {
          fs.writeFileSync(args.path, args.content);
        }
        return `OK: ${args.path} jazyldy`;
      } catch (e) {
        return `Qate: ${e.message}`;
      }
    }
  });

  // File list
  registerTool({
    name: 'file_list',
    description: 'Papkadaghy fayldardy tizimdeydi. Proekt qurylasyn kórý ushyn.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Papka joly (opsional, default — agymdaǵy katalog)' },
        pattern: { type: 'string', description: 'Filtr pattern (mysal: *.js, **/*.ts)' }
      }
    },
    handler: async (args) => {
      const fs = await import('fs');
      const dirPath = args.path || '.';
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        const result = entries
          .filter(e => !e.name.startsWith('.'))
          .map(e => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`)
          .join('\n');
        return result || 'Bos papka';
      } catch (e) {
        return `Qate: ${e.message}`;
      }
    }
  });

  // File search (grep)
  registerTool({
    name: 'file_search',
    description: 'Fayldarda izdeý. Proekt ishinde kod, funksiya, sóz izdeý ushyn.',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Izdeý patterny (regex)' },
        path: { type: 'string', description: 'Izdeý katalogy (opsional)' },
        filePattern: { type: 'string', description: 'Fayl filtr (mysal: *.js, *.py)' }
      },
      required: ['pattern']
    },
    handler: async (args) => {
      const { exec } = await import('child_process');
      const cmd = `grep -rn "${args.pattern}" ${args.path || '.'} --include="${args.filePattern || '*'}" 2>/dev/null | head -50`;
      return new Promise((resolve) => {
        exec(cmd, { encoding: 'utf-8', timeout: 10000 }, (err, stdout) => {
          resolve(stdout || 'Tabylmady');
        });
      });
    }
  });

  // Git
  registerTool({
    name: 'git_exec',
    description: 'Git komandalaryn ornatady. Kommit, diff, log, branch, push, pull.',
    dangerous: true,
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Git komandasy (mysal: status, diff, log, add ., commit -m "msg", push)' }
      },
      required: ['command']
    },
    handler: async (args) => {
      const { exec } = await import('child_process');
      const allowed = ['status', 'diff', 'log', 'show', 'branch', 'stash', 'remote', 'add', 'commit', 'push', 'pull', 'checkout', 'merge', 'fetch', 'reset'];
      const firstWord = args.command.trim().split(/\s+/)[0];
      if (!allowed.includes(firstWord)) {
        return `Qate: "${firstWord}" rúqsat etilmegen git komandasy`;
      }
      return new Promise((resolve) => {
        exec(`git ${args.command}`, { encoding: 'utf-8', timeout: 30000 }, (err, stdout, stderr) => {
          if (err) resolve(`Qate: ${stderr || err.message}`);
          else resolve(stdout || 'OK');
        });
      });
    }
  });

  // Web fetch
  registerTool({
    name: 'web_fetch',
    description: 'URL-den aqparat alady. Sahany oqydy, HTML-dy textke ainaldyrady.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL (https://...)' }
      },
      required: ['url']
    },
    handler: async (args) => {
      const https = await import('https');
      const http = await import('http');
      return new Promise((resolve) => {
        const mod = args.url.startsWith('https') ? https : http;
        const req = mod.get(args.url, { timeout: 15000 }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const mod2 = res.headers.location.startsWith('https') ? https : http;
            mod2.get(res.headers.location, { timeout: 15000 }, (res2) => {
              let body = '';
              res2.on('data', c => { body += c; if (body.length > 30000) { res2.destroy(); resolve(stripHtml(body).slice(0, 8000)); } });
              res2.on('end', () => resolve(stripHtml(body).slice(0, 8000)));
            }).on('error', e => resolve(`Qate: ${e.message}`));
            return;
          }
          let body = '';
          res.on('data', c => { body += c; if (body.length > 30000) { res.destroy(); resolve(stripHtml(body).slice(0, 8000)); } });
          res.on('end', () => resolve(stripHtml(body).slice(0, 8000)));
        });
        req.on('error', e => resolve(`Qate: ${e.message}`));
        req.on('timeout', () => { req.destroy(); resolve('Qate: Timeout (15s)'); });
      });
    }
  });

  // Web search (via DuckDuckGo HTML)
  registerTool({
    name: 'web_search',
    description: 'Internette izdeý jasaymyn. Natijelerdi tabamyn — URL menen birge.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Izdeý sózi' }
      },
      required: ['query']
    },
    handler: async (args) => {
      const https = await import('https');
      const encoded = encodeURIComponent(args.query);
      const url = `https://html.duckduckgo.com/html/?q=${encoded}`;
      return new Promise((resolve) => {
        https.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          }
        }, (res) => {
          let body = '';
          res.on('data', c => { body += c; if (body.length > 80000) res.destroy(); });
          res.on('end', () => resolve(parseDuckResults(body)));
        }).on('error', e => resolve(`Qate: ${e.message}`));
      });
    }
  });

  // Download file
  registerTool({
    name: 'download',
    description: 'Fayldy júktep alady. URL-den fayldy saqtaidy.',
    dangerous: true,
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Fayl URL-i' },
        path: { type: 'string', description: 'Saqtalatyn jol' }
      },
      required: ['url', 'path']
    },
    handler: async (args) => {
      const fs = await import('fs');
      const https = await import('https');
      const http = await import('http');
      return new Promise((resolve) => {
        const mod = args.url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(args.path);
        mod.get(args.url, { timeout: 30000 }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const mod2 = res.headers.location.startsWith('https') ? https : http;
            mod2.get(res.headers.location, (res2) => {
              res2.pipe(file);
              file.on('finish', () => { file.close(); resolve(`OK: ${args.path} júktelindi`); });
            }).on('error', e => resolve(`Qate: ${e.message}`));
            return;
          }
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(`OK: ${args.path} júktelindi`); });
        }).on('error', e => resolve(`Qate: ${e.message}`));
      });
    }
  });

  // Install package
  registerTool({
    name: 'install_package',
    description: 'Paketti ornatady. npm, pip, apt, brew awtoanyqtaidy.',
    dangerous: true,
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Paket aty' },
        manager: { type: 'string', description: 'Paket menedjeri (npm, pip, apt, brew). Opsional — awtoanyqtau.', enum: ['npm', 'pip', 'apt', 'brew'] }
      },
      required: ['name']
    },
    handler: async (args) => {
      const { exec } = await import('child_process');
      const fs = await import('fs');
      let mgr = args.manager;
      if (!mgr) {
        if (fs.existsSync('package.json')) mgr = 'npm';
        else if (fs.existsSync('requirements.txt') || fs.existsSync('setup.py')) mgr = 'pip';
        else mgr = 'npm';
      }
      const cmds = {
        npm: `npm install ${args.name}`,
        pip: `pip install ${args.name}`,
        apt: `sudo apt install -y ${args.name}`,
        brew: `brew install ${args.name}`,
      };
      return new Promise((resolve) => {
        exec(cmds[mgr], { encoding: 'utf-8', timeout: 120000 }, (err, stdout, stderr) => {
          if (err) resolve(`Qate: ${stderr || err.message}`);
          else resolve(stdout || 'OK ornatyldy');
        });
      });
    }
  });
}

// HTML-dy textke ainaldyrý
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// DuckDuckGo natijelerin parsylau
function parseDuckResults(html) {
  const results = [];

  // Method 1: result__a links with uddg parameter (redirect URLs)
  const regex1 = /<a[^>]+class="result__a"[^>]*href="[^"]*uddg=([^&"]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex1.exec(html)) && results.length < 8) {
    const url = decodeURIComponent(match[1]);
    const title = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (title && url && title.length > 3) {
      results.push({ title, url });
    }
  }

  // Method 2: result__snippet with link
  if (results.length < 3) {
    const regex2 = /<a[^>]+href="[^"]*uddg=([^&"]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = regex2.exec(html)) && results.length < 8) {
      const url = decodeURIComponent(match[1]);
      const title = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (title && url && title.length > 3) {
        if (!results.find(r => r.url === url)) {
          results.push({ title, url });
        }
      }
    }
  }

  if (results.length === 0) return 'Natije tabylmady';

  return results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`).join('\n\n');
}
