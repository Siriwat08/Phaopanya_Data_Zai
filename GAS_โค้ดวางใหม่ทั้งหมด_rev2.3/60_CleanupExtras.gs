/**
 * ============================================================================
 * Phaopanya MASTER Cleanup Suite — ไฟล์เสริม rev.2.1 (Task 51, 24-09-2026)
 * ไฟล์: 60_CleanupExtras.gs — ปิดความเสี่ยง 2 ข้อจากการตรวจรอบสุดท้าย (AI-pass)
 * ============================================================================
 * ★ ข้อ 4.1 — MATCH_KEY ที่ค้างอยู่ในชีต SOURCE (คอลัมน์ helper ท้ายชีต)
 *   ระบบปุ่ม 1 เขียน MD_LINK + MATCH_KEY กลับไปที่ SOURCE เพื่อกันนับซ้ำ
 *   เฟส 1b ย้าย key ใน MASTER — แต่ค่าใน SOURCE อาจยังเป็นรุ่นเก่า
 *   → เครื่องมือนี้ "ตรวจ" (อ่านอย่างเดียว) ให้เห็นว่ามีคอลัมน์แบบนั้น
 *   อยู่ที่ไหน เก็บค่าเก่าเท่าไหร่ และมีตัวเลือก "ซิงก์" เมื่อจำเป็นจริง
 *
 *   วิธีใช้ตามแผน 16 ขั้น (ขั้น 13.3): รัน "ตรวจ" 2 จุดเวลา —
 *     รอบ 1: ตอนติดตั้ง (ก่อนถึงวันเฟส 1b) = baseline
 *     รอบ 2: หลังเฟส 1b เสร็จ — ถ้าคอลัมน์ MATCH_KEY "ไม่ตรง" พุ่งขึ้น
 *            ตามจำนวน key ที่เปลี่ยน (~7,257) = มีค่าค้างจริง
 *            → ส่งผล 2 รอบกลับไปให้ผู้สร้างชุดอ่านก่อน แล้วค่อยตัดสิน
 *              ว่าจะรัน "ซิงก์" หรือไม่
 *
 * ★ ข้อ 4.5 — ธง DOC_ADDR_SUSPECT บนแถวที่อยู่พิมพ์ผิด (~269 แถว)
 *   ระหว่างรอทีม SCG แก้ต้นทาง (อาจใช้เวลาหลายเดือน) ใครดึงข้อมูลไป
 *   ออกเอกสารจะเห็นธง Y เตือนก่อน
 *   อ่านแท็บ P4_ที่อยู่พิมพ์ผิด (ต้องรันเฟส 4 ก่อน) → เขียน Y ในคอลัมน์
 *   ใหม่ DOC_ADDR_SUSPECT บน MASTER — ไม่แตะคอลัมน์เดิมแม้แต่ตัวอักษรเดียว
 *   รันซ้ำได้ (idempotent) · SCG แก้แล้ว → รันเฟส 4 ใหม่ + รันติดธงซ้ำ
 *   แถวที่หายไปจากรายงานล่าสุดจะถูกถอดธงให้เอง (auto-unmark)
 *
 * ★ ไฟล์นี้ "เพิ่มใหม่ทั้งไฟล์" — ไม่แก้ไฟล์ 50-59 ที่ผ่านทดสอบ 138/138
 *   ไม่อยากใช้ก็ลบทิ้งได้ ไม่กระทบชุดหลักแม้แต่บรรทัดเดียว
 *
 * ★ rev.2.2 (Task 56): การซิงก์ SOURCE (4.1b) และธง DOC_ADDR_SUSPECT (4.5/4.5b)
 *   ห่อด้วย audit run — ธงบน MASTER ถูกบันทึก field-level (ผ่าน hook)
 *   ส่วนการซิงก์ SOURCE เป็นชีตอื่น จบที่ CHANGE_LOG ระดับ run
 * ============================================================================
 */

/* ----------------------- ข้อ 4.1: ตรวจ SOURCE ----------------------- */

