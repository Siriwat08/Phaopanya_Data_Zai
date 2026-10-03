# MANIFEST — Phaopanya GAS Cleanup Suite rev.2.3

**สร้าง 2026-10-03 (Task 65) · ต่อจาก rev.2.2 (29-09) · ทดสอบ 121/121 กับข้อมูลจริง 11,961 แถว**

rev2.3 แก้จาก rev2.2 เพียง 2 ไฟล์ (ตามผลตรวจ Task 64):
- `50_CleanupConfig.gs` — เลขรุ่น cleanup-r2.3 + กฎเหล็กข้อ 7 + หมายเหตุหน่วย MAX_MED_M
- `54_CleanupPhase2.gs` — ทั้งไฟล์: FIX-1 บั๊กหน่วย KNN_FAR · FIX-2 EVIDENCE med เป็นเมตรจริง · FIX-3 ธง V_MANUAL_QUEUE + หัว KNN_MED_KM

ไฟล์อีก 10 ชิ้น + แพตช์ 3 ชิ้น (SelfTest/FIX-A/cleanThai) = **ตรง rev.2.2 ทุกไบต์** (ตรวจ diff แล้ว)

## GAS/ — โค้ด 12 ไฟล์ (วางเป็นไฟล์ใหม่ใน Apps Script editor)

| ไฟล์ | sha1 | บรรทัด | สถานะเทียบ r2.2 |
|---|---|---|---|
| `50_CleanupConfig.gs` | `98418a11ab6bf650b74559d8d651cd2493b39888` | 217 | ★ แก้ (เลขรุ่น r2.3) |
| `51_CleanupLib.gs` | `ab8aa57293edaddca50e2bcef8b75ca5ec0b45b1` | 540 | เหมือนเดิม |
| `52_CleanupPhase0.gs` | `05927c394d25a39967cbdb50c404c40d1844a132` | 160 | เหมือนเดิม |
| `53_CleanupPhase1.gs` | `eb8703fb15a55a55b059fc5be893d2b75fabeec0` | 211 | เหมือนเดิม |
| `54_CleanupPhase2.gs` | `b039c51ba06ac07590186506a15b1e16fb7f0f16` | 448 | ★ r2.3 ทั้งไฟล์ |
| `55_CleanupPhase3.gs` | `dee278c251669e7453bd857d3ee2a27bf14ab0d8` | 179 | เหมือนเดิม |
| `56_CleanupPhase4.gs` | `0411cf4cf1d3059ae65418a8a6f6b7b38ccec5bc` | 138 | เหมือนเดิม |
| `57_CleanupPhase5.gs` | `78fe0cd72107d38e12b77983c62775b8ebf7fd01` | 178 | เหมือนเดิม |
| `58_CleanupMenu.gs` | `5ea75489519186d21c35fb77f732fec24d17987a` | 119 | เหมือนเดิม |
| `59_CleanupPhase1b.gs` | `01a694b3912a1760e34dfa7809b119305554092f` | 509 | เหมือนเดิม |
| `60_CleanupExtras.gs` | `45658472606b04a17c04b6a4e04edc9f365481c2` | 392 | เหมือนเดิม |
| `61_CleanupAudit.gs` | `36053ba89344c57c9aa6a86cbcc5119ea1256fee` | 305 | เหมือนเดิม |

## GAS_patches/ — แพตช์ 4 ชิ้น (วางในไฟล์ production เดิม)

| แพตช์ | sha1 | วางเมื่อ |
|---|---|---|
| `00_Config_SCRIPT_VERSION_patch.gs` | `8775826566866fb1fbc2b2306dcf7eaf3173009e` | ★ อัปเดต r2.3 — วางขั้น 4 |
| `99_SelfTest_postal_lang_patch.gs` | `ed9f26d6e8bcf88d4acbdfd7f14675d3d741f48b` | ขั้น 4 (เหมือน r2.2) |
| `04_GeoService_FIX_A_1hit_dedup_patch.gs` | `2a9f5def3194136a6d973f0128453f61cb2dabd6` | ขั้น 4 (เหมือน r2.2) |
| `00_CleanService_prefix_phone_patch.gs` | `47da572362b27f607d8486488e21d13c39d72b84` | ⛔ วันเดียวกับเฟส 1b เท่านั้น (ขั้น 13) |

## ตัวเลขการทดสอบ (121/121 ผ่าน · Node mock + ข้อมูลจริง PPY_LMDS_SCGJWD.csv 11,961 แถว · โหลด 00_CleanService.gs production จริง + แพตช์ cleanThai จริง)

**Regression (ตรง rev2.2 ทุกตัว — ไฟล์ที่ r2.3 ไม่แตะ):**
- P0: 11,961 แถว | O≠W 383 | เขตเขต 6,449 | PII loose 834
- P1a: NAME 957 | ADDR 6,459 | รวม 6,708 | MATCH_KEY ไม่แตะ
- P3: เติม 1,637 | ตรวจมือ 65 | P4: 269 | 4.5 ติดธง 269
- 1b: key เปลี่ยน 7,255/7,257 | กลุ่มซ้ำ 28 | 1c ลบ 2 | MATCH_KEY==makeKey 11,959/11,959
- หลังทั้งหมด: O≠W เหลือ 306 (เฟส 2 ส่วน r2.2) — *หมายเหตุ: ทดสอบ r2.3 เหลือ 328 (383−55)*

**r2.3 เฟส 2 (เปลี่ยนตาม FIX-1/2/3):**
- คิวแก้ 106 = ผ่านธง **54** + ติดธง **52** (KNN_THIN 31 · KNN_FAR 9 · NV_CONFLICT 2 · V_MANUAL_QUEUE 22)
- ทำจริงรวม **55** (นำร่อง 10 + เต็ม 44 + วน 1) | คิวมือคงเหลือ **51**
- V_MANUAL_QUEUE 22 แถว ไม่ถูกเขียนแม้แต่เซลล์เดียว (ตรวจ diff จริง)
- MD-0003 ยังแก้ได้: W→ตลิ่งชัน X→บางระมาด U→10170 (V คงเดิม กรุงเทพมหานคร)
- EVIDENCE: `med=300m` (เมตรจริง — r2.2 พิมพ์ `med=0.3m` ผิด)

**audit รวม 1 รอบเต็ม:** CLEANUP_AUDIT **20,909** รายการ (P2 207 | 1a 9,362 | 3 3,274 | 4.5 269 | 1b 7,255) | CHANGE_LOG 22 แถว | RUN_ID 11 รอบ | ไม่มี FAILED | RUN_ID ไม่ซ้ำ

## วิธีตรวจ sha1 บนเครื่องคุณ

```bash
# macOS/Linux
shasum GAS/54_CleanupPhase2.gs
# Windows PowerShell
Get-FileHash GAS\54_CleanupPhase2.gs -Algorithm SHA1
```

ตัวเลขต้องตรงตารางบน — ถ้าไม่ตรง = ไฟล์ไม่ใช่ชุด r2.3 หรือถูกแก้ระหว่างทาง
