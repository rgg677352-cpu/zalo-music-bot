import { storage, sizeLabel } from '../src/storage.mjs';
import { cacheCleanMessage } from '../src/maintenance.mjs';
try {
  if (process.argv.includes('--clean')) {
    const result = await storage.sweep();
    console.log(`Đã dọn ${result.removed} thư mục tạm, ${sizeLabel(result.bytes)}; giữ lại ${result.skipped} mục đang dùng/chưa đủ điều kiện.`);
    if (result.cache) console.log(cacheCleanMessage(result.cache));
  }
  const u = await storage.usage();
  for (const c of u.categories) console.log(`${c.label}: ${c.partial ? 'ít nhất ' : ''}${sizeLabel(c.bytes)}`);
  console.log(`Tác vụ đang giữ file: ${u.activeJobs}; RAM Node: ${sizeLabel(u.nodeRSS)}.`);
} catch { console.error('Không đọc/dọn được thư mục tạm; kiểm tra quyền ghi và dung lượng host. Không xóa phiên Zalo.'); process.exitCode = 1; }
