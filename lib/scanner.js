import fs from "fs/promises";
import path from "path";
import { EventEmitter } from "events";

export class Scanner extends EventEmitter {
  async _getAllFiles(dir) {
    let files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this._getAllFiles(fullPath)));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
    return files;
  }

  async scan(directory) {
    try {
      const files = await this._getAllFiles(directory);
      const totalFiles = files.length;

      let totalSizeBytes = 0;
      const extMap = new Map();
      const ageStats = { last7: 0, last30: 0, older90: 0 };
      const allFilesStats = [];

      const now = Date.now();
      const msInDay = 1000 * 60 * 60 * 24;
      let processedCount = 0;

      for (const file of files) {
        const stat = await fs.stat(file);
        const size = stat.size;
        const mtime = stat.mtime;
        const ext = path.extname(file).toLowerCase() || "(other)";
        const daysOld = Math.floor((now - mtime.getTime()) / msInDay);
        totalSizeBytes += size;
        if (!extMap.has(ext)) {
          extMap.set(ext, { count: 0, totalSize: 0 });
        }
        const extData = extMap.get(ext);
        extData.count++;
        extData.totalSize += size;

        if (daysOld <= 7) {
          ageStats.last7++;
        } else if (daysOld <= 30) {
          ageStats.last30++;
        }
        if (daysOld > 90) {
          ageStats.older90++;
        }

        allFilesStats.push({
          name: path.basename(file),
          size,
          mtime,
          daysOld,
        });

        processedCount++;

        this.emit("file-found", {
          processed: processedCount,
          total: totalFiles,
          currentFile: file,
        });
      }

      const largestFiles = [...allFilesStats]
        .sort((a, b) => b.size - a.size)
        .slice(0, 3);

      const oldestFile = [...allFilesStats].sort(
        (a, b) => a.mtime.getTime() - b.mtime.getTime(),
      )[0];

      const sortedExtensions = Array.from(extMap.entries()).sort(
        (a, b) => b[1].totalSize - a[1].totalSize,
      );

      this.emit("scan-complete", {
        totalFiles,
        totalSizeBytes,
        extensions: sortedExtensions,
        ageStats,
        largestFiles,
        oldestFile,
      });
    } catch (error) {
      this.emit("error", error);
    }
  }
}