/** ชีตที่ไม่ตรวจ: MASTER / ดัชนี / พจนานุกรม / แท็บสำรอง-รายงานของชุดเราเอง */
function cxSkipSheet_(name) {
  if (name === CLEANUP_CFG.MASTER_SHEET) return true;
  if (name === CLEANUP_CFG.IDX_SHEET) return true;
  if (name === CLEANUP_CFG.GEO_SHEET) return true;
  if (/^(BK_|SYS_|CLEANUP_|P[0-9]|P_)/i.test(name)) return true;
  return false;
}

/** หัวคอลัมน์ที่เก็บ MATCH_KEY? */
function cxIsKeyCol_(h) { return /MATCH[\s_]*KEY/i.test(String(h || '')); }

/** หัวคอลัมน์ที่โยงกลับ MASTER (MD_LINK / MD_ID)? */
function cxIsLinkCol_(h) {
  return /(^|[^A-Za-z])(MD[\s_]*(LINK|ID))($|[^A-Za-z])/i.test(String(h || ''));
}

/**
 * ข้อ 4.1 — สแกนทุกชีต (ยกเว้นของชุดเราเอง) หาคอลัมน์ MATCH_KEY / MD_LINK
 * เทียบกับค่าปัจจุบันใน MASTER → รายงานแท็บ P_SRC_KEY_AUDIT
 * อ่านอย่างเดียว — ไม่เขียนอะไรกลับลงชีตข้อมูลเลย รันได้ทุกเมื่อ
 */
function cleanupSourceKeyAudit() {
  var t0 = new Date();
  var ctx = clLoadMaster_();
  var c = ctx.col;
  var keySet = {}, mdSet = {};
  for (var i = 0; i < ctx.nRows; i++) {
    var k = clStr_(ctx.values[i][c.MATCH_KEY]).trim();
    if (k) keySet[k] = true;
    var id = clStr_(ctx.values[i][c.MD_ID]).trim();
    if (id) mdSet[id] = true;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var report = [], helperCols = 0, scanned = 0;
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    if (cxSkipSheet_(sh.getName())) continue;
    if (sh.getLastRow() < 2 || sh.getLastColumn() < 1) continue;
    scanned++;
    var lastCol = sh.getLastColumn();
    var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    for (var h = 0; h < lastCol; h++) {
      var hd = String(headers[h] || '').trim();
      if (!hd) continue;
      var isKey = cxIsKeyCol_(hd), isLink = cxIsLinkCol_(hd);
      if (!isKey && !isLink) continue;
      helperCols++;
      var refSet = isKey ? keySet : mdSet;
      var vals = sh.getRange(2, h + 1, sh.getLastRow() - 1, 1).getValues();
      var nonEmpty = 0, match = 0, stale = 0, samples = [];
      for (var r = 0; r < vals.length; r++) {
        var v = clStr_(vals[r][0]).trim();
        if (!v) continue;
        nonEmpty++;
        if (refSet[v]) { match++; }
        else {
          stale++;
          if (samples.length < 3) {
            samples.push(v.length > 40 ? v.substring(0, 40) + '...' : v);
          }
        }
      }
      var a1 = sh.getRange(1, h + 1).getA1Notation().replace(/1$/, '');
      report.push([sh.getName(), a1, hd,
        isKey ? 'MATCH_KEY' : 'MD_LINK/MD_ID',
        nonEmpty, match, stale, samples.join(' | ')]);
    }
  }
  cleanupReportTab_('P_SRC_KEY_AUDIT', ['ชีต', 'คอลัมน์', 'หัวคอลัมน์', 'ชนิด',
    'ค่าไม่ว่าง', 'ตรงกับ MASTER ปัจจุบัน', 'ไม่ตรง (ค่าเก่า/กำพร้า)',
    'ตัวอย่างค่าที่ไม่ตรง'], report);
  var summary = { sheetsScanned: scanned, helperCols: helperCols,
    seconds: Math.round((new Date() - t0) / 1000) };
  cleanupLog_('x4.1', 'SOURCE_KEY_AUDIT', summary);
  cleanupToast_('ตรวจ SOURCE แล้ว: สแกน ' + scanned + ' ชีต พบคอลัมน์ helper ' +
    helperCols + ' จุด — ดูแท็บ P_SRC_KEY_AUDIT' +
    (helperCols === 0 ? ' (ไม่พบคอลัมน์ MATCH_KEY/MD_LINK ใน SOURCE เลย = ข้อ 4.1 ไม่มีปัญหา)' : ''));
  return summary;
}

