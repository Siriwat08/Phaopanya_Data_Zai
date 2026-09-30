# MANIFEST — ชุดล้างข้อมูล rev2.2 (สร้าง 2026-09-30 โดย Super Z)

พิสูจน์ว่าไฟล์ใน repo นี้ = ชุดที่ผ่านการทดสอบ 107/107 กับข้อมูลจริง 11,961 แถว (เทสด้วย mock GAS environment ใน `test_suite_rev22.js`)

**วิธีตรวจ:** `sha1sum <ไฟล์>` แล้วเทียบตาราง — ถ้าไม่ตรง = ไฟล์ถูกแก้/หยิบผิดรุ่น

## GAS/ — โค้ด 12 ไฟล์ (วางทั้งชุดในขั้น 4 · กรณี A)

| ไฟล์ | sha1 |
|---|---|
| 50_CleanupConfig.gs | 1e9451b4942bd8da54f5c1cfeeded3a23c1ef517 |
| 51_CleanupLib.gs | ab8aa57293edaddca50e2bcef8b75ca5ec0b45b1 |
| 52_CleanupPhase0.gs | 05927c394d25a39967cbdb50c404c40d1844a132 |
| 53_CleanupPhase1.gs | eb8703fb15a55a55b059fc5be893d2b75fabeec0 |
| 54_CleanupPhase2.gs | 16d130516ad2de46beaba1f56c87d276646e081c |
| 55_CleanupPhase3.gs | dee278c251669e7453bd857d3ee2a27bf14ab0d8 |
| 56_CleanupPhase4.gs | 0411cf4cf1d3059ae65418a8a6f6b7b38ccec5bc |
| 57_CleanupPhase5.gs | 78fe0cd72107d38e12b77983c62775b8ebf7fd01 |
| 58_CleanupMenu.gs | 5ea75489519186d21c35fb77f732fec24d17987a |
| 59_CleanupPhase1b.gs | 01a694b3912a1760e34dfa7809b119305554092f |
| 60_CleanupExtras.gs | 45658472606b04a17c04b6a4e04edc9f365481c2 |
| 61_CleanupAudit.gs | 36053ba89344c57c9aa6a86cbcc5119ea1256fee |

## GAS_patches/ — 4 ชิ้น (ใช้ 3 ในขั้น 4 · แพตช์ cleanThai เก็บขั้น 12a/13)

| ไฟล์ | sha1 | ใช้เมื่อ |
|---|---|---|
| 00_Config_SCRIPT_VERSION_patch.gs | 77524b7d941dabe8f2d8dba37d25ed0783289dd7 | **ขั้น 4** — วางใน 00_Config.gs |
| 99_SelfTest_postal_lang_patch.gs | ed9f26d6e8bcf88d4acbdfd7f14675d3d741f48b | **ขั้น 4** — วางใน 99_SelfTest.gs |
| 04_GeoService_FIX_A_1hit_dedup_patch.gs | 2a9f5def3194136a6d973f0128453f61cb2dabd6 | **ขั้น 4** — วางใน 04_GeoService.gs |
| 00_CleanService_prefix_phone_patch.gs | 47da572362b27f607d8486488e21d13c39d72b84 | **เก็บไว้ขั้น 12a/13** วันเดียวกับเฟส 1b — ห้ามวางเดี๋ยวนี้ |

## GAS_v5.5.8_REBUILT/ — เก็บไว้รอบอัปเกรดถัดไป (ไม่ใช้ในขั้น 4 · มติ Q1 = a)

| ไฟล์ | หมายเหตุ |
|---|---|
| 04_GeoService_v5.5.8_REBUILT.gs | GOB ประกอบจาก diff 1,742→1,811 บรรทัด · Super Z ยืนยัน 30-09: **ตรงกับ v5.5.8 ที่ Zai สร้างไว้ทุกไบต์** (diff = IDENTICAL) · syntax ผ่าน node --check · แตกต่างจาก production v5.5.7 85 บรรทัด (จุด A/B/C ตาม `v5.5.8_diff_ตรวจสอบ3จุด.txt`) |

## ตัวเลขผลทดสอบ rev2.2 (107/107 ผ่าน)

- ชุดทดสอบ regression rev2.1 ทั้งหมดผ่านครบ = audit **ไม่แตะพฤติกรรมการล้างข้อมูล**
- audit รอบเต็ม 1 รอบ: รวม **21,016 รายการ** (P2 314 · 1a 9,362 · 3 3,274 · 4.5 269 · 1b 7,255) · CHANGE_LOG 22 แถว · RUN_ID 11 รอบ · ไม่มี FAILED
- ตัวเลขล้างข้อมูลทุกเฟสเทียบเท่า rev2.1 เป๊ะ (ดูตาราง baseline ใน `README_GAS_วิธีใช้.txt`)
