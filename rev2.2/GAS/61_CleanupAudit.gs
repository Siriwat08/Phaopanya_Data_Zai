/**
 * ============================================================================
 * Phaopanya MASTER Cleanup Suite — rev.2.2 (Task 56, 2026-09-29)
 * ไฟล์: 61_CleanupAudit.gs — Change Governance / Field-level Audit
 * ============================================================================
 * พอร์ตจากไอเดีย "Controlled Master Data Remediation" (ชุดตรวจ 29-09) เข้ามา
 * ยืนบนชุด rev.2.1 ของเรา — ไม่แทนที่ไฟล์ 51/53/54/55/58 แบบชุดต้นฉบับ
 * (เลขไฟล์ 61 เพราะ 59 = เฟส 1b และ 60 = Extras ของเราถูกใช้ไปแล้ว)
 *
 * หลักการ:
 *   - CHANGE_LOG   = 1 record ต่อ execution/run (STARTED/COMPLETED/FAILED)
 *   - CLEANUP_AUDIT = 1 record ต่อ "ฟิลด์ที่เปลี่ยนจริง" (dry-run ไม่เขียน)
 *   - RUN_ID เดียวกันใช้ trace จาก run → field → rollback ได้ทั้งสาย
 *   - ทุก mutation ที่ผ่าน clWriteColumn_ ถูก audit อัตโนมัติ (hook ใน 51)
 *   - การ merge/delete แถว (เฟส 1c) ใช้ clAuditRecordDelete_ เก็บ snapshot
 *   - แท็บ CLEANUP_LOG เดิมยังอยู่ครบ — เป็นคนละระดับกับสองแท็บนี้
 *
 * ★ ข้อต่างจากต้นฉบับที่ตั้งใจแก้ (เหตุผลจาก code review Task 56):
 *   1) ไม่ใช้ LockService ใน clAuditNextRunId_ — ชุดนี้ทุกปุ่มรันผ่าน
 *      cleanupWithLock_ ซึ่ง "ถือสคริปต์ล็อกค้างไว้" ระหว่างเฟสทำงาน
 *      ถ้า audit ขอ waitLock ซ้ำใน execution เดียวกันจะติดตาย (lock ไม่ reentrant)
 *      → ใช้ ScriptProperties อย่างเดียว (การรันถูก cleanupWithLock_ อนุกรมอยู่แล้ว)
 *   2) ไม่ใช้ padStart — เขียน zero-pad มือ เพื่อรองรับ runtime เก่า (Rhino)
 *   3) RUN_ID ยังรูปเดิม CLN-YYYYMMDD-NNN ใช้ค้นเชื่อมกับ CHANGE_LOG ได้
 *
 * การติดตั้ง: สร้างไฟล์ใหม่ชื่อ 61_CleanupAudit.gs วางโค้ดนี้ กดบันทึก
 *   แล้วรันเมนู CLEANUP MASTER → "ติดตั้ง/ตรวจ CHANGE_LOG + CLEANUP_AUDIT" 1 ครั้ง
 *   (หรือรัน setupCleanupAudit_ จากเอดิเตอร์)
 *   ★ ถ้าไม่ติดตั้งไฟล์นี้ — ชุด 50-60 ยังทำงานได้ปกติทุกเฟส (audit จะเงียบไป)
 * ============================================================================
 */

var CL_AUDIT_CFG = {
  CHANGE_LOG_SHEET: 'CHANGE_LOG',
  AUDIT_SHEET: 'CLEANUP_AUDIT',
  OPERATOR: '', // ว่าง = email ของผู้รัน ถ้าระบบอนุญาตให้อ่านได้
  MAX_VALUE_LEN: 2000
};

var CL_AUDIT_CTX = null;

function clAuditNow_() { return new Date(); }

function clAuditOperator_() {
  if (CL_AUDIT_CFG.OPERATOR) return CL_AUDIT_CFG.OPERATOR;
  try { return Session.getActiveUser().getEmail() || 'SYSTEM'; }
  catch (e) { return 'SYSTEM'; }
}

/** แปลงค่าเป็นข้อความสำหรับบันทึก audit (Date → ISO, ตัดยาวเกิน 2,000) */
function clAuditValue_(v) {
  if (v === null || v === undefined) return '';
  var s;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    s = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  } else if (typeof v === 'object') {
    try { s = JSON.stringify(v); } catch (e) { s = String(v); }
  } else {
    s = String(v);
  }
  if (s.length > CL_AUDIT_CFG.MAX_VALUE_LEN) {
    return s.substring(0, CL_AUDIT_CFG.MAX_VALUE_LEN) + '…[TRUNCATED]';
  }
  return s;
}

