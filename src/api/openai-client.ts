import OpenAI from 'openai';
import { TranscriptionOptions, TranscriptionResult, ExtendedTranscriptionResponse } from '../types';
import { ErrorHandler } from '../utils/error-handler';

/**
 * OpenAIClient handles communication with the OpenAI Audio Transcription API
 */
export const OPENAI_TRANSCRIPTION_MAX_BYTES = 25 * 1024 * 1024;

export class OpenAIClient {
	private client: OpenAI;

	constructor(apiKey: string) {
		this.client = new OpenAI({
			apiKey: apiKey,
			dangerouslyAllowBrowser: true // Required for browser usage in Obsidian
		});
	}

	async transcribe(
		audioBlob: Blob,
		options?: TranscriptionOptions,
		enableMeetingMode?: boolean
	): Promise<TranscriptionResult> {
		try {
			if (audioBlob.size > OPENAI_TRANSCRIPTION_MAX_BYTES) {
				throw new Error(`AUDIO_TOO_LARGE:${audioBlob.size}`);
			}

			const audioFile = new File([audioBlob], `recording.${this.extensionForType(audioBlob.type)}`, {
				type: audioBlob.type
			});

			const model = enableMeetingMode ? 'gpt-4o-transcribe-diarize' : 'gpt-4o-mini-transcribe';
			const responseFormat = enableMeetingMode ? 'diarized_json' : 'json';

			const transcriptionParams: OpenAI.Audio.Transcriptions.TranscriptionCreateParams & {
				timestamp_granularities?: string[];
			} = {
				file: audioFile,
				model: model,
				language: options?.language,
				prompt: options?.prompt,
				response_format: responseFormat,
			};

			if (enableMeetingMode) {
				transcriptionParams.timestamp_granularities = ['segment'];
			}

			const response = await this.client.audio.transcriptions.create(transcriptionParams);
			const extendedResponse = response as unknown as ExtendedTranscriptionResponse;

			return {
				text: extendedResponse.text,
				language: extendedResponse.language,
				duration: extendedResponse.duration,
				segments: enableMeetingMode ? extendedResponse.segments : undefined
			};
		} catch (error) {
			if (error instanceof Error && error.message.startsWith('AUDIO_TOO_LARGE:')) {
				throw ErrorHandler.audioTooLarge(audioBlob.size, OPENAI_TRANSCRIPTION_MAX_BYTES);
			}
			throw ErrorHandler.fromOpenAIError(error);
		}
	}

	private extensionForType(mimeType: string): string {
		if (mimeType.includes('mp4')) return 'mp4';
		if (mimeType.includes('ogg')) return 'ogg';
		if (mimeType.includes('wav')) return 'wav';
		if (mimeType.includes('mpeg')) return 'mp3';
		return 'webm';
	}

	async generateTitle(rawText: string, model: string): Promise<string> {
		try {
			const completion = await this.client.chat.completions.create({
				model,
				messages: [
					{
						role: 'system',
						content: 'Create a concise title for a voice note. Use the same language as the note, use at most seven words, and return only the title with no quotation marks or final punctuation.'
					},
					{
						role: 'user',
						content: rawText
					}
				]
			});
			return completion.choices[0]?.message.content?.trim() || 'Voice note';
		} catch (error) {
			throw ErrorHandler.fromOpenAIError(error, true);
		}
	}

	async structureText(
		rawText: string,
		model: string,
		customPrompt?: string
	): Promise<string> {
		try {
			const systemPrompt = customPrompt ||
				'You are a helpful assistant that formats voice transcriptions into well-structured markdown. ' +
				'Use appropriate headings (##, ###), bullet points, numbered lists, and paragraphs. ' +
				'IMPORTANT: If the text contains speaker labels (e.g., **Speaker 1:**), preserve them exactly. ' +
				'Preserve all content from the original transcription while improving readability.';

			const completion = await this.client.chat.completions.create({
				model: model,
				messages: [
					{
						role: 'system',
						content: systemPrompt
					},
					{
						role: 'user',
						content: `Format the following transcription as clear markdown:\n\n${rawText}`
					}
				]
			});

			return completion.choices[0]?.message.content || rawText;
		} catch (error) {
			throw ErrorHandler.fromOpenAIError(error, true);
		}
	}
}
