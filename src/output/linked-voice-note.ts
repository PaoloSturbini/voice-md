import { App, moment, normalizePath, TFile, TFolder } from 'obsidian';
import type { VoiceMDSettings } from '../types';

export interface LinkedVoiceNoteResult {
	notePath: string;
	dailyNotePath: string;
	title: string;
}

export class LinkedVoiceNoteWriter {
	constructor(
		private readonly app: App,
		private readonly settings: VoiceMDSettings
	) {}

	async saveAndLink(text: string, title: string, timestamp = new Date()): Promise<LinkedVoiceNoteResult> {
		const cleanTitle = this.sanitizeTitle(title) || 'Voice note';
		const notePath = await this.createVoiceNote(text, cleanTitle, timestamp);
		const dailyNotePath = await this.appendLinkToDailyNote(notePath, cleanTitle, timestamp);
		return { notePath, dailyNotePath, title: cleanTitle };
	}

	private async createVoiceNote(text: string, title: string, timestamp: Date): Promise<string> {
		const rootFolder = normalizePath(this.settings.voiceNotesFolder?.trim() || 'Voice Notes');
		const folderPath = this.settings.organizeVoiceNotesByDate
			? normalizePath(`${rootFolder}/${this.format(timestamp, 'YYYY')}/${this.format(timestamp, 'MM')}`)
			: rootFolder;
		await this.ensureFolderPath(folderPath);

		const stamp = this.format(timestamp, 'YYYY-MM-DD HHmm');
		let notePath = `${folderPath}/${stamp}.md`;
		let suffix = 2;
		while (this.app.vault.getAbstractFileByPath(notePath)) {
			notePath = `${folderPath}/${stamp}-${suffix}.md`;
			suffix++;
		}

		const created = this.format(timestamp, 'YYYY-MM-DD HH:mm');
		const content = `---\ntype: voice-note\ncreated: "${created}"\n---\n\n# ${title}\n\n${text.trim()}\n`;
		await this.app.vault.create(notePath, content);
		return notePath;
	}

	private async appendLinkToDailyNote(notePath: string, title: string, timestamp: Date): Promise<string> {
		const fileName = `${this.format(timestamp, this.settings.dailyNoteFormat || 'YYYY-MM-DD')}.md`;
		const dailyNotePath = normalizePath([this.settings.dailyNoteFolder, fileName].filter(Boolean).join('/'));
		await this.ensureParentFolders(dailyNotePath);

		let dailyFile = this.app.vault.getAbstractFileByPath(dailyNotePath);
		if (!dailyFile) {
			dailyFile = await this.app.vault.create(dailyNotePath, '');
		}
		if (!(dailyFile instanceof TFile) || dailyFile.extension !== 'md') {
			throw new Error(`Daily note path is not a Markdown file: ${dailyNotePath}`);
		}

		const heading = this.settings.linkedVoiceNoteHeading?.trim() || '## \uD83C\uDF99\uFE0F Voice Notes';
		const target = notePath.replace(/\.md$/i, '');
		const time = this.settings.use24HourTime
			? this.format(timestamp, 'HH:mm')
			: this.format(timestamp, 'h:mm A');
		const linkLine = `- ${time} [[${target}|${title}]]`;
		const existing = await this.app.vault.read(dailyFile);
		const updated = this.insertLinkUnderHeading(existing, heading, linkLine);
		if (updated !== existing) {
			await this.app.vault.modify(dailyFile, updated);
		}
		return dailyNotePath;
	}

	private insertLinkUnderHeading(content: string, heading: string, linkLine: string): string {
		const normalized = content.replace(/\r\n/g, '\n');
		const lines = normalized.split('\n');
		if (lines.some((line) => line.trim() === linkLine)) return normalized;

		const headingIndex = lines.findIndex((line) => line.trim() === heading);
		if (headingIndex === -1) {
			const prefix = normalized.trimEnd();
			return `${prefix}${prefix ? '\n\n' : ''}${heading}\n\n${linkLine}\n`;
		}

		const headingMatch = heading.match(/^(#{1,6})\s/);
		const headingLevel = headingMatch?.[1]?.length ?? 2;
		let sectionEnd = lines.length;
		for (let index = headingIndex + 1; index < lines.length; index++) {
			const match = lines[index]?.match(/^(#{1,6})\s/);
			if (match && match[1] && match[1].length <= headingLevel) {
				sectionEnd = index;
				break;
			}
		}

		let insertAt = sectionEnd;
		while (insertAt > headingIndex + 1 && lines[insertAt - 1]?.trim() === '') insertAt--;
		const insertion = insertAt === headingIndex + 1 ? ['', linkLine] : [linkLine];
		lines.splice(insertAt, 0, ...insertion);
		return `${lines.join('\n').replace(/\n*$/, '')}\n`;
	}

	private async ensureParentFolders(path: string): Promise<void> {
		const parts = path.split('/');
		parts.pop();
		if (parts.length > 0) await this.ensureFolderPath(parts.join('/'));
	}

	private async ensureFolderPath(path: string): Promise<void> {
		const normalized = normalizePath(path);
		if (!normalized) return;
		const parts = normalized.split('/').filter(Boolean);
		let current = '';
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			const existing = this.app.vault.getAbstractFileByPath(current);
			if (existing instanceof TFolder) continue;
			if (existing) throw new Error(`Cannot create folder ${current}; a file already exists there.`);
			await this.app.vault.adapter.mkdir(current);
		}
	}

	private sanitizeTitle(title: string): string {
		return title
			.replace(/[\r\n]+/g, ' ')
			.replace(/[\[\]|]/g, '')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 120);
	}

	private format(date: Date, format: string): string {
		const createMoment = moment as unknown as (input: Date) => { format(value: string): string };
		return createMoment(date).format(format);
	}
}