/** หา/สร้างแท็บ audit + หัวคอลัมน์มาตรฐาน (ตัวหนา + ตรึงแถวหัว) */
function clAuditEnsureSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var current = sh.getLastColumn() > 0
    ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
  var needs = current.length !== headers.length;
  if (!needs) {
    for (var i = 0; i < headers.length; i++) {
      if (String(current[i] || '') !== headers[i]) { needs = true; break; }
    }
  }
  if (needs) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#eeeeee');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** RUN_ID รูป CLN-YYYYMMDD-NNN — ★ ไม่ใช้ LockService (ดูหัวไฟล์ ข้อ 1) */
function clAuditNextRunId_() {
  var day = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var seq = 1;
  try {
    var props = PropertiesService.getScriptProperties();
    var oldDay = props.getProperty('CLEANUP_AUDIT_RUN_DAY');
    seq = oldDay === day
      ? parseInt(props.getProperty('CLEANUP_AUDIT_RUN_SEQ') || '0', 10) + 1 : 1;
    props.setProperty('CLEANUP_AUDIT_RUN_DAY', day);
    props.setProperty('CLEANUP_AUDIT_RUN_SEQ', String(seq));
  } catch (e) {
    // ไม่มี PropertiesService (mock/สภาพแวดล้อมพิเศษ) — ใช้เวลาวินาทีแทน
    seq = parseInt(Utilities.formatDate(new Date(),
      Session.getScriptTimeZone(), 'HHmmss'), 10) % 100000;
  }
  var s = String(seq);
  while (s.length < 3) s = '0' + s;
  return 'CLN-' + day + '-' + s;
}

/** เริ่ม audit run — เขียน STARTED ลง CHANGE_LOG (คืน RUN_ID) */
function clAuditBegin_(phase, action, reason, evidence, confidence) {
  if (CL_AUDIT_CTX) throw new Error('มี CLEANUP_AUDIT run อยู่แล้ว: ' + CL_AUDIT_CTX.runId);
  var runId = clAuditNextRunId_();
  var now = clAuditNow_();
  CL_AUDIT_CTX = {
    runId: runId,
    phase: String(phase),
    action: action || 'CLEANUP',
    reason: reason || '',
    evidence: evidence || '',
    confidence: confidence || '',
    operator: clAuditOperator_(),
    startedAt: now,
    rowsChanged: 0,
    fieldsChanged: 0,
    recordsChanged: 0,
    rollbackStatus: 'BACKUP_AVAILABLE',
    pendingAuditRows: []
  };
  var sh = clAuditEnsureSheet_(CL_AUDIT_CFG.CHANGE_LOG_SHEET,
    ['RUN_ID', 'TIMESTAMP', 'PHASE', 'STATUS', 'ACTION', 'SUMMARY', 'OPERATOR',
     'RECORDS_CHANGED', 'ROLLBACK_STATUS']);
  sh.appendRow([runId, now, String(phase), 'STARTED', action || 'CLEANUP',
    JSON.stringify({ reason: reason || '', evidence: evidence || '',
      confidence: confidence || '' }),
    CL_AUDIT_CTX.operator, 0, 'PENDING']);
  return runId;
}

/** ปรับบริบทของ run ปัจจุบัน (เช่น เปลี่ยน action กลางทาง) */
function clAuditSetContext_(patch) {
  if (!CL_AUDIT_CTX) return;
  patch = patch || {};
  for (var k in patch) if (patch[k] !== undefined) CL_AUDIT_CTX[k] = patch[k];
}

/** แนบหลักฐานเฉพาะแถว (ใช้ก่อน clWriteColumn_ — hook จะอ่านตอนบันทึก) */
function clAuditSetRowEvidence_(rowIdx0, obj) {
  if (!CL_AUDIT_CTX) return;
  if (!CL_AUDIT_CTX.rowEvidence) CL_AUDIT_CTX.rowEvidence = {};
  CL_AUDIT_CTX.rowEvidence[rowIdx0] = obj || {};
}

