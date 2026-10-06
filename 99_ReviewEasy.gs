/**
 * FILE:    99_ReviewEasy.gs — สร้างแท็บ "ตรวจง่าย" จาก P2_FIX (ฉบับตรวจกับ rev2.3 แล้ว)
 * PURPOSE: มุมมองตรวจ P2_FIX แบบอ่านง่าย — ภาษาไทยทั้งหมด ช่อง "เดิม/เสนอ" อยู่ติดกัน
 *          เรียงจากเสี่ยงสูงไปต่ำ มีลิงก์เปิดแผนที่ ช่องเลือกผลตรวจ
 *
 * ที่มา: ดัดแปลงจากร่าง 99_ReviewEasy ของ AI ภายนอก (ผู้ใช้นำมาให้ตรวจ 05-10)
 *        ไล่โครงสร้างร่างเดิมถูกต้อง (คอลัมน์ P2_FIX 22 ช่องตรง 54_CleanupPhase2.gs:188)
 *        แต่มี 5 จุดที่พังบนชีตจริง จึงแก้ให้ในฉบับนี้:
 *   FIX-1 รันซ้ำแล้วผลตรวจหาย — ร่างเดิม deleteSheet ทิ้งทุกครั้ง
 *        ฉบับนี้เก็บ "ผลตรวจ/หมายเหตุ" เดิมไว้ก่อน แล้วคืนหลังสร้าง (จับคู่ด้วย MD_ID)
 *   FIX-2 ลิงก์แผนที่พัง — ร่างเดิมอ่านค่า MAPS_URL ซึ่งจริงเป็นสูตร =HYPERLINK(...)
 *        getValues ได้แค่ข้อความ "แผนที่" ไม่ใช่ URL (+ ปัญหาตัวคั่น ; ตาม locale)
 *        ฉบับนี้สร้างลิงก์เองจาก LAT/LNG ด้วย RichTextValue — ไม่พังกับ locale ชีตไทย/อังกฤษ
 *   FIX-3 P2_FIX ว่าง/ไม่มีแท็บ/คอลัมน์ไม่ครบ — ร่างเดิมโยน error
 *        ฉบับนี้แจ้งเตือนเป็นภาษาไทยและหยุดสุภาพ
 *   FIX-4 ระดับความเสี่ยง — ร่างเดิมใช้เกณฑ์เดา (vote<=11)
 *        ฉบับนี้อิงธงจริงของ r2.3: V_MANUAL_QUEUE/KNN_FAR/NV_CONFLICT = สูง
 *        KNN_THIN/*_KEEP_REVIEW/อำเภอเปลี่ยน = กลาง (ตาม 50_CleanupConfig MIN_KNN_DOMINANCE=10, MAX_MED_M=3000)
 *   FIX-5 ตำแหน่งคอลัมน์ — ร่างเดิม fix index ล็อกตาย
 *        ฉบับนี้หาจากชื่อหัวตาราง ปรับตัวได้ถ้าโครงสร้าง P2_FIX เปลี่ยน
 *
 * ความปลอดภัย: อ่าน P2_FIX อย่างเดียว · ไม่แตะ MASTER_PLACE · ไม่เพิ่มคอลัมน์ใน P2_FIX
 *              สร้าง/ลบเฉพาะแท็บ "ตรวจง่าย" ของตัวเอง — รันกี่ครั้งก็ปลอดภัย
 *
 * วิธีใช้: วางไฟล์นี้ใน GAS editor (ถ้าเคยวางร่างเดิม: เปิดไฟล์เดิม ลบโค้ดทั้งหมด
 *          แล้ววางฉบับนี้แทน) → เลือกฟังก์ชัน createEasyReview → กด Run
 *          หมายเหตุ: แท็บ P2_FIX จะมีหลังรัน "เฟส 2 ตรวจอย่างเดียว" ของชุดล้าง rev2.3
 */
