import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp, useStdin } from 'ink';
import { handleSlashCommand, getSystemPrompt, isCompactMode } from './commands.js';
import { Agent } from '../agent/index.js';
import { registerAllTools } from '../agent/tools.js';

const CYAN = '#00ABC2';
const YELLOW = '#FFEC2D';
const GRAY = '#888888';
const GREEN = '#50FA7B';
const RED = '#FF5555';

registerAllTools();

const SLASH_COMMANDS = [
  { cmd: '/komek', desc: 'Komandalar tizimi' },
  { cmd: '/tazala', desc: 'Sessiyani tazalau' },
  { cmd: '/qysqa', desc: 'Qysqasha rejim' },
  { cmd: '/tez', desc: 'Jyldam rejim' },
  { cmd: '/baptau', desc: 'Baptaulardy kórsetu' },
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
    refreshProvider();
  }, []);

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
        if (result.message) {
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
        maxIterations: 15,
      });

      const cleanHistory = messages.filter(m =>
        m.role === 'user' || m.role === 'assistant' || m.role === 'system'
      );

      const { answer, iterations } = await agent.run(text, cleanHistory);
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'error', content: error.message }]);
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
                  : React.createElement(Text, null, `  ${msg.content}`)
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
