import { readFileSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { loadConfig, saveConfig } from '../utils/config.js';

// Рабочий каталог (можно расширять через /qosu)
let workingDirs = [process.cwd()];

// Компактный режим
let compactMode = false;

// Системные промпты
const SYSTEM_DEFAULT = 'Sen paidaly AI-kómekshisі. Qysqa jári naqty jauap ber.';
const SYSTEM_COMPACT = 'Sen paidaly AI-kómekshisі. MAKSIMALDY qysqa jauap ber. Tek máni, artyq sóz joq.';

export function getSystemPrompt() {
  return compactMode ? SYSTEM_COMPACT : SYSTEM_DEFAULT;
}

export function isCompactMode() {
  return compactMode;
}

/**
 * Обработать slash-команду
 * @param {string} input - ввод пользователя (начинается с /)
 * @param {object} context - контекст { messages, client, info, model, setMessages, clearMessages }
 * @returns {object} { handled: boolean, message?: string, skipAI?: boolean }
 */
export async function handleSlashCommand(input, context) {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case '/komek':
      return cmdKomek();

    case '/tazala':
      return cmdTazala(context);

    case '/qysqa':
      return cmdQysqa();

    case '/tez':
      return cmdTez(context);

    case '/baptau':
      return cmdBaptau(args);

    case '/qosu':
      return cmdQosu(args);

    case '/agentter':
      return cmdAgentter(args);

    case '/butaq':
      return cmdButaq(context);

    case '/aralau':
      return cmdAralau(args, context);

    case '/serik':
      return cmdSerik();

    case '/keshteu':
      return cmdKeshteu(context);

    case '/sakta':
      return cmdSakta(args);

    case '/tekser':
      return cmdTekser(args);

    case '/jenildet':
      return cmdJenildet(args);

    case '/qayta':
      return cmdQayta(args, context);

    case '/agent':
      return cmdAgent();

    default:
      return { handled: false };
  }
}

// === /komek — Komandalar tizimi ===
function cmdKomek() {
  const lines = [
    '',
    '  ========================================',
    '      QAZAQ CLI — Komandalar tizimi',
    '  ========================================',
    '',
    '  /komek       Komandalar tizimi',
    '  /tazala      Sessiyani tazalau',
    '  /qysqa       Qysqasha rejim (AI jauap qysqartý)',
    '  /tez         Jyldam rejim',
    '  /baptau      Baptaulardy kórsetu / ózgertu',
    '  /qosu        Jumys katalogyn qosý',
    '  /agentter    AI agent basqarý',
    '  /butaq       Dialogty butaqttau',
    '  /aralau      Qosymsha suraq qoý',
    '  /serik       Serikti iske qosý',
    '  /keshteu     Keshdi tekserý',
    '  /sakta       Git-kommit jasau',
    '  /tekser      PR kodyn qarap, pikir qaldyru',
    '  /jenildet    Kodty qarapaiymdandyru',
    '  /qayta       Sónǵy suraqty qaitalau',
    '  /agent       Agent rejimi — aspaptar men jumys istetedi',
    '',
    '  ↑↓ — tańdaý | Enter — tańdaý / jiberý | ESC — shyǵý',
    '',
  ];
  return { handled: true, message: lines.join('\n'), skipAI: true };
}

// === /tazala — Sessiyani tazalau ===
function cmdTazala(context) {
  if (context.clearMessages) {
    context.clearMessages();
  }
  return { handled: true, message: '  Sessiya tazaldy. Jana dialog bastauǵa bolady.', skipAI: true };
}

// === /qysqa — Qysqasha rejim ===
function cmdQysqa() {
  compactMode = !compactMode;
  const state = compactMode ? 'qosyldy' : 'óshirildi';
  return { handled: true, message: `  Qysqasha rejim ${state}.`, skipAI: true };
}

// === /tez — Jyldam rejim ===
function cmdTez(context) {
  return {
    handled: true,
    message: '  Jyldam rejim qosyldy. Jauaptar tezirek bolady.',
    skipAI: true
  };
}

