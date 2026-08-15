import type { VoiceMDSettings } from '../types';
import { DEFAULT_CHAT_MODEL } from './chat-models';

export const DEFAULT_SETTINGS: VoiceMDSettings = {
	openaiApiKey: '',
	chatModel: DEFAULT_CHAT_MODEL,
	enablePostProcessing: false,
	postProcessingPrompt: undefined,
	language: undefined,
	maxRecordingDuration: 300,
	autoStartRecording: false,
	failedAudioRetentionDays: 7,
	dailyNoteFolder: '',
	dailyNoteFormat: 'YYYY-MM-DD',
	use24HourTime: true,
	voiceNotesFolder: 'Voice Notes',
	organizeVoiceNotesByDate: true,
	generateVoiceNoteTitle: true,
	linkedVoiceNoteHeading: '## \uD83C\uDF99\uFE0F Voice Notes',
};