function createEasyReview() {
  var ss = SpreadsheetApp.getActive();

  // ---- 0) ตรวจ P2_FIX ก่อน ----
  var src = ss.getSheetByName('P2_FIX');
  if (!src) {
    return eaAlert_('ยังไม่พบแท็บ P2_FIX\n\nสร้างได้จาก: เมนู CLEANUP MASTER r2 → เฟส 2 "ตรวจอย่างเดียว"\n(แท็บนี้จะเกิดหลังรันเฟส 2 ครั้งแรก)');
  }
  var data = src.getDataRange().getValues();

  // ---- 1) หาตำแหน่งคอลัมน์จากชื่อหัว (ไม่ fix index — กันโครงสร้างเปลี่ยน) + ตรวจโครงสร้างก่อนจำนวนแถว ----
  var heads = data[0].map(function (x) { return eaS_(x); });
  var NEED = ['ROW', 'MD_ID', 'LAT', 'LNG', 'V_OLD', 'W_OLD', 'X_OLD',
              'V_NEW', 'W_NEW', 'X_NEW', 'KNN_VOTES_O', 'KNN_MED_KM', 'FLAGS'];
  var ix = {};
  for (var n = 0; n < NEED.length; n++) ix[NEED[n]] = heads.indexOf(NEED[n]);
  var missing = NEED.filter(function (k) { return ix[k] < 0; });
  if (missing.length) {
    return eaAlert_('P2_FIX ขาดคอลัมน์: ' + missing.join(', ') +
      '\n\n(ตรวจว่าติดตั้งชุดล้าง rev2.3 แล้ว — P2_FIX ปกติมี 22 คอลัมน์)');
  }
  if (data.length < 2) {
    return eaAlert_('P2_FIX ยังไม่มีแถวข้อมูล (มีแต่หัวตาราง)');
  }

  // ---- 2) เก็บ "ผลตรวจ/หมายเหตุ" เดิมไว้ก่อนลบแท็บเก่า (FIX-1) ----
  var saved = eaHarvestOld_(ss);

  // ---- 3) สร้างแถว + จัดระดับความเสี่ยงตามธง r2.3 (FIX-4) ----
  var rows = [];
  for (var r = 1; r < data.length; r++) {
    var v = data[r];
    var mdId = eaS_(v[ix['MD_ID']]);
    var vo = eaS_(v[ix['V_OLD']]), vn = eaS_(v[ix['V_NEW']]);
    var wo = eaS_(v[ix['W_OLD']]), wn = eaS_(v[ix['W_NEW']]);
    var xo = eaS_(v[ix['X_OLD']]), xn = eaS_(v[ix['X_NEW']]);
    var flags = eaS_(v[ix['FLAGS']]);
    var votes = Number(v[ix['KNN_VOTES_O']]) || 0;
    var med = Number(v[ix['KNN_MED_KM']]) || 0;
    var vChg = vo !== '' && vn !== '' && vo !== vn;
    var wChg = wo !== '' && wn !== '' && wo !== wn;
    var risk = eaRisk_(flags, vChg, wChg);
    rows.push({
      // เสี่ยงสูงขึ้นก่อน · ในชั้นเดียวกัน เอาระยะเพื่อนบ้านไกลก่อน
      score: risk.t * 1000 - Math.round(med * 10),
      mdId: mdId,
      lat: eaS_(v[ix['LAT']]),
      lng: eaS_(v[ix['LNG']]),
      v: [eaS_(v[ix['ROW']]), mdId, '-',
          vo, vn, vChg ? 'เปลี่ยน' : '—',
          wo, wn, xo, xn,
          votes, med, risk.txt, '', '']
    });
  }
  rows.sort(function (a, b) { return a.score - b.score; });

  // ---- 4) สร้างแท็บใหม่ (แถว 1 คู่มือ · แถว 2 หัวตาราง · แถว 3 ข้อมูล) ----
  var oldSh = ss.getSheetByName('ตรวจง่าย');
  if (oldSh) ss.deleteSheet(oldSh);
  var sh = ss.insertSheet('ตรวจง่าย');

  var HEAD = ['แถวใน MASTER', 'รหัสร้าน (MD_ID)', 'เปิดแผนที่',
    'จังหวัด (เดิมในชีต)', 'จังหวัด (ระบบเสนอ)', 'จังหวัดเปลี่ยนไหม',
    'อำเภอ/เขต (เดิมในชีต)', 'อำเภอ/เขต (ระบบเสนอ)',
    'ตำบล/แขวง (เดิมในชีต)', 'ตำบล/แขวง (ระบบเสนอ)',
    'โหวตอำเภอเพื่อนบ้าน (เต็ม 15)', 'ระยะมัธยฐานเพื่อนบ้าน (กม.)',
    'ระดับความเสี่ยง', 'ผลตรวจ (เลือกจากลิสต์)', 'หมายเหตุ (พิมพ์อิสระ)'];

  var nHigh = 0, nMid = 0, nSafe = 0, nDone = 0;
  rows.forEach(function (x) {
    if (x.v[12].indexOf('เสี่ยงสูง') === 0) nHigh++;
    else if (x.v[12].indexOf('เสี่ยงกลาง') === 0) nMid++;
    else nSafe++;
    if (saved[x.mdId] && saved[x.mdId][0]) nDone++;
  });

  sh.getRange(1, 1, 1, HEAD.length).merge();
  sh.getRange(1, 1).setValue(
    'อ่านจากบนลงล่าง — เรียงเสี่ยงสูงให้ก่อน · เทียบ "เดิม" กับ "ระบบเสนอ" ที่อยู่ติดกัน · ช่องที่มีสี = ค่าที่ระบบจะเปลี่ยน · ' +
    'กด "เปิดแผนที่" เทียบกับ Google Maps แล้วเลือก "ผลตรวจ" ทางขวา · รัน createEasyReview ซ้ำกี่ครั้ง ผลตรวจไม่หาย · ' +
    'ทั้งหมด ' + rows.length + ' แถว (สูง ' + nHigh + ' · กลาง ' + nMid + ' · ปลอดภัย ' + nSafe + ' · ตรวจแล้ว ' + nDone + ')')
    .setFontSize(9).setFontColor('#666666').setWrap(true);
  sh.setRowHeight(1, 42);

  sh.getRange(2, 1, 1, HEAD.length).setValues([HEAD])
    .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff')
    .setWrap(true).setVerticalAlignment('middle').setFontSize(10);

  var body = rows.map(function (x) { return x.v; });
  sh.getRange(3, 1, body.length, HEAD.length).setValues(body);

  // ---- 5) ลิงก์แผนที่จาก LAT/LNG จริง (FIX-2 — RichTextValue ไม่พังกับ locale) ----
  for (var k = 0; k < rows.length; k++) {
    var url = eaMapsUrl_(rows[k].lat, rows[k].lng);
    if (url) {
      sh.getRange(3 + k, 3).setRichTextValue(
        SpreadsheetApp.newRichTextValue().setText('เปิดแผนที่').setLinkUrl(url).build());
    }
  }

  // ---- 6) จัดหน้าตา: ความกว้าง · หยุดแถว/คอลัมน์ · จัดกึ่งกลาง · เลขทศนิยม ----
  var w = [85, 105, 90, 130, 130, 85, 140, 140, 140, 140, 105, 110, 230, 120, 170];
  for (var cw = 0; cw < w.length; cw++) sh.setColumnWidth(cw + 1, w[cw]);
  sh.setFrozenRows(2);
  sh.setFrozenColumns(3);
  sh.getRange(3, 1, body.length, HEAD.length).setFontSize(10);
  sh.getRange(3, 11, body.length, 2).setHorizontalAlignment('center');
  sh.getRange(3, 12, body.length, 1).setNumberFormat('0.0');

  // ---- 7) ไฮไลต์ช่องที่ระบบจะเปลี่ยน (จังหวัด=แดง · อำเภอ/ตำบล=เหลือง) ----
  for (var k2 = 0; k2 < body.length; k2++) {
    var rr = k2 + 3;
    if (body[k2][3] !== '' && body[k2][4] !== '' && body[k2][3] !== body[k2][4]) {
      sh.getRange(rr, 5).setBackground('#ffc7ce');
      sh.getRange(rr, 6).setFontColor('#990000').setFontWeight('bold');
    }
    if (body[k2][6] !== '' && body[k2][7] !== '' && body[k2][6] !== body[k2][7]) {
      sh.getRange(rr, 8).setBackground('#fff2cc');
    }
    if (body[k2][8] !== '' && body[k2][9] !== '' && body[k2][8] !== body[k2][9]) {
      sh.getRange(rr, 10).setBackground('#fff2cc');
    }
  }

  // ---- 8) สีระดับความเสี่ยง ----
  var rk = sh.getRange(3, 13, body.length, 1);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextContains('เสี่ยงสูง')
      .setBackground('#f4cccc').setFontColor('#990000').setRanges([rk]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains('เสี่ยงกลาง')
      .setBackground('#fce5cd').setFontColor('#b45f06').setRanges([rk]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains('ปลอดภัย')
      .setBackground('#d9ead3').setFontColor('#38761d').setRanges([rk]).build()
  ]);

  // ---- 9) ดรอปดาวน์ผลตรวจ (เลือก ไม่ต้องพิมพ์) ----
  sh.getRange(3, 14, body.length, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['ถูกทั้งหมด', 'อำเภอผิด', 'ตำบลผิด', 'จังหวัดผิด', 'ผิดหมด'], true)
      .build());

  // ---- 10) คืนผลตรวจ/หมายเหตุเดิม (FIX-1 — จับคู่ด้วย MD_ID) ----
  var restored = 0;
  for (var k3 = 0; k3 < rows.length; k3++) {
    var sv = saved[rows[k3].mdId];
    if (sv && (sv[0] || sv[1])) {
      sh.getRange(3 + k3, 14, 1, 2).setValues([[sv[0], sv[1]]]);
      restored++;
    }
  }

  // ---- 11) ฟิลเตอร์ (หัวอยู่แถว 2) ----
  sh.getRange(2, 1, body.length + 1, HEAD.length).createFilter();

  eaAlert_('สร้างแท็บ "ตรวจง่าย" เสร็จ — ' + body.length + ' แถว' +
    (restored ? '\nคืนผลตรวจเดิมให้ ' + restored + ' แถว (จับคู่ด้วย MD_ID)' : '') +
    '\n\nอ่านจากบนลงล่าง: เสี่ยงสูงอยู่บนสุด');
}

