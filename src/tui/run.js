import React from 'react';
import { render } from 'ink';
import App from './App.js';

// Проверка интерактивного режима
if (!process.stdin.isTTY) {
  console.log('❌ TUI tek interaktivti terminalda jumys isteydi');
  console.log('💡 Qarapaiym komandalary qoldanynyz:');
  console.log('   qazaq ask "suraǵynyz"');
  console.log('   qazaq chat');
  console.log('   qazaq ls');
  process.exit(1);
}

render(React.createElement(App));