/** บันทึก field เปลี่ยน 1 รายการ (เรียกจาก hook ใน clWriteColumn_ หรือมือ) */
function clAuditField_(ctx, rowIdx0, colIdx0, oldValue, newValue, override) {
  if (!CL_AUDIT_CTX) return;
  var oldS = clAuditValue_(oldValue), newS = clAuditValue_(newValue);
  if (oldS === newS) return; // บันทึกเฉพาะที่เปลี่ยนจริง
  override = override || {};
  var rowEv = (CL_AUDIT_CTX.rowEvidence && CL_AUDIT_CTX.rowEvidence[rowIdx0]) || {};
  var mdId = '';
  try { mdId = clStr_(ctx.values[rowIdx0][ctx.col.MD_ID]); } catch (e) { mdId = ''; }
  var field = ctx.headers[colIdx0] || ('COL_' + (colIdx0 + 1));
  CL_AUDIT_CTX.pendingAuditRows.push([
    CL_AUDIT_CTX.runId, clAuditNow_(), CL_AUDIT_CTX.phase, mdId, field,
    oldS, newS,
    override.reason !== undefined ? override.reason : (rowEv.reason || CL_AUDIT_CTX.reason),
    override.evidence !== undefined ? override.evidence : (rowEv.evidence || CL_AUDIT_CTX.evidence),
    override.confidence !== undefined ? override.confidence : (rowEv.confidence || CL_AUDIT_CTX.confidence),
    override.action !== undefined ? override.action : (rowEv.action || CL_AUDIT_CTX.action),
    override.operator !== undefined ? override.operator : CL_AUDIT_CTX.operator,
    override.rollbackStatus || CL_AUDIT_CTX.rollbackStatus || 'BACKUP_AVAILABLE'
  ]);
  CL_AUDIT_CTX.fieldsChanged++;
  CL_AUDIT_CTX.recordsChanged++;
}

/** บันทึกการลบแถว (เฟส 1c) — เก็บ snapshot ทั้งแถวไว้ใน OLD_VALUE */
function clAuditRecordDelete_(ctx, rowIdx0, reason, evidence, confidence, operator) {
  if (!CL_AUDIT_CTX) return;
  var mdId = clStr_(ctx.values[rowIdx0][ctx.col.MD_ID]);
  var snapshot = {};
  for (var c = 0; c < ctx.headers.length; c++) {
    snapshot[ctx.headers[c]] = clAuditValue_(ctx.values[rowIdx0][c]);
  }
  CL_AUDIT_CTX.pendingAuditRows.push([CL_AUDIT_CTX.runId, clAuditNow_(),
    CL_AUDIT_CTX.phase, mdId, '__ROW__',
    clAuditValue_(snapshot), '',
    reason || 'MERGE_DELETE', evidence || '', confidence || 'HIGH',
    'DELETE', operator || CL_AUDIT_CTX.operator,
    CL_AUDIT_CTX.rollbackStatus || 'BACKUP_AVAILABLE']);
  CL_AUDIT_CTX.recordsChanged++;
}

/** เขียน audit ที่สะสมไว้ลงชีตแบบแบตช์ (ไม่ใช้ appendRow ทีละแถว) */
function clAuditFlush_() {
  if (!CL_AUDIT_CTX || !CL_AUDIT_CTX.pendingAuditRows ||
      !CL_AUDIT_CTX.pendingAuditRows.length) return 0;
  var sh = clAuditEnsureSheet_(CL_AUDIT_CFG.AUDIT_SHEET,
    ['RUN_ID', 'TIMESTAMP', 'PHASE', 'MD_ID', 'FIELD', 'OLD_VALUE', 'NEW_VALUE',
     'REASON', 'EVIDENCE', 'CONFIDENCE', 'ACTION', 'OPERATOR', 'ROLLBACK_STATUS']);
  var rows = CL_AUDIT_CTX.pendingAuditRows;
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, 13).setValues(rows);
  CL_AUDIT_CTX.pendingAuditRows = [];
  return rows.length;
}

/** จบ run — flush ค้าง + เขียน COMPLETED/FAILED ลง CHANGE_LOG */
function clAuditEnd_(status, summary, rollbackStatus) {
  if (!CL_AUDIT_CTX) return;
  clAuditFlush_();
  var ctx = CL_AUDIT_CTX;
  var sh = clAuditEnsureSheet_(CL_AUDIT_CFG.CHANGE_LOG_SHEET,
    ['RUN_ID', 'TIMESTAMP', 'PHASE', 'STATUS', 'ACTION', 'SUMMARY', 'OPERATOR',
     'RECORDS_CHANGED', 'ROLLBACK_STATUS']);
  sh.appendRow([ctx.runId, clAuditNow_(), ctx.phase, status || 'COMPLETED',
    ctx.action,
    JSON.stringify(summary || { fieldsChanged: ctx.fieldsChanged }),
    ctx.operator, ctx.recordsChanged || 0, rollbackStatus || 'PENDING']);
  CL_AUDIT_CTX = null;
}

