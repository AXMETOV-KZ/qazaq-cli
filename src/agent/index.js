import { getToolsForAPI, getTool, getAllTools } from './tools.js';

// Agent system prompt
const AGENT_SYSTEM = `Men Qazaq Agent — AI kod agentimin. Menin qolumnan keletin zattar:

- shell_exec — bash komandalaryn ornatymyn
- file_read — fayldardy oqymyn
- file_write — faylldarga jazamyn
- file_list — papkadaghy fayldardy tizimdeymin
- file_search — fayldarda izdeý jasaymyn
- git_exec — git operaciyalaryn ornatymyn
- web_fetch — URL-den aqparat alyp, saibandy tolyq oqymyn
- web_search — internette izdeý jasaymyn, natijelerdi tabamyn
- download — fayldardy júktep alymyn
- install_package — paketterdi ornatymyn

EREJELER:
1. Óz bilimin jetkilikti bolsa, aspapsyz jauap ber.
2. Aspan kerek bolsa — úsynys jasa, kútip turma.
3. Qauipti aspaptardy (file_write, shell_exec, git_exec push/commit) qoldanar aldynan paydalanyshydan sura.
4. Jauabyn qysqa jañe naqty ber.
5. Kod jazghanda — tolyq, jumys isteitin kod ber.
6. INTERNETTEN AQPARAT TABU: web_search menen izdep, SOIN web_fetch menen saibandy tolyq oqy. Natieleni ózin jauapqa enqiz — paydalanyshyga ssilka berme, ozin oqygan aqparatty jaz.
7. Eger suraq aqparatty talap etsе — ALDYNA web_search jasa, SOIN eng jaqsy natijeden web_fetch menen oqy, SOIN jauap ber.

Jauabyndy Kazakh Latin tilinde ber. Emoji koldan.`;

export class Agent {
  constructor({ client, model, onToolStart, onToolEnd, onMessage, maxIterations = 15 }) {
    this.client = client;
    this.model = model;
    this.onToolStart = onToolStart || (() => {});
    this.onToolEnd = onToolEnd || (() => {});
    this.onMessage = onMessage || (() => {});
    this.maxIterations = maxIterations;
  }

  async run(userMessage, history = []) {
    const tools = getToolsForAPI();
    const messages = [
      { role: 'system', content: AGENT_SYSTEM },
      ...history.filter(m => m.role === 'system' || m.role === 'user' || m.role === 'assistant'),
      { role: 'user', content: userMessage }
    ];

    let iterations = 0;

    while (iterations < this.maxIterations) {
      iterations++;

      try {
        // Call AI with tools
        const params = {
          model: this.model,
          messages,
          max_tokens: 4096,
        };

        // Try to pass tools (native function calling)
        if (tools.length > 0) {
          params.tools = tools;
          params.tool_choice = 'auto';
        }

        const response = await this.client.chat.completions.create(params);
        const msg = response.choices[0]?.message;

        if (!msg) {
          return { answer: 'Jauap joq', iterations };
        }

        // Check for tool_calls (native function calling)
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          // Add assistant message with tool_calls to history
          messages.push(msg);

          for (const toolCall of msg.tool_calls) {
            const fnName = toolCall.function.name;
            let fnArgs;
            try {
              fnArgs = JSON.parse(toolCall.function.arguments);
            } catch {
              fnArgs = {};
            }

            this.onToolStart(fnName, fnArgs);

            const tool = getTool(fnName);
            let result;
            if (tool && tool.handler) {
              try {
                result = await tool.handler(fnArgs);
              } catch (e) {
                result = `Qate: ${e.message}`;
              }
            } else {
              result = `Qate: "${fnName}" aspaby tabylmady`;
            }

            // Truncate long results
            if (result.length > 10000) {
              result = result.slice(0, 10000) + '\n... (qysqartildy)';
            }

            this.onToolEnd(fnName, result);

            // Add tool result to messages
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: result
            });
          }

          // Continue the loop — AI will process tool results
          continue;
        }

        // No tool_calls — check for text-based tool calls (fallback)
        const content = msg.content || msg.reasoning_content || '';
        const parsed = parseToolCall(content);

        if (parsed) {
          this.onToolStart(parsed.name, parsed.args);

          const tool = getTool(parsed.name);
          let result;
          if (tool && tool.handler) {
            try {
              result = await tool.handler(parsed.args);
            } catch (e) {
              result = `Qate: ${e.message}`;
            }
          } else {
            result = `Qate: "${parsed.name}" aspaby tabylmady`;
          }

          if (result.length > 10000) {
            result = result.slice(0, 10000) + '\n... (qysqartildy)';
          }

          this.onToolEnd(parsed.name, result);

          // Add tool result as user message for the AI to process
          messages.push(msg);
          messages.push({
            role: 'user',
            content: `[${parsed.name}] natijesi:\n${result}`
          });

          continue;
        }

        // No tool calls — this is the final answer
        return { answer: content, iterations };

      } catch (error) {
        return { answer: `Qate: ${error.message}`, iterations };
      }
    }

    return { answer: `Maksimaldy iteraciya sanyna jetildi (${this.maxIterations})`, iterations };
  }
}

// Text-based tool call parser (fallback)
function parseToolCall(text) {
  if (!text) return null;

  // Format 1: ```tool ... ```
  const toolMatch = text.match(/```tool\s*\n([\s\S]*?)```/);
  if (toolMatch) {
    try {
      const parsed = JSON.parse(toolMatch[1].trim());
      if (parsed.name && parsed.arguments) {
        return { name: parsed.name, args: typeof parsed.arguments === 'string' ? JSON.parse(parsed.arguments) : parsed.arguments };
      }
    } catch {}
  }

  // Format 2: {"name": "...", "arguments": {...}}
  const jsonMatch = text.match(/\{"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^}]+\})\s*\}/);
  if (jsonMatch) {
    try {
      return { name: jsonMatch[1], args: JSON.parse(jsonMatch[2]) };
    } catch {}
  }

  return null;
}