// ================= ฟังก์ชันช่วย =================

/** แปลงค่าใด ๆ เป็น string ตัดช่องว่างหัว-ท้าย (ปลอดภัยกับ null/undefined) */
function eaS_(x) {
  return String(x === null || x === undefined ? '' : x).trim();
}

/** alert แบบไม่โยน error ตอนรันจากบริบทไม่มี UI (เช่น trigger) */
function eaAlert_(msg) {
  try {
    SpreadsheetApp.getUi().alert('ตรวจง่าย', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(msg);
  }
  return;
}

/** สร้าง URL แผนที่จาก LAT/LNG (ไม่ใช้ค่า MAPS_URL ที่เป็นสูตรใน P2_FIX) */
function eaMapsUrl_(lat, lng) {
  var la = parseFloat(eaS_(lat)), lo = parseFloat(eaS_(lng));
  if (isNaN(la) || isNaN(lo)) return '';
  return 'https://www.google.com/maps?q=' + la + ',' + lo;
}

/** จัดระดับความเสี่ยงจากธงจริงของ r2.3 (50_CleanupConfig: DOMINANCE 10/15 · FAR 3 กม.) */
function eaRisk_(flags, vChg, wChg) {
  var f = flags || '';
  var high = [], mid = [];
  if (f.indexOf('V_MANUAL_QUEUE') >= 0 || vChg) high.push('จังหวัดเปลี่ยน → คิวมือ');
  if (f.indexOf('KNN_FAR') >= 0) high.push('เพื่อนบ้านไกล >3 กม.');
  if (f.indexOf('NV_CONFLICT') >= 0) high.push('จังหวัดขัด N');
  if (f.indexOf('KNN_THIN') >= 0) mid.push('โหวตอำเภอ <10/15');
  if (f.indexOf('KEEP_REVIEW') >= 0) mid.push('โหวตไม่ถึงขั้นต่ำ คงของเดิม');
  if (f.indexOf('V_KEEP_OLD_N_EMPTY') >= 0) mid.push('รหัส N ว่าง คงจังหวัดเดิม');
  if (wChg) mid.push('อำเภอ/เขตเปลี่ยน');
  if (high.length) return { t: 1, txt: 'เสี่ยงสูง · ' + high.join(' + ') };
  if (mid.length) return { t: 2, txt: 'เสี่ยงกลาง · ' + mid.join(' + ') };
  return { t: 3, txt: 'ปลอดภัย · ธงไม่ติด เปลี่ยนเล็กน้อย' };
}

/** เก็บผลตรวจ/หมายเหตุจากแท็บตรวจง่ายเก่า (รองรับทั้งร่างเดิมและฉบับนี้) */
function eaHarvestOld_(ss) {
  var out = {};
  var oldSh = ss.getSheetByName('ตรวจง่าย');
  if (!oldSh) return out;
  try {
    var v = oldSh.getDataRange().getValues();
    var hRow = -1, cId = -1, cVerdict = -1, cNote = -1;
    for (var r = 0; r < Math.min(3, v.length); r++) {
      if (String(v[r].join('|')).indexOf('รหัสร้าน') >= 0) { hRow = r; break; }
    }
    if (hRow < 0) return out;
    for (var c = 0; c < v[hRow].length; c++) {
      var t = String(v[hRow][c] || '');
      if (t.indexOf('รหัสร้าน') >= 0) cId = c;
      if (t.indexOf('ผลตรวจ') >= 0) cVerdict = c;
      if (t.indexOf('หมายเหตุ') >= 0) cNote = c;
    }
    if (cId < 0 || cVerdict < 0) return out;
    for (var r2 = hRow + 1; r2 < v.length; r2++) {
      var md = eaS_(v[r2][cId]);
      var verdict = eaS_(v[r2][cVerdict]);
      var note = cNote >= 0 ? eaS_(v[r2][cNote]) : '';
      if (md && (verdict || note)) out[md] = [verdict, note];
    }
  } catch (e) {
    // แท็บเก่าอ่านไม่ได้ = เริ่มใหม่ ไม่ถือเป็น error
  }
  return out;
}
