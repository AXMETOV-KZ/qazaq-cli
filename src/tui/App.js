import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp, useStdin } from 'ink';
import { handleSlashCommand, getSystemPrompt, isCompactMode } from './commands.js';
import { MarkdownText } from './markdown.js';
import { Agent } from '../agent/index.js';
import { registerAllTools } from '../agent/tools.js';
import { saveConfig, loadConfig } from '../utils/config.js';
import { PROVIDERS } from '../providers/registry.js';

const CYAN = '#00ABC2';
const YELLOW = '#FFEC2D';
const GRAY = '#888888';
const GREEN = '#50FA7B';
const RED = '#FF5555';

function friendlyError(error) {
	const msg = String(error?.message || error || '');
	const status = error?.status || error?.response?.status;
	if (status === 401 || /unauthorized|invalid api key|incorrect api key/i.test(msg))
		return ' API kilt qate nemese joq. /provider arqyly kilt engiziniz.';
	if (status === 429 || /rate limit|quota|too many requests/i.test(msg))
		return ' Suranystar limiti toldy. Biraz kúte turyp qaytalańyz.';
	if (status === 404 || /model.*not found|does not exist|no such model/i.test(msg))
		return ' Tańdalǵan model tabylmady. /model arqyly basqa model tańdańyz.';
	if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|fetch failed|network|getaddrinfo/i.test(msg))
		return ' Internet baylanysy joq nemese server jauap bermedi. Baylanysty tekseriniz.';
	if (status >= 500 || /internal server error|bad gateway|service unavailable/i.test(msg))
		return ' Provaider serverinde qate. Birazdan keyin qaytalańyz.';
	return ` Qate: ${msg}`;
}

registerAllTools();

const SLASH_COMMANDS = [
  { cmd: '/komek', desc: 'Komandalar tizimi' },
  { cmd: '/tazala', desc: 'Sessiyani tazalau' },
  { cmd: '/qysqa', desc: 'Qysqasha rejim' },
  { cmd: '/tez', desc: 'Jyldam rejim' },
  { cmd: '/baptau', desc: 'Baptaulardy kórsetu' },
  { cmd: '/provider', desc: 'Provaider tańdau (menú)' },
  { cmd: '/model', desc: 'Model tańdau (menú)' },
  { cmd: '/qosu', desc: 'Jumys katalogyn qosu' },
  { cmd: '/agentter', desc: 'Agent basqaru' },
  { cmd: '/butaq', desc: 'Dialogty butaqttau' },
  { cmd: '/aralau', desc: 'Qosymsha suraq' },
  { cmd: '/serik', desc: 'Serikti iske qosu' },
  { cmd: '/keshteu', desc: 'Keshti tekseru' },
  { cmd: '/sakta', desc: 'Git-kommit' },
  { cmd: '/tekser', desc: 'PR tekseru' },
  { cmd: '/jenildet', desc: 'Kodty enildetu' },
  { cmd: '/qayta', desc: 'Sónǵy suraqty qaitalau' },
  { cmd: '/agent', desc: 'Agent rejimi — aspaptar men jumys' },
];

const letters = {
  Q: [' ██████ ', '██    ██', '██    ██', '██ ▄▄ ██', ' ██████ ', '    ▀▀  '],
  A: [' █████  ', '██   ██ ', '███████ ', '██   ██ ', '██   ██ ', '        '],
  Z: ['███████ ', '   ██   ', '  ██    ', ' ██     ', '███████ ', '        ']
};

const Letter = ({ lines, color, name }) =>
  React.createElement(Box, { flexDirection: 'column', marginRight: 0 },
    lines.map((line, i) =>
      React.createElement(Text, { key: `${name}-${i}`, color, bold: true }, line)
    )
  );

