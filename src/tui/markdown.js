import React from 'react';
import { Box, Text } from 'ink';

const CYAN = '#00ABC2';
const GREEN = '#50FA7B';
const GRAY = '#888888';

// --- inline: **bold**, *italic*, `code`, __bold__, _italic_ ---
function parseInline(text, keyPrefix) {
	const nodes = [];
	const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
	let lastIndex = 0;
	let m;
	let n = 0;
	while ((m = regex.exec(text)) !== null) {
		if (m.index > lastIndex) {
			nodes.push(React.createElement(Text, { key: `${keyPrefix}-${n++}` }, text.slice(lastIndex, m.index)));
		}
		const tok = m[0];
		if (tok.startsWith('`')) {
			nodes.push(React.createElement(Text, { key: `${keyPrefix}-${n++}`, color: GREEN }, tok.slice(1, -1)));
		} else if (tok.startsWith('**') || tok.startsWith('__')) {
			nodes.push(React.createElement(Text, { key: `${keyPrefix}-${n++}`, bold: true }, tok.slice(2, -2)));
		} else {
			nodes.push(React.createElement(Text, { key: `${keyPrefix}-${n++}`, italic: true }, tok.slice(1, -1)));
		}
		lastIndex = regex.lastIndex;
	}
	if (lastIndex < text.length) {
		nodes.push(React.createElement(Text, { key: `${keyPrefix}-${n++}` }, text.slice(lastIndex)));
	}
	return nodes.length ? nodes : [text];
}

// --- одна строка обычного текста ---
function renderLine(line, key) {
	if (!line.trim()) return React.createElement(Text, { key }, ' ');

	const h = line.match(/^(#{1,4})\s+(.*)$/);
	if (h) return React.createElement(Text, { key, color: CYAN, bold: true }, h[2]);

	if (/^\s*---+\s*$/.test(line)) {
		return React.createElement(Text, { key, color: GRAY }, '─'.repeat(24));
	}

	const q = line.match(/^>\s?(.*)$/);
	if (q) return React.createElement(Text, { key, color: GRAY }, '│ ', ...parseInline(q[1], key));

	const ul = line.match(/^(\s*)[-*]\s+(.*)$/);
	if (ul) return React.createElement(Text, { key }, `${ul[1]}• `, ...parseInline(ul[2], key));

	const ol = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
	if (ol) return React.createElement(Text, { key }, `${ol[1]}${ol[2]}. `, ...parseInline(ol[3], key));

	return React.createElement(Text, { key }, ...parseInline(line, key));
}

// --- весь ответ: делим на текст и код-блоки ``` ``` ---
export function MarkdownText({ content }) {
	const blocks = [];
	const fence = /```(\w*)\n?([\s\S]*?)```/g;
	let last = 0;
	let m;
	while ((m = fence.exec(content)) !== null) {
		if (m.index > last) blocks.push({ type: 'text', text: content.slice(last, m.index) });
		blocks.push({ type: 'code', lang: m[1], code: m[2].replace(/\n$/, '') });
		last = fence.lastIndex;
	}
	if (last < content.length) blocks.push({ type: 'text', text: content.slice(last) });

	return React.createElement(Box, { flexDirection: 'column' },
		blocks.map((b, idx) =>
			b.type === 'code'
				? React.createElement(Box, {
						key: `b${idx}`, flexDirection: 'column',
						borderStyle: 'round', borderColor: GRAY, paddingX: 1,
					},
					b.code.split('\n').map((ln, li) =>
						React.createElement(Text, { key: `c${idx}-${li}`, color: GREEN }, ln || ' ')
					)
				)
				: React.createElement(Box, { key: `b${idx}`, flexDirection: 'column' },
					b.text.split('\n').map((ln, li) => renderLine(ln, `l${idx}-${li}`))
				)
		)
	);
}