/**
 * ข้อ 4.1b — ซิงก์ MATCH_KEY จาก MASTER ไปยังชีต SOURCE ที่มี MD_LINK/MD_ID
 * ใช้เมื่อ "หลังเฟส 1b" และตรวจแล้วพบค่าค้างจริงเท่านั้น
 *   อ่าน MD_LINK/MD_ID ของแต่ละแถว SOURCE → หา MD_ID ใน MASTER
 *   → เขียน MATCH_KEY ปัจจุบันทับค่าเก่า
 *   · สำรองแท็บ BK_SRC_* ก่อนแตะทุกชีต · รันซ้ำไม่เปลี่ยนอะไร (idempotent)
 *   · แถวที่ MD_LINK ว่าง/หาไม่เจอใน MASTER จะไม่ถูกแตะ
 */
function cleanupSourceKeyRefresh() {
  var t0 = new Date();
  var auditOn = typeof clAuditBegin_ === 'function';
  if (auditOn) {
    clAuditBegin_('4.1b', 'SOURCE_KEY_SYNC', 'MD_LINK_LOOKUP',
      'write current MASTER MATCH_KEY over stale SOURCE helper values', 'HIGH');
  }
  try {
    var ctx = clLoadMaster_();
  var c = ctx.col;
  var idToKey = {};
  for (var i = 0; i < ctx.nRows; i++) {
    var id = clStr_(ctx.values[i][c.MD_ID]).trim();
    var k = clStr_(ctx.values[i][c.MATCH_KEY]).trim();
    if (id && k) idToKey[id] = k;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var touched = [];
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    if (cxSkipSheet_(sh.getName())) continue;
    if (sh.getLastRow() < 2 || sh.getLastColumn() < 1) continue;
    var lastCol = sh.getLastColumn();
    var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var iLink = -1, iKey = -1;
    for (var h = 0; h < lastCol; h++) {
      var hd = String(headers[h] || '').trim();
      if (!hd) continue;
      if (iKey < 0 && cxIsKeyCol_(hd)) iKey = h;
      if (iLink < 0 && cxIsLinkCol_(hd)) iLink = h;
    }
    if (iKey < 0 || iLink < 0) continue; // ต้องมีทั้งคู่ในชีตเดียวกันจึงซิงก์ได้
    var nRows = sh.getLastRow() - 1;
    var links = sh.getRange(2, iLink + 1, nRows, 1).getValues();
    var keys = sh.getRange(2, iKey + 1, nRows, 1).getValues();
    var changed = 0;
    for (var r = 0; r < nRows; r++) {
      var id = clStr_(links[r][0]).trim();
      var want = id ? idToKey[id] : '';
      if (want && want !== clStr_(keys[r][0]).trim()) {
        keys[r][0] = want;
        changed++;
      }
    }
    if (changed > 0) {
      var bk = clBackupTabByName_(sh.getName(), 'BK_SRC_');
      sh.getRange(2, iKey + 1, nRows, 1).setValues(keys);
      touched.push(sh.getName() + ' (' + changed + ' ค่า' +
        (bk ? ' · สำรอง ' + bk.name : '') + ')');
    }
  }
  var summary = { touched: touched, seconds: Math.round((new Date() - t0) / 1000) };
  if (auditOn) {
    clAuditEnd_('COMPLETED', { touchedSheets: touched.length });
  }
  cleanupLog_('x4.1', 'SOURCE_KEY_REFRESH', summary);
  cleanupToast_(touched.length ?
    'ซิงก์ SOURCE เรียบร้อย: ' + touched.join(' · ') :
    'ไม่มีค่าที่ต้องซิงก์ — ทุกชีตตรงกับ MASTER อยู่แล้ว');
  return summary;
  } catch (e) {
    if (auditOn) {
      try { clAuditFail_(e, 'BACKUP_AVAILABLE'); } catch (eAudit) {}
    }
    throw e;
  }
}

/* ----------------------- ข้อ 4.5: ธง DOC_ADDR_SUSPECT ----------------------- */