const QAZAQArt = () =>
  React.createElement(Box, { flexDirection: 'row', marginBottom: 1 },
    React.createElement(Letter, { key: 'q1', name: 'q1', lines: letters.Q, color: CYAN }),
    React.createElement(Letter, { key: 'a1', name: 'a1', lines: letters.A, color: CYAN }),
    React.createElement(Letter, { key: 'z1', name: 'z1', lines: letters.Z, color: YELLOW }),
    React.createElement(Letter, { key: 'a2', name: 'a2', lines: letters.A, color: CYAN }),
    React.createElement(Letter, { key: 'q2', name: 'q2', lines: letters.Q, color: CYAN })
  );

export default function App() {
  const { exit } = useApp();
  const { isRawModeSupported, stdin } = useStdin();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [menuIndex, setMenuIndex] = useState(0);
  const [pastes, setPastes] = useState([]);
  const [cursorOn, setCursorOn] = useState(true);
  const [picker, setPicker] = useState(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [connect, setConnect] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setCursorOn(v => !v), 500);
    return () => clearInterval(t);
  }, []);

  // Paste detection refs
  const pasteBuffer = useRef('');
  const pasteTimer = useRef(null);
  const isPasting = useRef(false);
  const pasteCounter = useRef(0);

  const showMenu = input.startsWith('/') && !input.includes(' ');
  const filteredCmds = showMenu
    ? SLASH_COMMANDS.filter(c => c.cmd.startsWith(input.toLowerCase()))
    : [];

  const [provider, setProvider] = useState(null);

  async function refreshProvider() {
    try {
      const { getClient } = await import('../providers/index.js');
      const { info } = getClient();
      setProvider(info);
    } catch (e) {
      setProvider({ name: 'modelindi tandawiw…', defaultModel: '', error: true });
    }
  }

  useEffect(() => {
    (async () => {
      await refreshProvider();
      const { getActiveProviderId } = await import('../providers/index.js');
      const id = getActiveProviderId();
      const preset = PROVIDERS[id] || {};
      const cfg = loadConfig();
      const hasKey =
        cfg[`${id}.apiKey`] ||
        (preset.envKey && process.env[preset.envKey]) ||
        preset.keyOptional;
      if (!hasKey) openConnectForm(id);
    })();
  }, []);

  function openConnectForm(providerId) {
    const preset = PROVIDERS[providerId] || {};
    const cfg = loadConfig();
    saveConfig({ provider: providerId });
    setConnect({
      provider: providerId,
      name: preset.name || providerId,
      baseURL: cfg[`${providerId}.baseURL`] || preset.baseURL || '',
      apiKey: cfg[`${providerId}.apiKey`] || '',
      focus: 'apiKey',
      keyOptional: !!preset.keyOptional,
    });
  }

  function applyPickerSelection(pk, value) {
    if (pk.type === 'provider') {
      setPicker(null);
      openConnectForm(value);
      return;
    }
    if (pk.type === 'model') {
      saveConfig({ [`${pk.provider}.model`]: value });
      refreshProvider();
    }
  }

  async function confirmConnect() {
    const c = connect;
    if (!c) return;
    const updates = { provider: c.provider };
    if (c.baseURL) updates[`${c.provider}.baseURL`] = c.baseURL;
    if (c.apiKey) updates[`${c.provider}.apiKey`] = c.apiKey;
    saveConfig(updates);
    setConnect(null);
    setMessages(prev => [...prev, { role: 'system', content: ` ${c.name} qosyldy. Modelder júktelude...` }]);
    await refreshProvider();
    await openModelPicker(c.provider);
  }

  async function openModelPicker(providerId) {
    const { fetchModels, getActiveProviderId } = await import('../providers/index.js');
    const id = providerId || getActiveProviderId();
    const cfg = loadConfig();
    const activeModel = cfg[`${id}.model`] || '';
    setPicker({
      type: 'model', provider: id,
      title: ` Model júktelude (${id})...`,
      items: [{ label: ' ⏳ kúte turyńyz...', value: '__loading__' }],
      index: 0, loading: true,
    });
    let models = [];
    try { models = await fetchModels(id); } catch { models = []; }
    if (!models.length) {
      setMessages(prev => [...prev, { role: 'system', content: ` Modelder tabylmady. /baptau ${id}.model=... arqyly qosyńyz.` }]);
      setPicker(null);
      return;
    }
    const items = models.map(m => ({ label: `${m}${m === activeModel ? '  ✓' : ''}`, value: m }));
    setPicker({ type: 'model', provider: id, title: ` Model tańda (${id}):`, items, index: 0 });
    setPickerQuery('');
  }

  // === RAW STDIN PASTE INTERCEPTION ===
  useEffect(() => {
    if (!stdin) return;

    const onData = (data) => {
      const str = data.toString();

      // Skip single chars — let useInput handle them
      if (str.length <= 1) return;

      // Стрелки / навигация / F-клавиши приходят многобайтовым куском,
      // начинающимся с ESC. Это НЕ вставка — пусть useInput сам разбирает.
      const isBracketedPaste = str.includes('\x1b[200~');
      if (!isBracketedPaste && str.charCodeAt(0) === 0x1b) return;

      // Multi-char = paste operation
      isPasting.current = true;
      pasteBuffer.current += str;

      // Reset flush timer
      if (pasteTimer.current) clearTimeout(pasteTimer.current);
      pasteTimer.current = setTimeout(flushPaste, 150);
    };

    stdin.on('data', onData);
    return () => {
      stdin.removeListener('data', onData);
      if (pasteTimer.current) clearTimeout(pasteTimer.current);
    };
  }, [stdin]);

  const flushPaste = () => {
    const buf = pasteBuffer.current;
    pasteBuffer.current = '';
    isPasting.current = false;
    if (pasteTimer.current) {
      clearTimeout(pasteTimer.current);
      pasteTimer.current = null;
    }
    if (!buf) return;

    // Clean control chars (bracketed paste markers, etc.)
    const clean = buf
      .replace(/\x1b\[200~/g, '')
      .replace(/\x1b\[201~/g, '')
      .replace(/\x1b\[[0-9;]*[A-Za-z~]/g, '') // CSI-последовательности (стрелки и т.п.)
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

    if (!clean) return;

    const lineCount = clean.split('\n').length;
    const isMultiline = lineCount > 1;
    const isLong = clean.length > 200;

    if (isMultiline || isLong) {
      pasteCounter.current += 1;
      const info = isMultiline
        ? `+${lineCount} lines`
        : `${clean.length} chars`;
      const tag = `[Pasted text #${pasteCounter.current} ${info}]`;
      setPastes(prev => [...prev, { id: pasteCounter.current, text: clean }]);
      setInput(prev => prev + tag);
      setCursorPos(prev => prev + tag.length);
    } else {
      setInput(prev => prev + clean);
      setCursorPos(prev => prev + clean.length);
    }
  };

  // === KEYBOARD INPUT (useInput) ===
  useInput((inputChar, key) => {
    if (isLoading) return;

    // Skip if currently pasting
    if (isPasting.current) return;

    // Connect form (token + baseURL)
    if (connect) {
      if (key.escape) { setConnect(null); return; }
      if (key.tab) {
        setConnect(c => ({ ...c, focus: c.focus === 'apiKey' ? 'baseURL' : 'apiKey' }));
        return;
      }
      if (key.return) { confirmConnect(); return; }
      if (key.backspace || key.delete) {
        setConnect(c => ({ ...c, [c.focus]: String(c[c.focus] || '').slice(0, -1) }));
        return;
      }
      if (key.ctrl || key.meta) return;
      if (inputChar && !/[\x00-\x1f\x7f]/.test(inputChar)) {
        setConnect(c => ({ ...c, [c.focus]: String(c[c.focus] || '') + inputChar }));
      }
      return;
    }

    // Picker mode (provider/model)
    if (picker) {
      const pickerItems = picker?.items || [];
      const filteredItems = pickerQuery
        ? pickerItems.filter(it =>
          (it.label || it.value || '').toLowerCase().includes(pickerQuery.toLowerCase()))
        : pickerItems;

      if (key.escape) { setPicker(null); setPickerQuery(''); return; }

      if (key.upArrow) { setPicker(p => ({ ...p, index: Math.max(0, (p.index ?? 0) - 1) })); return; }
      if (key.downArrow) { setPicker(p => ({ ...p, index: Math.min(filteredItems.length - 1, (p.index ?? 0) + 1) })); return; }

      if (key.return) {
        const item = filteredItems[picker.index ?? 0];
        if (item && item.value !== '__loading__') applyPickerSelection(picker, item.value);
        setPicker(null);
        setPickerQuery('');
        return;
      }

      if (key.backspace || key.delete) {
        setPickerQuery(q => q.slice(0, -1));
        setPicker(p => ({ ...p, index: 0 }));
        return;
      }
      if (inputChar && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(inputChar)) {
        setPickerQuery(q => q + inputChar);
        setPicker(p => ({ ...p, index: 0 }));
        return;
      }
      return;
    }

    // Menu navigation
    if (showMenu && filteredCmds.length > 0) {
      if (key.upArrow) {
        setMenuIndex(prev => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setMenuIndex(prev => Math.min(filteredCmds.length - 1, prev + 1));
        return;
      }
      if (key.return || key.tab) {
        const selected = filteredCmds[menuIndex] || filteredCmds[0];
        if (selected) {
          setInput(selected.cmd + ' ');
          setCursorPos(selected.cmd.length + 1);
          setMenuIndex(0);
        }
        return;
      }
    }

    // Enter
    if (key.return) {
      if (input.trim()) {
        sendMessage(input.trim());
        setInput('');
        setCursorPos(0);
        setMenuIndex(0);
        setPastes([]);
      }
      return;
    }

    // Backspace
    if (key.backspace || key.delete) {
      if (cursorPos > 0) {
        setInput(prev => prev.slice(0, cursorPos - 1) + prev.slice(cursorPos));
        setCursorPos(prev => prev - 1);
        setMenuIndex(0);
      }
      return;
    }

    // Arrows (outside menu — move cursor or ignore)
    if (key.upArrow || key.downArrow) return;
    if (key.leftArrow) {
      setCursorPos(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.rightArrow) {
      setCursorPos(prev => Math.min(input.length, prev + 1));
      return;
    }

    // Exit
    if (key.escape || (key.ctrl && inputChar === 'c')) {
      exit();
      return;
    }

    // Skip Ctrl/meta combos
    if (key.ctrl || key.meta) return;

    // Normal printable char (filter control sequences like ESC[B from arrow keys)
    if (inputChar && !/[\x00-\x1f\x7f]/.test(inputChar)) {
      setInput(prev => prev.slice(0, cursorPos) + inputChar + prev.slice(cursorPos));
      setCursorPos(prev => prev + 1);
      setMenuIndex(0);
    }
  });

  async function sendMessage(text) {
    // Expand paste tags to full text
    if (pastes.length > 0) {
      for (const p of pastes) {
        text = text.replace(`[Pasted text #${p.id}`, p.text);
      }
    }

    // Slash commands
    if (text.startsWith('/')) {
      const result = await handleSlashCommand(text, {
        messages,
        clearMessages: () => setMessages([]),
      });

      if (result.handled) {
        if (result.picker) {
          setPicker({ ...result.picker, index: 0 });
          setPickerQuery('');
        } else if (result.openModelPicker) {
          await openModelPicker();
        } else if (result.message) {
          setMessages(prev => [...prev, { role: 'system', content: result.message }]);
        }
        await refreshProvider();
        return;
      }
      if (result.rewritten) {
        text = result.rewritten;
      }
    }

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const { getClient } = await import('../providers/index.js');
      const { client, info } = getClient();
      setProvider(info);

      const agent = new Agent({
        client,
        model: info.defaultModel,
        onToolStart: () => {},
        onToolEnd: () => {},
        onToken: (t) => {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && last.streaming) {
              const updated = prev.slice();
              updated[updated.length - 1] = { ...last, content: last.content + t };
              return updated;
            }
            return [...prev, { role: 'assistant', content: t, streaming: true }];
          });
        },
        maxIterations: 15,
      });

      const cleanHistory = messages.filter(m =>
        m.role === 'user' || m.role === 'assistant' || m.role === 'system'
      );

      const { answer } = await agent.run(text, cleanHistory);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && last.streaming) {
          const updated = prev.slice();
          updated[updated.length - 1] = { role: 'assistant', content: answer };
          return updated;
        }
        return [...prev, { role: 'assistant', content: answer }];
      });
    } catch (error) {
      setMessages(prev => [...prev, { role: 'error', content: friendlyError(error) }]);
    }

    setIsLoading(false);
  }

  if (!isRawModeSupported) {
    return React.createElement(Box, { flexDirection: 'column', padding: 1 },
      React.createElement(Text, { color: 'red' }, '❌ TUI tek interaktivtі termіnalda jumys isteydi'),
      React.createElement(Text, { dimColor: true }, '\nQoldanyńyz: qazaq ask "suraǵyńyz"')
    );
  }

  // Truncate display helper
  const displayInput = input.length > 120 ? input.slice(0, 120) + '...' : input;
  const displayMsg = (msg) => msg.length > 150 ? msg.slice(0, 150) + '...' : msg;

  return React.createElement(Box, { flexDirection: 'column', height: '100%' },

    // Header
    React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingTop: 1 },
      React.createElement(QAZAQArt, null),
      React.createElement(Box, { marginTop: 0, marginBottom: 0 },
        React.createElement(Text, { dimColor: true }, '  Build by KazakBot')
      ),
      React.createElement(Box, { marginTop: 0 },
        provider && provider.error
          ? React.createElement(Text, { color: YELLOW, bold: true }, provider.name)
          : React.createElement(Text, { dimColor: true },
            provider
              ? `[${provider.name}] ${provider.defaultModel}${isCompactMode() ? ' [qysqa]' : ''}`
              : 'Júktelude...'
          )
      ),
      React.createElement(Box, { marginTop: 0 },
        React.createElement(Text, { dimColor: true }, 'ESC — shygu | Enter — tańdau | / — pärmender')
      )
    ),

    // Divider
    React.createElement(Box, { borderStyle: 'single', borderBottom: true, borderTop: false, borderLeft: false, borderRight: false, borderColor: GRAY }),

    // Messages
    React.createElement(Box, { flexDirection: 'column', paddingX: 1, flexGrow: 1 },
      messages.length === 0
        ? React.createElement(Text, { color: YELLOW }, '\n  Terip jaz\n')
        : messages.map((msg, i) =>
          React.createElement(Box, { key: i, flexDirection: 'column', marginBottom: 0 },
            msg.role === 'user'
              ? React.createElement(Text, { color: CYAN, bold: true }, `  Siz: ${displayMsg(msg.content)}`)
              : msg.role === 'error'
                ? React.createElement(Text, { color: RED }, `  ✖ ${msg.content}`)
                : msg.role === 'system'
                  ? React.createElement(Text, { color: YELLOW }, msg.content)
                  : React.createElement(Box, { paddingLeft: 1 },
                      React.createElement(MarkdownText, { content: msg.content })
                    )
          )
        ),
      isLoading
        ? React.createElement(Text, { color: YELLOW }, '  Oilanyp jatyr...')
        : null
    ),

    // Slash menu
    showMenu && filteredCmds.length > 0
      ? React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingTop: 0, paddingBottom: 0 },
          React.createElement(Box, { flexDirection: 'column', borderStyle: 'round', borderColor: CYAN, paddingX: 1 },
            filteredCmds.map((item, i) =>
              React.createElement(Box, { key: item.cmd },
                React.createElement(Text, { color: i === menuIndex ? CYAN : GRAY, bold: i === menuIndex },
                  `${i === menuIndex ? '▸ ' : '  '}${item.cmd}  ${item.desc}`
                )
              )
            )
          )
        )
      : null,

    // Connect form (token + baseURL)
    connect
      ? React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingBottom: 0 },
          React.createElement(Box, { flexDirection: 'column', borderStyle: 'round', borderColor: YELLOW, paddingX: 1 },
            React.createElement(Text, { color: YELLOW, bold: true }, ` ${connect.name} — qosylý`),
            React.createElement(Text, { color: connect.focus === 'baseURL' ? CYAN : GRAY },
              `${connect.focus === 'baseURL' ? '▸ ' : '  '}Base URL: ${connect.baseURL || '(bos)'}`),
            React.createElement(Text, { color: connect.focus === 'apiKey' ? CYAN : GRAY },
              `${connect.focus === 'apiKey' ? '▸ ' : '  '}API kilt: ${connect.apiKey ? '*'.repeat(Math.min(connect.apiKey.length, 24)) : (connect.keyOptional ? '(qajet emes)' : '(bos)')}`),
            React.createElement(Text, { dimColor: true }, 'Tab — órіs auystyrý | Enter — saqtau & jalǵastyrý | ESC — bas tartý')
          )
        )
      : null,

    // Provider/model picker (terezeli)
    picker
      ? (() => {
          const WINDOW = 10;
          const pickerItems = picker?.items || [];
          const filteredItems = pickerQuery
            ? pickerItems.filter(it =>
              (it.label || it.value || '').toLowerCase().includes(pickerQuery.toLowerCase()))
            : pickerItems;
          const total = filteredItems.length;
          const start = Math.max(0, Math.min(picker.index - Math.floor(WINDOW / 2), Math.max(0, total - WINDOW)));
          const visible = filteredItems.slice(start, start + WINDOW);
          return React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingBottom: 0 },
            React.createElement(Box, { flexDirection: 'column', borderStyle: 'round', borderColor: YELLOW, paddingX: 1 },
              React.createElement(Text, { color: YELLOW, bold: true }, `${picker.title}  (${total ? picker.index + 1 : 0}/${total})`),
              React.createElement(Text, { color: YELLOW }, ` Izdew: ${pickerQuery || ''}▏`),
              ...visible.map((item, vi) => {
                const i = start + vi;
                return React.createElement(Text, {
                  key: item.value + i,
                  color: i === picker.index ? CYAN : GRAY,
                  bold: i === picker.index,
                }, `${i === picker.index ? '▸ ' : '  '}${item.label}`);
              }),
              filteredItems.length === 0 &&
                React.createElement(Text, { color: GRAY }, ' Eshteńe tabylmady'),
              React.createElement(Text, { dimColor: true }, '↑↓ — tańdaý | teru — izdew | Enter — saqtau | ESC — bas tartý')
            )
          );
        })()
      : null,

    // Input field
    React.createElement(Box, { borderStyle: 'single', borderBottom: true, borderTop: false, borderLeft: false, borderRight: false, borderColor: YELLOW }),
    React.createElement(Box, { paddingX: 1, paddingBottom: 0, paddingTop: 0 },
      React.createElement(Text, { color: YELLOW, bold: true }, '  > '),
      input.length > 0
        ? React.createElement(Text, null, displayInput)
        : React.createElement(Text, { dimColor: true }, 'terý...'),
      React.createElement(Text, { color: YELLOW }, cursorOn ? '█' : ' ')
    ),
    React.createElement(Box, { borderStyle: 'single', borderBottom: false, borderTop: true, borderLeft: false, borderRight: false, borderColor: YELLOW, marginBottom: 1 })
  );
}
