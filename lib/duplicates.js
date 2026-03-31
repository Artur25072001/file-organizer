import crypto from "crypto";
import fs from "fs";
import fsPromises from "fs/promises"; // Використовуємо promises для readdir та stat
import path from "path";
import { EventEmitter } from "events";

export class ScannerDuplicates extends EventEmitter {
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

  async findDuplicates(directory) {
    try {
      const files = await this._getAllFiles(directory);
      const totalFiles = files.length;
      const duplicatesMap = new Map();
      let processedCount = 0;

      for (const file of files) {
        const hash = await this.calculateHash(file);
        const stat = await fsPromises.stat(file);
        const size = stat.size;

        if (duplicatesMap.has(hash)) {
          duplicatesMap.get(hash).paths.push(file);
        } else {
          duplicatesMap.set(hash, { paths: [file], size: size });
        }

        processedCount++;
        this.emit("file-processed", { processedCount, totalFiles });
      }

      const finalDuplicates = [];
      let totalWastedSpaceBytes = 0;

      for (const [hash, data] of duplicatesMap.entries()) {
        if (data.paths.length > 1) {
          const copiesCount = data.paths.length;
          const wastedSpace = data.size * (copiesCount - 1);
          totalWastedSpaceBytes += wastedSpace;

          finalDuplicates.push({
            hash,
            paths: data.paths,
            singleSize: data.size,
            wastedSpace: wastedSpace,
          });
        }
      }

      this.emit("duplicates-found", {
        groups: finalDuplicates,
        totalWastedSpace: totalWastedSpaceBytes,
      });
    } catch (error) {
      this.emit("error", error);
    }
  }

  calculateHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);

      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", reject);
    });
  }
}