/**
 * ติดธง DOC_ADDR_SUSPECT=Y บนแถว MASTER ที่อยู่ในแท็บ P4_ที่อยู่พิมพ์ผิด
 * (ต้องรันเฟส 4 ก่อน) — เขียนเฉพาะคอลัมน์ใหม่ DOC_ADDR_SUSPECT
 * แถวที่เคย Y แต่ไม่อยู่ในรายงานล่าสุด = SCG แก้แล้ว → ถอดธงให้เอง
 */
function cleanupMarkDocSuspect() {
  var t0 = new Date();
  var tab = cleanupReadReportTab_('P4_ที่อยู่พิมพ์ผิด');
  if (!tab) throw new Error('ไม่พบแท็บ P4_ที่อยู่พิมพ์ผิด — รันเฟส 4 (แพ็กเกจ SCG) ก่อน');
  var iMd = tab.headers.indexOf('MD_ID');
  if (iMd < 0) throw new Error('แท็บ P4_ที่อยู่พิมพ์ผิด ไม่มีคอลัมน์ MD_ID — ตรวจแท็บ');
  var want = {};
  for (var i = 0; i < tab.rows.length; i++) {
    var id = clStr_(tab.rows[i][iMd]).trim();
    if (id) want[id] = true;
  }
  if (tab.rows.length === 0) throw new Error('แท็บ P4_ที่อยู่พิมพ์ผิด ว่าง — ไม่มีแถวให้ติดธง');

  var auditOn = typeof clAuditBegin_ === 'function';
  if (auditOn) {
    clAuditBegin_('4.5', 'FLAG_DOC_ADDR_SUSPECT', 'P4_DOCSIDE_LIST',
      'doc-side wrong-address rows flagged Y for downstream doc users', 'MEDIUM');
  }
  try {
    var ctx = clLoadMaster_();
  var c = ctx.col;
  // หาคอลัมน์ DOC_ADDR_SUSPECT ถ้าไม่มี → สร้างต่อท้าย (ไม่แตะคอลัมน์เดิม)
  var lastCol = ctx.sheet.getLastColumn();
  var headers = ctx.sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var target = -1;
  for (var h = 0; h < headers.length; h++) {
    if (String(headers[h] || '').trim() === 'DOC_ADDR_SUSPECT') { target = h; break; }
  }
  if (target < 0) {
    var maxC = ctx.sheet.getMaxColumns();
    var pos = lastCol + 1; // ตำแหน่ง 1-based ของคอลัมน์ใหม่
    if (maxC < pos) ctx.sheet.insertColumnsAfter(maxC, pos - maxC);
    ctx.sheet.getRange(1, pos).setValue('DOC_ADDR_SUSPECT').setFontWeight('bold');
    target = pos - 1; // กลับเป็น index 0-based ใช้กับ clWriteColumn_
  }
  var existing = ctx.sheet.getRange(2, target + 1, ctx.nRows, 1).getValues();
  // ★ rev.2.2: ซิงก์ ctx ให้เห็นค่าเดิมของคอลัมน์ธง (audit บันทึก OLD ถูกต้อง
  //   และรันซ้ำไม่เกิดรายการ audit ซ้ำ เพราะค่าคงเดิม = ไม่บันทึก)
  if (ctx.headers.length <= target) ctx.headers[target] = 'DOC_ADDR_SUSPECT';
  for (var r2 = 0; r2 < ctx.nRows; r2++) {
    while (ctx.values[r2].length <= target) ctx.values[r2].push('');
    ctx.values[r2][target] = existing[r2][0];
  }
  var out = new Array(ctx.nRows);
  var newly = 0, kept = 0, cleared = 0;
  for (var r = 0; r < ctx.nRows; r++) {
    var id = clStr_(ctx.values[r][c.MD_ID]).trim();
    var cur = clStr_(existing[r][0]).trim();
    if (want[id]) {
      out[r] = 'Y';
      if (cur === 'Y') kept++; else newly++;
    } else {
      if (cur === 'Y') cleared++; // เคยติดธง แต่ไม่อยู่ในรายงานล่าสุด = แก้แล้ว
      out[r] = (cur === 'Y') ? '' : cur; // คงค่าอื่น (ถ้ามี) ไว้ ไม่ทับ
    }
  }
  clWriteColumn_(ctx, target, out);
  var summary = { flagged: newly + kept, newlyFlagged: newly, keptFlagged: kept,
    autoUnflagged: cleared, seconds: Math.round((new Date() - t0) / 1000) };
  if (auditOn) {
    var st = clAuditStats_();
    summary.fieldsChanged = st ? st.fieldsChanged : 0;
    clAuditEnd_('COMPLETED', summary);
  }
  cleanupLog_('x4.5', 'MARK_DOC_SUSPECT', summary);
  cleanupToast_('ธง DOC_ADDR_SUSPECT: ติดใหม่ ' + newly + ' · คงเดิม ' + kept +
    (cleared ? ' · ถอดอัตโนมัติ ' + cleared + ' (SCG แก้แล้ว)' : '') +
    ' — รวม ' + (newly + kept) + ' แถว');
  return summary;
  } catch (e) {
    if (auditOn) {
      try { clAuditFail_(e, 'BACKUP_AVAILABLE'); } catch (eAudit) {}
    }
    throw e;
  }
}

