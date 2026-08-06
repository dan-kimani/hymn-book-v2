# Nyimbo Cia Gikuyu

A hymn book app for Kikuyu and English hymns — 2,008 hymns across four collections with full-text search.

## Getting started

```bash
yarn install
yarn start        # Expo dev server
```

Scan the QR code with Expo Go, or press `a` for Android emulator.

## Scripts

| Command        | Description                                        |
| -------------- | -------------------------------------------------- |
| `yarn start`   | Start the Expo dev server                          |
| `yarn android` | Build and run on connected Android device/emulator |
| `yarn ios`     | Build and run on iOS simulator                     |
| `yarn web`     | Start the web version                              |

## Building

```bash
# Development build (recommended for native modules like expo-audio)
npx expo run:android

# Production APK
npx eas build --platform android --profile production
```

## Project structure

```t
├── app/                  # Expo Router screens
│   ├── (tabs)/           # Home, Books, Favorites, Settings
│   ├── book/[bookId]     # Book detail with hymn list
│   └── hymn/[bookId]/[number]  # Hymn reader
├── src/
│   ├── components/       # Reusable UI components
│   ├── data/             # SQLite database layer and queries
│   ├── hooks/            # useRecorder, usePlayback
│   ├── state/            # Zustand stores (settings, favorites, recents, recordings)
│   └── theme/            # Color tokens
├── assets/
│   ├── data/hymns.db     # SQLite database with FTS5 search
│   └── images/           # App icons
├── global.css            # Tailwind v4 + uniwind entry
└── scripts/
    ├── build_data.py     # Generate hymns.db from extracted text files
    └── generate_icons.py # Generate the icon set
```

## Tech stack

- Expo SDK 57 with New Architecture
- Expo Router (file-based routing)
- Uniwind + Tailwind CSS v4
- SQLite + FTS5 for full-text search
- Zustand for state management
- expo-audio for recording and playback
