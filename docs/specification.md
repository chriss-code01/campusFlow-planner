# CampusFlow specification

## Purpose
CampusFlow is a browser-based student task and event planner. It helps students organize deadlines, events, estimated durations, priorities, tags, and notes without a server account. Data is stored in the current browser unless exported.

## Intended users
Students who need a simple personal planner on desktop or mobile devices.

## Core records
Each item contains `id`, `title`, `type` (`task` or `event`), optional ISO date, optional duration in minutes, priority (1–3), tags, notes, completion state, and optional completion timestamp. Settings contain weekly study target/cap, optional name, and theme.

## Functional requirements
1. View dashboard statistics, weekly chart, study target/cap, and upcoming items.
2. Create, edit, complete, and delete tasks/events.
3. Filter by type/status/tag and sort by title, type, date, duration, or priority.
4. Search plain text or regular expressions and display malformed-pattern feedback.
5. Save items/settings in local storage.
6. Import/export JSON backups and load sample data.
7. Configure name, theme, weekly target, and weekly cap.
8. Use keyboard shortcuts `/`, `N`, and `Escape`.

## Non-functional requirements
- Responsive layout from small phones to desktop.
- Semantic HTML, visible focus indicators, labelled form controls, and status/error announcements.
- No framework or server required; deploy as a static GitHub Pages site.
- Imported data must be validated before replacing existing data.

## Data model
`Item { id: string, title: string, type: 'task'|'event', date: ISO string|null, duration: number|null, priority: 1|2|3, tags: string[], notes: string, done: boolean, doneAt: ISO string|null }`

`Settings { weeklyTarget: number, weeklyCap: number, name: string, theme: 'dark'|'light' }`