/** ล้างธง DOC_ADDR_SUSPECT ทั้งหมด (คืนค่าว่างทั้งคอลัมน์) */
function cleanupUnmarkDocSuspect() {
  var auditOn = typeof clAuditBegin_ === 'function';
  if (auditOn) {
    clAuditBegin_('4.5b', 'UNFLAG_DOC_ADDR_SUSPECT', 'MANUAL_CLEAR',
      'clear all DOC_ADDR_SUSPECT flags to empty', 'HIGH');
  }
  try {
    var ctx = clLoadMaster_();
    var lastCol = ctx.sheet.getLastColumn();
    var headers = ctx.sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var target = -1;
    for (var h = 0; h < headers.length; h++) {
      if (String(headers[h] || '').trim() === 'DOC_ADDR_SUSPECT') { target = h; break; }
    }
    if (target < 0) throw new Error('ยังไม่มีคอลัมน์ DOC_ADDR_SUSPECT — ยังไม่เคยติดธง');
    // ★ rev.2.2: ซิงก์ ctx กับค่าเดิม (audit บันทึก OLD ถูกต้อง)
    var existing = ctx.sheet.getRange(2, target + 1, ctx.nRows, 1).getValues();
    if (ctx.headers.length <= target) ctx.headers[target] = 'DOC_ADDR_SUSPECT';
    for (var r2 = 0; r2 < ctx.nRows; r2++) {
      while (ctx.values[r2].length <= target) ctx.values[r2].push('');
      ctx.values[r2][target] = existing[r2][0];
    }
    var blank = new Array(ctx.nRows);
    for (var r = 0; r < ctx.nRows; r++) blank[r] = '';
    clWriteColumn_(ctx, target, blank);
    if (auditOn) {
      var st = clAuditStats_();
      clAuditEnd_('COMPLETED', { rows: ctx.nRows,
        fieldsChanged: st ? st.fieldsChanged : 0 });
    }
    cleanupLog_('x4.5', 'UNMARK_DOC_SUSPECT', { rows: ctx.nRows });
    cleanupToast_('ล้างธง DOC_ADDR_SUSPECT ทั้งหมดแล้ว (' + ctx.nRows + ' แถว)');
    return { cleared: ctx.nRows };
  } catch (e) {
    if (auditOn) {
      try { clAuditFail_(e, 'BACKUP_AVAILABLE'); } catch (eAudit) {}
    }
    throw e;
  }
}

/* ----------------------- เมนู + ตัวต่อ UI ----------------------- */

/**
 * สร้างเมนู "CLEANUP EXTRAS r2" — เพิ่ม 1 บรรทัดใน onOpen ของ 03_Menu.gs
 * (วางต่อจากบรรทัด addCleanupMenu_() ที่วางไว้แล้ว — ห้ามสร้าง onOpen ซ้ำ):
 *     try { addCleanupExtrasMenu_(); } catch (e) { Logger.log(e); }
 * หรือรัน addCleanupExtrasMenu_() เองจากเอดิตอร์ก็ได้ (อยู่ถึงปิดไฟล์)
 */