// === /baptau — Baptaulardy basqaru ===
function cmdBaptau(args) {
  if (args.length === 0) {
    const cfg = loadConfig();
    const lines = ['', '  Baptaular:'];
    const keys = Object.keys(cfg);
    if (keys.length === 0) {
      lines.push('  (bos — baptaular joq)');
    } else {
      for (const key of keys) {
        const val = key.toLowerCase().includes('key') ? '***' : cfg[key];
        lines.push(`  ${key}: ${val}`);
      }
    }
    lines.push('');
    lines.push('  Qoldaný: /baptau <key>=<value>');
    lines.push('  Mysalý: /baptau provider=openai');
    return { handled: true, message: lines.join('\n'), skipAI: true };
  }

  const argStr = args.join(' ');
  const eqIdx = argStr.indexOf('=');
  if (eqIdx === -1) {
    return { handled: true, message: '  Qate: key=value formatynda jazyńyz', skipAI: true };
  }

  const key = argStr.slice(0, eqIdx).trim();
  const value = argStr.slice(eqIdx + 1).trim();
  saveConfig({ [key]: value });
  return { handled: true, message: `  Saqtaldy: ${key} = ${value}`, skipAI: true };
}

// === /qosu — Jumys katalogyn qosu ===
function cmdQosu(args) {
  if (args.length === 0) {
    return {
      handled: true,
      message: `  Jumys katalogtary:\n${workingDirs.map(d => '  ' + d).join('\n')}\n\n  Qoldaný: /qosu <jol>`,
      skipAI: true
    };
  }

  const dirPath = args[0];
  try {
    const stat = statSync(dirPath);
    if (!stat.isDirectory()) {
      return { handled: true, message: `  Qate: ${dirPath} — býl papka emes`, skipAI: true };
    }
    const absPath = join(process.cwd(), dirPath);
    if (!workingDirs.includes(absPath)) {
      workingDirs.push(absPath);
    }
    return { handled: true, message: `  Qosyldy: ${absPath}`, skipAI: true };
  } catch {
    return { handled: true, message: `  Qate: ${dirPath} tabylmady`, skipAI: true };
  }
}

// === /agentter — Agentterdi basqaru ===
function cmdAgentter(args) {
  const cfg = loadConfig();
  const agentConfig = cfg.agents || {};

  if (args.length === 0) {
    const lines = ['', '  AI Agentter:'];
    const agents = Object.keys(agentConfig);
    if (agents.length === 0) {
      lines.push('  (bos — agentter joq)');
    } else {
      for (const name of agents) {
        const a = agentConfig[name];
        lines.push(`  ${a.enabled ? '✓' : '✗'} ${name}: ${a.description || ''}`);
      }
    }
    lines.push('');
    lines.push('  Qoldaný:');
    lines.push('  /agentter qosý <atauy>    — agentti qosý');
    lines.push('  /agentter óshirý <atauy>   — agentti óshirý');
    return { handled: true, message: lines.join('\n'), skipAI: true };
  }

  const action = args[0];
  const name = args[1];

  if (action === 'qosý' && name) {
    agentConfig[name] = { enabled: true, description: '' };
    saveConfig({ agents: agentConfig });
    return { handled: true, message: `  Agent qosyldy: ${name}`, skipAI: true };
  }

  if (action === 'óshirý' && name) {
    if (agentConfig[name]) {
      agentConfig[name].enabled = false;
      saveConfig({ agents: agentConfig });
      return { handled: true, message: `  Agent óshirildi: ${name}`, skipAI: true };
    }
    return { handled: true, message: `  Agent tabylmady: ${name}`, skipAI: true };
  }

  return { handled: true, message: '  Qoldaný: /agentter qosý|óshirý <atauy>', skipAI: true };
}

// === /butaq — Dialogty butaqttau ===
function cmdButaq(context) {
  const messages = context.messages || [];
  const count = messages.length;
  return {
    handled: true,
    message: `  Butaq jasaldy. Aǵymdaǵy sóylesý: ${count} xabarlama.\n  (Butaq saqtau funksiyasy kelensi nusqada bolady)`,
    skipAI: true
  };
}

// === /aralau — Qosymsha suraq ===
function cmdAralau(args, context) {
  if (args.length === 0) {
    return { handled: true, message: '  Qoldaný: /aralau <suraq>', skipAI: true };
  }
  return {
    handled: false,
    message: null,
    skipAI: false,
    rewritten: `[Qosymsha suraq] ${args.join(' ')}`
  };
}

