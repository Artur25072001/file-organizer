import fsPromises from "fs/promises";
import path from "path";
import { EventEmitter } from "events";

export class Cleanup extends EventEmitter {
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

  async run(directory, thresholdDays, isConfirm) {
    try {
      const files = await this._getAllFiles(directory);
      const filesToDelete = [];
      let totalSizeBytes = 0;

      for (const file of files) {
        const stat = await fsPromises.stat(file);
        const fileAgeMs = Date.now() - stat.mtime.getTime();
        const daysOld = fileAgeMs / (1000 * 60 * 60 * 24);

        if (daysOld > thresholdDays) {
          const fileData = {
            fullPath: file,
            name: path.basename(file),
            size: stat.size,
            daysOld: Math.floor(daysOld),
            mtime: stat.mtime,
          };

          filesToDelete.push(fileData);
          totalSizeBytes += stat.size;

          this.emit("file-found", fileData);
        }
      }

      if (!isConfirm) {
        this.emit("cleanup-complete", {
          deleted: false,
          files: filesToDelete,
          totalSizeBytes,
        });
        return;
      }
      let deletedCount = 0;
      for (const fileData of filesToDelete) {
        await fsPromises.unlink(fileData.fullPath);
        deletedCount++;

        this.emit("file-deleted", {
          processed: deletedCount,
          total: filesToDelete.length,
        });
      }

      this.emit("cleanup-complete", {
        deleted: true,
        files: filesToDelete,
        totalSizeBytes,
      });
    } catch (error) {
      this.emit("error", error);
    }
  }
}