function addCleanupExtrasMenu_() {
  SpreadsheetApp.getUi()
    .createMenu('CLEANUP EXTRAS r2')
    .addItem('4.1 ตรวจ MATCH_KEY ค้างใน SOURCE (อ่านอย่างเดียว)', 'uiCleanupSourceKeyAudit')
    .addItem('4.1b ซิงก์ key จาก MASTER → SOURCE (ใช้หลัง 1b เท่านั้น)', 'uiCleanupSourceKeyRefresh')
    .addSeparator()
    .addItem('4.5 ติดธง DOC_ADDR_SUSPECT ตามแท็บ P4', 'uiCleanupMarkDocSuspect')
    .addItem('4.5b ล้างธง DOC_ADDR_SUSPECT ทั้งหมด', 'uiCleanupUnmarkDocSuspect')
    .addToUi();
}

function uiCleanupSourceKeyAudit() {
  try {
    cleanupWithLock_(function () { return cleanupSourceKeyAudit(); });
  } catch (e) {
    try { SpreadsheetApp.getUi().alert('ตรวจ SOURCE ผิดพลาด: ' + e.message); } catch (e2) {}
  }
}

function uiCleanupSourceKeyRefresh() {
  try {
    cleanupWithLock_(function () {
      var msg = 'ซิงก์ MATCH_KEY จาก MASTER ไปยังชีต SOURCE\n\n' +
        'ใช้เมื่อ: รัน "4.1 ตรวจ" หลังเฟส 1b แล้วพบค่าไม่ตรงจำนวนมากเท่านั้น\n\n' +
        'การทำงาน: อ่าน MD_LINK/MD_ID ของแต่ละแถว SOURCE\n' +
        '→ เขียน MATCH_KEY ปัจจุบันของ MASTER ทับค่าเก่า\n' +
        '→ สำรองแท็บ BK_SRC_* ก่อนแตะทุกชีต · รันซ้ำไม่เปลี่ยนอะไร\n\n' +
        '★ ถ้ายังไม่มั่นใจ ส่งแท็บ P_SRC_KEY_AUDIT ให้ผู้สร้างชุดอ่านก่อน\n\nยืนยัน?';
      if (!cleanupConfirm_('ซิงก์ key MASTER → SOURCE', msg)) return 'ยกเลิก';
      return cleanupSourceKeyRefresh();
    });
  } catch (e) {
    try { SpreadsheetApp.getUi().alert('ซิงก์ SOURCE ผิดพลาด: ' + e.message); } catch (e2) {}
  }
}

function uiCleanupMarkDocSuspect() {
  try {
    cleanupWithLock_(function () {
      var msg = 'ติดธง DOC_ADDR_SUSPECT=Y บนแถวที่อยู่พิมพ์ผิด (ตามแท็บ P4)\n\n' +
        '· เขียนเฉพาะคอลัมน์ใหม่ DOC_ADDR_SUSPECT — ไม่แตะคอลัมน์เดิม\n' +
        '· แถวที่เคย Y แต่หายจากรายงานล่าสุด = SCG แก้แล้ว → ถอดธงให้\n' +
        '· รันซ้ำได้ (idempotent)\n\nยืนยัน?';
      if (!cleanupConfirm_('ติดธง DOC_ADDR_SUSPECT', msg)) return 'ยกเลิก';
      return cleanupMarkDocSuspect();
    });
  } catch (e) {
    try { SpreadsheetApp.getUi().alert('ติดธงผิดพลาด: ' + e.message); } catch (e2) {}
  }
}

function uiCleanupUnmarkDocSuspect() {
  try {
    cleanupWithLock_(function () {
      if (!cleanupConfirm_('ล้างธง DOC_ADDR_SUSPECT',
          'ล้าง Y ทั้งคอลัมน์ DOC_ADDR_SUSPECT เป็นค่าว่าง\n\nยืนยัน?')) return 'ยกเลิก';
      return cleanupUnmarkDocSuspect();
    });
  } catch (e) {
    try { SpreadsheetApp.getUi().alert('ล้างธงผิดพลาด: ' + e.message); } catch (e2) {}
  }
}
