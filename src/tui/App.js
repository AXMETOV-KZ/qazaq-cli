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

// Register all tools on module load
registerAllTools();

// Komandalar avtodoldyryý ushyn
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
  const { isRawModeSupported } = useStdin();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [menuIndex, setMenuIndex] = useState(0);

  // Avtodoldyryý menyýsin filtrleý
  const showMenu = input.startsWith('/') && !input.includes(' ');
  const filteredCmds = showMenu
    ? SLASH_COMMANDS.filter(c => c.cmd.startsWith(input.toLowerCase()))
    : [];

  // Providerdi júkteý
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    async function loadProvider() {
      try {
        const { getClient } = await import('../providers/index.js');
        const { info } = getClient();
        setProvider(info);
      } catch (e) {
        setProvider({ name: 'Error', defaultModel: '' });
      }
    }
    loadProvider();
  }, []);

  // Engizý islenýi
  useInput((inputChar, key) => {
    if (isLoading) return;

    // Menyýdaǵy navigaciya
    if (showMenu && filteredCmds.length > 0) {
      if (key.upArrow) {
        setMenuIndex(prev => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setMenuIndex(prev => Math.min(filteredCmds.length - 1, prev + 1));
        return;
      }
      if (key.return) {
        const selected = filteredCmds[menuIndex] || filteredCmds[0];
        if (selected) {
          setInput(selected.cmd + ' ');
          setCursorPos(selected.cmd.length + 1);
          setMenuIndex(0);
        }
        return;
      }
      if (key.tab) {
        const selected = filteredCmds[menuIndex] || filteredCmds[0];
        if (selected) {
          setInput(selected.cmd + ' ');
          setCursorPos(selected.cmd.length + 1);
          setMenuIndex(0);
        }
        return;
      }
    }

    // Enter — jiberý
    if (key.return) {
      if (input.trim()) {
        sendMessage(input.trim());
        setInput('');
        setCursorPos(0);
        setMenuIndex(0);
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorPos > 0) {
        setInput(prev => prev.slice(0, cursorPos - 1) + prev.slice(cursorPos));
        setCursorPos(prev => prev - 1);
        setMenuIndex(0);
      }
      return;
    }

    if (key.leftArrow) {
      setCursorPos(prev => Math.max(0, prev - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorPos(prev => Math.min(input.length, prev + 1));
      return;
    }

    if (key.escape || (key.ctrl && inputChar === 'c')) {
      exit();
      return;
    }

    if (inputChar && !key.ctrl && !key.meta) {
      setInput(prev => prev.slice(0, cursorPos) + inputChar + prev.slice(cursorPos));
      setCursorPos(prev => prev + 1);
      setMenuIndex(0);
    }
  });

  async function sendMessage(text) {
    // Slash-komandalar
    if (text.startsWith('/')) {
      const result = await handleSlashCommand(text, {
        messages,
        clearMessages: () => setMessages([]),
      });

      if (result.handled) {
        if (result.message) {
          setMessages(prev => [...prev, { role: 'system', content: result.message }]);
        }
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

      const agent = new Agent({
        client,
        model: info.defaultModel,
        onToolStart: () => {},
        onToolEnd: () => {},
        maxIterations: 15,
      });

      // Agent context — messages without tool-related ones
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

  // Raw mode tekserý
  if (!isRawModeSupported) {
    return React.createElement(Box, { flexDirection: 'column', padding: 1 },
      React.createElement(Text, { color: 'red' }, '❌ TUI tek interaktivtі termіnalda jumys isteydi'),
      React.createElement(Text, { dimColor: true }, '\nQoldanyńyz: qazaq ask "suraǵyńyz"')
    );
  }

  // Render
  return React.createElement(Box, { flexDirection: 'column', height: '100%' },

    // Header
    React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingTop: 1 },
      React.createElement(QAZAQArt, null),
      React.createElement(Box, { marginTop: 0, marginBottom: 0 },
        React.createElement(Text, { dimColor: true }, '  Build by Axmetov.S')
      ),
      React.createElement(Box, { marginTop: 0 },
        React.createElement(Text, { dimColor: true },
          provider
            ? `[${provider.name}] ${provider.defaultModel}${isCompactMode() ? ' [qysqa]' : ''}`
            : 'Júktelude...'
        )
      ),
      React.createElement(Box, { marginTop: 0 },
        React.createElement(Text, { dimColor: true }, 'ESC — shuǵy | Enter — jiberu | / — komandalar')
      )
    ),

    // Bólgiş
    React.createElement(Box, { borderStyle: 'single', borderBottom: true, borderTop: false, borderLeft: false, borderRight: false, borderColor: GRAY }),

    // Habarlama
    React.createElement(Box, { flexDirection: 'column', paddingX: 1, flexGrow: 1 },
      messages.length === 0
        ? React.createElement(Text, { dimColor: true }, '\n  Soylesýdi bastanyz...\n')
        : messages.map((msg, i) =>
          React.createElement(Box, { key: i, flexDirection: 'column', marginBottom: 0 },
            msg.role === 'user'
              ? React.createElement(Text, { color: CYAN, bold: true }, `  Siz: ${msg.content}`)
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

    // Menyý komandalary
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

    // Engizý órisi — sary shekaramen
    React.createElement(Box, { borderStyle: 'single', borderBottom: true, borderTop: false, borderLeft: false, borderRight: false, borderColor: YELLOW }),
    React.createElement(Box, { paddingX: 1, paddingBottom: 0, paddingTop: 0 },
      React.createElement(Text, { color: CYAN, bold: true }, '  ▸ '),
      input.length > 0
        ? React.createElement(Text, null, input)
        : React.createElement(Text, { dimColor: true }, 'terý...'),
      React.createElement(Text, { color: CYAN }, '▌')
    ),
    React.createElement(Box, { borderStyle: 'single', borderBottom: false, borderTop: true, borderLeft: false, borderRight: false, borderColor: YELLOW, marginBottom: 1 })
  );
}
