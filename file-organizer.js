#!/usr/bin/env node

import { Command } from "commander";
import { Scanner } from "./lib/scanner.js";
import { ScannerDuplicates } from "./lib/duplicates.js";
import { Organizer } from "./lib/organizer.js";
import { Cleanup } from "./lib/cleanup.js";

const program = new Command();

// --- ДОПОМІЖНІ ФУНКЦІЇ ---

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function drawProgressBar(current, total, width = 20) {
  if (total === 0) return "█".repeat(width) + ` 0/0`; // Захист від ділення на нуль
  const percentage = current / total;
  const filled = Math.round(percentage * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  return `${bar} ${current}/${total}`;
}

function handleError(error, contextPath = "") {
  if (error.code === "ENOENT") {
    console.error(
      `\n❌ Error: Directory or file not found: ${contextPath || error.path}`,
    );
  } else if (error.code === "EACCES") {
    console.error(
      `\n❌ Error: Permission denied: ${contextPath || error.path}`,
    );
  } else {
    console.error(`\n❌ Unexpected error: ${error.message}`);
  }
  process.exit(1);
}

// --- НАЛАШТУВАННЯ CLI ---

program
  .name("file-organizer")
  .description("CLI tool to organize files")
  .version("1.0.0");

// --- 1. КОМАНДА SCAN ---
program
  .command("scan <directory>")
  .description("Scan directory and show statistics")
  .action((directory) => {
    console.log(`📂 Scanning: ${directory}`);
    const scanner = new Scanner();

    scanner.on("file-found", ({ processed, total }) => {
      process.stdout.write(
        `\rProcessing... ${drawProgressBar(processed, total)} files`,
      );
    });

    scanner.on("scan-complete", (stats) => {
      console.log("\n\n📊 Scan Results:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`Total files: ${stats.totalFiles}`);
      console.log(`Total size: ${formatBytes(stats.totalSizeBytes)}\n`);

      console.log("By File Type:");
      stats.extensions.forEach(([ext, data]) => {
        const extName = ext.padEnd(7);
        const count = String(data.count).padStart(4);
        const size = formatBytes(data.totalSize).padStart(8);
        console.log(`  ${extName} ${count} files   ${size}`);
      });

      console.log("\nFile Age:");
      console.log(`  Last 7 days:    ${stats.ageStats.last7} files`);
      console.log(`  Last 30 days:   ${stats.ageStats.last30} files`);
      console.log(`  Older than 90:  ${stats.ageStats.older90} files\n`);

      console.log("Largest files:");
      stats.largestFiles.forEach((file, index) => {
        const name = file.name.padEnd(25);
        const size = formatBytes(file.size).padStart(8);
        console.log(`  ${index + 1}. ${name} ${size}`);
      });

      if (stats.oldestFile) {
        console.log(
          `\nOldest file: ${stats.oldestFile.name} (modified ${stats.oldestFile.daysOld} days ago)`,
        );
      }
    });

    scanner.on("error", (err) => handleError(err, directory));

    scanner.scan(directory);
  });

// --- 2. КОМАНДА DUPLICATES ---
program
  .command("duplicates <directory>")
  .description("Find duplicate files in directory")
  .action((directory) => {
    console.log(`🔍 Searching for duplicates in: ${directory}`);
    const scannerDuplicates = new ScannerDuplicates();

    scannerDuplicates.on("file-processed", ({ processedCount, totalFiles }) => {
      process.stdout.write(
        `\rCalculating hashes... ${drawProgressBar(processedCount, totalFiles)} files`,
      );
    });

    scannerDuplicates.on("duplicates-found", ({ groups, totalWastedSpace }) => {
      console.log("\n");
      if (groups.length === 0) {
        console.log("✅ No duplicates found!");
        return;
      }

      console.log(
        `Found ${groups.length} duplicate groups (${formatBytes(totalWastedSpace)} wasted):\n`,
      );

      groups.forEach((group, index) => {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        const shortHash = group.hash.substring(0, 12) + "...";

        console.log(
          `Group ${index + 1} (${group.paths.length} copies, ${formatBytes(group.singleSize)} each):`,
        );
        console.log(`  SHA-256: ${shortHash}\n`);

        group.paths.forEach((filePath) => {
          console.log(`  📄 ${filePath}`);
        });

        console.log(`\n  Wasted space: ${formatBytes(group.wastedSpace)}\n`);
      });

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`💾 Total wasted space: ${formatBytes(totalWastedSpace)}`);
    });

    scannerDuplicates.on("error", (err) => handleError(err, directory));

    scannerDuplicates.findDuplicates(directory);
  });

// --- 3. КОМАНДА ORGANIZE ---
program
  .command("organize <source-directory>")
  .requiredOption(
    "-o, --output <destination-directory>",
    "Target directory to output files",
  )
  .description("Organize files in directory by categories")
  .action((sourceDirectory, options) => {
    const destinationDirectory = options.output;

    console.log(`📦 Organizing: ${sourceDirectory}`);
    console.log(`Target: ${destinationDirectory}\n`);

    console.log("Creating folders...");
    const catNames = [
      "Documents",
      "Images",
      "Archives",
      "Code",
      "Videos",
      "Other",
    ];
    catNames.forEach((c) => console.log(`  ✓ ${c}/`));
    console.log();

    const organizer = new Organizer();

    organizer.on("copy-complete", ({ processedCount, totalFiles }) => {
      process.stdout.write(
        `\rCopying files... ${drawProgressBar(processedCount, totalFiles)}`,
      );
    });

    organizer.on(
      "organize-complete",
      ({ stats, totalFiles, totalSizeBytes }) => {
        console.log("\n\n✅ Organization complete!\nSummary:");

        Object.entries(stats).forEach(([cat, count]) => {
          const catName = (cat + ":").padEnd(10);
          const countStr = String(count).padStart(4);
          console.log(`  ${catName} ${countStr} files → Organized/${cat}/`);
        });

        console.log(
          `\nTotal copied: ${totalFiles} files (${formatBytes(totalSizeBytes)})`,
        );
      },
    );

    organizer.on("error", (err) => handleError(err, sourceDirectory));

    organizer.on("copy-error", (err) => handleError(err));

    organizer.organize(sourceDirectory, destinationDirectory);
  });

// --- 4. КОМАНДА CLEANUP ---
program
  .command("cleanup <directory>")
  .option("--older-than <days>", "Days to keep files", 90)
  .option("--confirm", "Force cleanup and delete files", false)
  .description("Cleanup old files in directory")
  .action((directory, options) => {
    const days = parseInt(options.olderThan, 10);
    const isConfirm = options.confirm;

    console.log(`🧹 Cleanup: ${directory}`);
    console.log(`Looking for files older than ${days} days...\n`);

    const cleanup = new Cleanup();

    cleanup.on("file-deleted", ({ processed, total }) => {
      process.stdout.write(
        `\rDeleting... ${drawProgressBar(processed, total)}`,
      );
    });

    cleanup.on("cleanup-complete", ({ deleted, files, totalSizeBytes }) => {
      if (files.length === 0) {
        console.log("✨ No old files found to delete.");
        return;
      }

      console.log(`Found ${files.length} files to delete:\n`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      const displayCount = 3;
      files.slice(0, displayCount).forEach((f) => {
        const dateStr = f.mtime.toISOString().split("T")[0];
        console.log(`${f.name}`);
        console.log(`  Size: ${formatBytes(f.size)}`);
        console.log(`  Modified: ${f.daysOld} days ago (${dateStr})\n`);
      });

      if (files.length > displayCount) {
        console.log(`... (${files.length - displayCount} more files)`);
      }
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(
        `Total: ${files.length} files (${formatBytes(totalSizeBytes)})\n`,
      );

      if (!deleted) {
        console.log("⚠️  DRY RUN MODE: No files were deleted.");
        console.log("To actually delete these files, run with --confirm flag.");
      } else {
        console.log(`\n✅ Cleanup complete!`);
        console.log(
          `Deleted: ${files.length} files (${formatBytes(totalSizeBytes)} freed)`,
        );
      }
    });

    cleanup.on("error", (err) => handleError(err, directory));

    cleanup.run(directory, days, isConfirm);
  });

program.parse();
