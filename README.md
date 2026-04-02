# 📁 File Organizer

A powerful Node.js CLI tool to scan, organize, detect duplicates, and clean up files in your directories.

## ✨ Features

- **📊 Directory Scanning** — Get detailed statistics about your files: count, total size, extension breakdown, age distribution, and more
- **🔍 Duplicate Detection** — Find duplicate files using SHA-256 cryptographic hashing for accurate comparison
- **📂 Smart Organization** — Automatically categorize and copy files into structured folders by type (Documents, Images, Videos, Audio, Archives, Other)
- **🧹 Cleanup Old Files** — Identify and optionally delete files older than a specified threshold (dry-run by default for safety)

## 🚀 Installation

### Prerequisites

- Node.js 18+ (ES Modules support)

### Install from Source

```bash
# Clone the repository
git clone https://github.com/Artur25072001/file-organizer.git
cd file-organizer

# Install dependencies
npm install

# (Optional) Make available globally
npm link
```

After running `npm link`, you can use the `file-organizer` command from anywhere.

## 📖 Usage

### Basic Syntax

```bash
node file-organizer.js <command> [directory] [options]
```

### Commands

#### 1. Scan Directory

Scan a directory and display detailed statistics.

```bash
node file-organizer.js scan /path/to/directory
```

**Output includes:**

- Total file count and size
- Breakdown by file extension
- File age distribution (last 7/30/90 days)
- Top 3 largest files
- Oldest file in the directory

#### 2. Find Duplicates

Detect duplicate files using SHA-256 hashing.

```bash
node file-organizer.js duplicates /path/to/directory
```

**Output includes:**

- Groups of duplicate files
- Wasted space calculation
- File size and hash for each duplicate

#### 3. Organize Files

Categorize and copy files into organized folder structures.

```bash
node file-organizer.js organize /path/to/source -o /path/to/destination
```

| Option               | Description                           |
| -------------------- | ------------------------------------- |
| `-o, --output <dir>` | **Required.** Target output directory |

**Categories:**
| Category | Extensions |
|----------|------------|
| 📄 Documents | pdf, doc, docx, txt, rtf, xls, xlsx, ppt, pptx, csv, md |
| 🖼️ Images | jpg, jpeg, png, gif, bmp, svg, webp, ico, tiff, tif |
| 🎬 Videos | mp4, avi, mkv, mov, wmv, flv, webm, m4v |
| 🎵 Audio | mp3, wav, flac, aac, ogg, wma, m4a |
| 📦 Archives | zip, rar, 7z, tar, gz, bz2, xz |
| 📁 Other | All other file types |

#### 4. Cleanup Old Files

Find and optionally delete files older than a specified number of days.

```bash
# Dry-run (default) — shows what would be deleted
node file-organizer.js cleanup /path/to/directory

# Delete files older than 30 days
node file-organizer.js cleanup /path/to/directory --older-than 30 --confirm
```

| Option                | Description                                                               | Default |
| --------------------- | ------------------------------------------------------------------------- | ------- |
| `--older-than <days>` | Age threshold in days                                                     | `90`    |
| `--confirm`           | Actually delete files (without this flag, only a dry-run report is shown) | —       |

### NPM Scripts

You can also use npm scripts for convenience:

```bash
npm run scan -- /path/to/directory
npm run duplicates -- /path/to/directory
npm run organize -- /path/to/source -o /path/to/destination
npm run cleanup -- /path/to/directory
```

## 🏗️ Project Structure

```
file-organizer/
├── file-organizer.js     # Main CLI entry point (Commander setup)
├── package.json          # Project metadata and dependencies
├── .gitignore            # Git ignore rules
├── README.md             # This file
└── lib/
    ├── scanner.js        # Directory scanning and statistics
    ├── duplicates.js     # SHA-256 duplicate detection
    ├── organizer.js      # File categorization and copying
    └── cleanup.js        # Old file identification and deletion
```

## 🔧 Architecture

- **ES Modules** — Uses modern `import`/`export` syntax
- **Event-Driven** — All core classes extend `EventEmitter` for real-time progress reporting
- **Safe Operations** — Cleanup runs in dry-run mode by default; file collisions are handled with numeric suffixes
- **Streaming for Large Files** — Files ≥10MB are copied via streams (`pipeline`) for memory efficiency
- **Cryptographic Hashing** — Duplicate detection uses SHA-256 for accurate comparison

## 📦 Dependencies

| Package                                              | Purpose                                               |
| ---------------------------------------------------- | ----------------------------------------------------- |
| [commander](https://www.npmjs.com/package/commander) | CLI framework for command parsing and help generation |

All other modules used are Node.js built-ins (`fs`, `path`, `crypto`, `events`, `stream/promises`).

## 📝 License

ISC

## 👤 Author

Artur Dymchevskyi