/** จบ run แบบล้มเหลว — บันทึก error ลง CHANGE_LOG แล้วปิด context */
function clAuditFail_(error, rollbackStatus) {
  if (!CL_AUDIT_CTX) return;
  try { clAuditFlush_(); } catch (e) { /* flush ล้ม = ปล่อยผ่าน เพื่อบันทึก FAILED */ }
  var ctx = CL_AUDIT_CTX;
  var sh = clAuditEnsureSheet_(CL_AUDIT_CFG.CHANGE_LOG_SHEET,
    ['RUN_ID', 'TIMESTAMP', 'PHASE', 'STATUS', 'ACTION', 'SUMMARY', 'OPERATOR',
     'RECORDS_CHANGED', 'ROLLBACK_STATUS']);
  sh.appendRow([ctx.runId, clAuditNow_(), ctx.phase, 'FAILED', ctx.action,
    JSON.stringify({ error: error && error.message ? error.message : String(error),
      fieldsChanged: ctx.fieldsChanged }),
    ctx.operator, ctx.recordsChanged || 0, rollbackStatus || 'UNKNOWN']);
  CL_AUDIT_CTX = null;
}

/** ตัวสถิติของ run ปัจจุบัน (ใช้สร้าง summary ก่อน clAuditEnd_) */
function clAuditStats_() {
  if (!CL_AUDIT_CTX) return null;
  return { fieldsChanged: CL_AUDIT_CTX.fieldsChanged,
    recordsChanged: CL_AUDIT_CTX.recordsChanged };
}

/* ----------------------- ค้นประวัติ / ติดตั้ง ----------------------- */

/** ค้นแถว CLEANUP_AUDIT ทั้งหมดของ MD_ID หนึ่ง ๆ */
function clAuditQueryByMdId_(mdId) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CL_AUDIT_CFG.AUDIT_SHEET);
  if (!sh || sh.getLastRow() < 2) return [];
  var vals = sh.getDataRange().getValues();
  var out = [];
  var idx = vals[0].indexOf('MD_ID');
  if (idx < 0) return out;
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][idx] || '') === String(mdId)) out.push(vals[i]);
  }
  return out;
}

/**
 * ใช้หลังติดตั้งเพื่อสร้าง/ตรวจแท็บ CHANGE_LOG + CLEANUP_AUDIT
 * (รัน 1 ครั้ง — หลังจากนี้ทุกเฟสทำจริงจะบันทึก audit เองอัตโนมัติ)
 */
function setupCleanupAudit_() {
  clAuditEnsureSheet_(CL_AUDIT_CFG.CHANGE_LOG_SHEET,
    ['RUN_ID', 'TIMESTAMP', 'PHASE', 'STATUS', 'ACTION', 'SUMMARY', 'OPERATOR',
     'RECORDS_CHANGED', 'ROLLBACK_STATUS']);
  clAuditEnsureSheet_(CL_AUDIT_CFG.AUDIT_SHEET,
    ['RUN_ID', 'TIMESTAMP', 'PHASE', 'MD_ID', 'FIELD', 'OLD_VALUE', 'NEW_VALUE',
     'REASON', 'EVIDENCE', 'CONFIDENCE', 'ACTION', 'OPERATOR', 'ROLLBACK_STATUS']);
  cleanupToast_('ติดตั้งมาตรฐาน CHANGE_LOG + CLEANUP_AUDIT แล้ว');
}

/** เมนู — ค้นประวัติการเปลี่ยนแปลงของ MD_ID จาก CLEANUP_AUDIT */
function uiExplainCleanupAudit_() {
  try {
    var ui = SpreadsheetApp.getUi();
    var res = ui.prompt('CLEANUP_AUDIT',
      'ใส่ MD_ID ที่ต้องการตรวจประวัติ เช่น MD-001234', ui.ButtonSet.OK_CANCEL);
    if (res.getSelectedButton() !== ui.Button.OK) return;
    var mdId = String(res.getResponseText() || '').trim();
    if (!mdId) return;
    var rows = clAuditQueryByMdId_(mdId);
    if (!rows.length) {
      ui.alert('ไม่พบประวัติ',
        'ไม่พบ CLEANUP_AUDIT สำหรับ ' + mdId +
        '\n(แถวนี้ยังไม่เคยถูกแก้โดยชุดล้าง หรือยังไม่เคยรันโหมดทำจริง)',
        ui.ButtonSet.OK);
      return;
    }
    var lines = ['MD_ID: ' + mdId, 'จำนวนเหตุการณ์: ' + rows.length, ''];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      lines.push('[' + r[1] + '] Phase ' + r[2] + ' | ' + r[4] +
        ' | ' + r[5] + ' → ' + r[6] +
        ' | Reason=' + r[7] + ' | Evidence=' + r[8] +
        ' | Confidence=' + r[9] + ' | Action=' + r[10] +
        ' | Run=' + r[0] + ' | Rollback=' + r[12]);
    }
    ui.alert('ประวัติ CLEANUP_AUDIT: ' + mdId, lines.join('\n'), ui.ButtonSet.OK);
  } catch (e) {
    try { SpreadsheetApp.getUi().alert('อ่าน CLEANUP_AUDIT ผิดพลาด: ' + e.message); }
    catch (e2) {}
  }
}
