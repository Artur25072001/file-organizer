import fsPromises from "fs/promises";
import fs from "fs"; // Звичайний fs потрібен для stream'ів
import path from "path";
import { EventEmitter } from "events";
import { pipeline } from "stream/promises";

export class Organizer extends EventEmitter {
  async _getAllFiles(dir) {
    let files = [];
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });

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

  async _getUniqueFilePath(targetDir, fileName) {
    let currentPath = path.join(targetDir, fileName);
    let counter = 1;
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);

    while (true) {
      try {
        await fsPromises.access(currentPath);
        currentPath = path.join(targetDir, `${base}(${counter})${ext}`);
        counter++;
      } catch (err) {
        return currentPath;
      }
    }
  }

  async organize(sourceDirectory, destinationDirectory) {
    try {
      const categories = {
        Documents: [".pdf", ".docx", ".doc", ".txt", ".md", ".xlsx", ".pptx"],
        Images: [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"],
        Archives: [".zip", ".rar", ".tar", ".gz", ".7z"],
        Code: [".js", ".py", ".java", ".cpp", ".html", ".css", ".json"],
        Videos: [".mp4", ".avi", ".mkv", ".mov", ".webm"],
        Other: [],
      };

      const files = await this._getAllFiles(sourceDirectory);
      const totalFiles = files.length;
      let totalSizeBytes = 0;
      let processedCount = 0;

      const stats = {
        Documents: 0,
        Images: 0,
        Archives: 0,
        Code: 0,
        Videos: 0,
        Other: 0,
      };

      await fsPromises.mkdir(destinationDirectory, { recursive: true });
      for (const category of Object.keys(categories)) {
        await fsPromises.mkdir(path.join(destinationDirectory, category), {
          recursive: true,
        });
      }

      for (const file of files) {
        const stat = await fsPromises.stat(file);
        const size = stat.size;
        totalSizeBytes += size;

        const ext = path.extname(file).toLowerCase();

        let targetCategory = "Other";
        for (const [cat, extensions] of Object.entries(categories)) {
          if (extensions.includes(ext)) {
            targetCategory = cat;
            break;
          }
        }

        stats[targetCategory]++;

        this.emit("copy-start", {
          processedCount: processedCount + 1,
          totalFiles,
        });

        const fileName = path.basename(file);
        const targetDir = path.join(destinationDirectory, targetCategory);

        const destinationPath = await this._getUniqueFilePath(
          targetDir,
          fileName,
        );

        try {
          const tenMB = 10 * 1024 * 1024;

          if (size < tenMB) {
            await fsPromises.copyFile(file, destinationPath);
          } else {
            await pipeline(
              fs.createReadStream(file),
              fs.createWriteStream(destinationPath),
            );
          }

          processedCount++;
          this.emit("copy-complete", { processedCount, totalFiles });
        } catch (copyErr) {
          this.emit("copy-error", copyErr);
        }
      }

      this.emit("organize-complete", { stats, totalFiles, totalSizeBytes });
    } catch (error) {
      console.error("Critical error during organizing:", error);
    }
  }
}
