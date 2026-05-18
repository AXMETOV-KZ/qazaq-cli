import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

const CYAN = '#00ABC2';
const YELLOW = '#FFEC2D';

const letters = {
  Q: [
    ' ██████ ',
    '██    ██',
    '██    ██',
    '██ ▄▄ ██',
    ' ██████ ',
    '    ▀▀  '
  ],
  A: [
    ' █████  ',
    '██   ██ ',
    '███████ ',
    '██   ██ ',
    '██   ██ ',
    '        '
  ],
  Z: [
    '███████ ',
    '   ██   ',
    '  ██    ',
    ' ██     ',
    '███████ ',
    '        '
  ]
};

const Letter = ({ lines, color }) => (
  <Box flexDirection="column" marginRight={0}>
    {lines.map((line, i) => (
      <Text key={i} color={color} bold>{line}</Text>
    ))}
  </Box>
);

const QAZAQArt = () => (
  <Box flexDirection="row" marginBottom={1}>
    <Letter lines={letters.Q} color={CYAN} />
    <Letter lines={letters.A} color={CYAN} />
    <Letter lines={letters.Z} color={YELLOW} />
    <Letter lines={letters.A} color={CYAN} />
    <Letter lines={letters.Q} color={CYAN} />
  </Box>
);

const Menu = ({ items, onSelect }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : items.length - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
    }
    if (key.return) {
      onSelect(items[selectedIndex]);
    }
  });

  return (
    <Box flexDirection="column">
      {items.map((item, index) => (
        <Box key={item.value}>
          <Text
            color={index === selectedIndex ? CYAN : undefined}
            bold={index === selectedIndex}
          >
            {(index === selectedIndex ? '▸ ' : '  ') + item.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

export default function App() {
  const { exit } = useApp();
  const [screen, setScreen] = useState('menu');
  const [message, setMessage] = useState('');

  const items = [
    { label: '👋 Сәлемдесу', value: 'hello' },
    { label: '⏰ Уақытты көрсету', value: 'time' },
    { label: '📁 Файлдар тізімі', value: 'files' },
    { label: '❌ Шығу', value: 'exit' }
  ];

  const handleSelect = (item) => {
    if (item.value === 'exit') {
      exit();
      return;
    }
    if (item.value === 'hello') setMessage('Сәлем, Әлем! 🇰🇿');
    if (item.value === 'time') setMessage(new Date().toLocaleString('kk-KZ'));
    if (item.value === 'files') setMessage('Файлдар тізімі: qazaq ls');

    setScreen('result');
  };

  useInput((input, key) => {
    if (key.escape && screen === 'result') {
      setScreen('menu');
      setMessage('');
    }
  });

  if (screen === 'result') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color={CYAN}>Нәтиже:</Text>
        <Text>{message}</Text>
        <Box marginTop={1}>
          <Text dimColor>ESC — менюға қайту</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text>🇰🇿</Text>
      </Box>
      <QAZAQArt />
      <Box marginTop={1} marginBottom={1}>
        <Text dimColor>Төмендегі мәзірден таңдаңыз (↑↓ + Enter):</Text>
      </Box>
      <Menu items={items} onSelect={handleSelect} />
    </Box>
  );
}
