# Linked voice notes

This fork adds a linked voice-note workflow for Obsidian mobile.

## What it does

A linked recording:

1. Records audio in Voice MD.
2. Transcribes it with OpenAI.
3. Generates a short title in the same language as the transcription.
4. Creates a Markdown note in `Voice Notes/YYYY/MM/` using a timestamp filename.
5. Adds a wikilink to that note under `## 🎙️ Voice Notes` in today's configured daily note.

Example note path:

```text
Voice Notes/2026/08/2026-08-14 1730.md
```

Example daily-note entry:

```markdown
## 🎙️ Voice Notes

- 17:30 [[Voice Notes/2026/08/2026-08-14 1730|Installare Cosmos Cloud]]
```

The voice-note file contains frontmatter, the generated title, and the transcription:

```markdown
---
type: voice-note
created: "2026-08-14 17:30"
---

# Installare Cosmos Cloud

Trascrizione della nota vocale...
```

## Configuration

Use the existing Voice MD settings for the daily note:

- **Daily note folder**: `Daily Notes`
- **Daily note date format**: `YYYY-MM-DD`
- **Use 24-hour time**: enabled

The linked-note defaults in this branch are:

- Voice-note folder: `Voice Notes`
- Organize by year/month: enabled
- Generate AI title: enabled
- Daily-note heading: `## 🎙️ Voice Notes`

## iPhone Action Button

Create an iOS Shortcut containing only **Open URLs** with:

```text
obsidian://voice-md?record=true&linked=true&autostart=true
```

For a multi-vault setup, include the vault name:

```text
obsidian://voice-md?vault=PSTvault&record=true&linked=true&autostart=true
```

Assign that Shortcut to the iPhone Action Button.

Unlike the original `daily=true` workflow, `linked=true` does not need an active Markdown editor. Voice MD writes the separate note and daily-note link directly through the Obsidian vault API.

## Obsidian command

The branch also adds the command:

**Voice MD: Start linked voice recording**

This runs the same linked-note workflow directly inside Obsidian.