// === /serik — Serik ===
function cmdSerik() {
  return {
    handled: true,
    message: '  Serik (kompanon) rejimi — jaqynda!\n  Bul funksiya OpenClaude Buddy-ge uqsa bolady.',
    skipAI: true
  };
}

// === /keshteu — Keshdi tekserý ===
function cmdKeshteu(context) {
  const messages = context.messages || [];
  const userMsgs = messages.filter(m => m.role === 'user').length;
  const assistantMsgs = messages.filter(m => m.role === 'assistant').length;
  return {
    handled: true,
    message: `  Kesh málіметі:\n  Suraqtar: ${userMsgs}\n  Jauaptar: ${assistantMsgs}\n  Barlyǵy: ${messages.length} xabarlama`,
    skipAI: true
  };
}

// === /sakta — Git-kommit ===
async function cmdSakta(args) {
  try {
    const message = args.join(' ') || 'qazaq auto-commit';
    const result = execSync('git status --short', { encoding: 'utf-8', cwd: process.cwd() });

    if (!result.trim()) {
      return { handled: true, message: '  Git: ozgerister joq.', skipAI: true };
    }

    execSync('git add -A', { cwd: process.cwd() });
    execSync(`git commit -m "${message}"`, { cwd: process.cwd() });
    return { handled: true, message: `  Git kommit jasaldy: "${message}"`, skipAI: true };
  } catch (e) {
    return { handled: true, message: `  Git qate: ${e.message}`, skipAI: true };
  }
}

// === /tekser — PR tekserý ===
function cmdTekser(args) {
  try {
    const branch = args[0] || 'main';
    const diff = execSync(`git diff ${branch}..HEAD --stat`, { encoding: 'utf-8', cwd: process.cwd() });

    if (!diff.trim()) {
      return { handled: true, message: `  ${branch} butaǵymen aiyrmashylyq joq.`, skipAI: true };
    }

    return {
      handled: true,
      message: `  PR tekserý (${branch}):\n${diff}`,
      skipAI: false
    };
  } catch (e) {
    return { handled: true, message: `  Git qate: ${e.message}`, skipAI: true };
  }
}

// === /jenildet — Kodty qarapaiymdandyru ===
function cmdJenildet(args) {
  if (args.length === 0) {
    return { handled: true, message: '  Qoldaný: /jenildet <fail joly>', skipAI: true };
  }
  try {
    const content = readFileSync(args[0], 'utf-8');
    return {
      handled: false,
      message: null,
      skipAI: false,
      rewritten: `Mynany kodty qarapaiymdandyr:\n\`\`\`\n${content}\n\`\`\``
    };
  } catch {
    return { handled: true, message: `  Fail tabylmady: ${args[0]}`, skipAI: true };
  }
}

// === /qayta — Sónǵy suraqty qaitalau ===
function cmdQayta(args, context) {
  const messages = context.messages || [];
  const userMsgs = messages.filter(m => m.role === 'user');

  if (userMsgs.length === 0) {
    return { handled: true, message: '  Qaitalaityn suraq joq.', skipAI: true };
  }

  const lastUserMsg = userMsgs[userMsgs.length - 1].content;
  return {
    handled: false,
    message: null,
    skipAI: false,
    rewritten: lastUserMsg
  };
}

// === /agent — Agent rejimi ===
function cmdAgent() {
  const lines = [
    '',
    '  ══════════════════════════════════════',
    '  Men Qazaq Agent — AI kod agentimin.',
    '  Menin qolumnan keletin zattar:',
    '  ══════════════════════════════════════',
    '',
    '  - Kod jazu, oqy, tuzetu',
    '  - Faylldarmen jumys (oqy, jazú, izdeý)',
    '  - Shell komandalary (build, test, git)',
    '  - Internette izdeý, saibandy oqy',
    '  - Paketter ornatý (npm, pip, apt)',
    '  - Git operaciyalary (commit, push, diff)',
    '',
    '  Mysaldar:',
    '  "src/index.js faylyn oqy"',
    '  "npm test komandasy ornat"',
    '  "bul proshtyń README.md faylyn jaz"',
    '  "git diff kórset jañe code review jasa"',
    '  "Almatydaǵy aua raiyn izde"',
    '  "Python paketti ornat: requests"',
    '',
    '  Basqa kómek ushyn: /komek',
    '',
  ];
  return { handled: true, message: lines.join('\n'), skipAI: true };
}
