# MANIFEST ชุดเต็ม — v5.5.7+cleanup-r2.3 (07-10-2026 · Task72)

sha1 ทุกไฟล์ในโฟลเดอร์ `GAS_ชุดเต็ม_v5.5.7+cleanup-r2.3/` — ใช้ตรวจว่าก๊อปครบถ้วนไม่ตกไบต์

> ไฟล์ชุดล้าง 12 ไฟล์ (50–61) = **byte-identical กับชุดทดสอบ 121/121 ของ rev2.3** (MANIFEST ฉบับ suite เดิมเก็บอยู่ใน git history ของ repo)
> ไฟล์ production 10 ไฟล์ = ต้นฉบับ v5.5.7 จาก Code_Sheet 22/09 ของผู้ใช้ + แพตช์ 3 ชิ้นที่ใส่ให้แล้ว + **FIX Task72 (07-10) ที่ 01_MasterService.gs** (รายละเอียดตารางล่าง)

## ไฟล์ production (กลุ่ม 1 — แทนที่เนื้อในไฟล์เดิม)

| # | ไฟล์ | sha1 (ชุดเต็ม) | แก้อะไรจากต้นฉบับ v5.5.7 |
|---|---|---|---|
| 1 | `00_Config.gs` | `34ecef1d3b1702f564f166ee1cdbd46a4512f832` | +SCRIPT_VERSION block ท้ายไฟล์ + ปั๊มเวอร์ชัน 20261007 (Task72) |
| 2 | `00_CleanService.gs` | `04b00aee543a12faba0c51362e10196e6dc520bf` | ไม่แก้เนื้อโค้ด (ใส่ป้ายชุดเต็มบรรทัดแรกเท่านั้น) |
| 3 | `01_MasterService.gs` | `f5cb66f19b369ba1f5472e3b31172fa2d86f6f3a` | **Task72-FIX 07-10**: ปุ่ม 1 อ่านพิกัดจากคอลัมน์ "จุดส่งสินค้าปลายทาง" เป็นหลัก (fallback LAT/LONG) · เทส mock 17/17 |
| 4 | `02_WorkloadService.gs` | `4c5b71d9ab65184114c1eb509c6964467acf7d25` | ไม่แก้เนื้อโค้ด (ใส่ป้ายชุดเต็มบรรทัดแรกเท่านั้น) |
| 5 | `03_Menu.gs` | `c8eca484faee7130f79ecd0395f5b0e709dcc3ba` | ป้ายเมนู 8→9 จุด + +addCleanupMenu_ ใน onOpen |
| 6 | `04_GeoService.gs` | `d34eee3af0f2b9a03c46125eb28812510889d849` | FIX-A dedup 1-hit EN |
| 7 | `05_SetupService.gs` | `45a5f18f3f01aec096419dc6722b5cc99cff8d2e` | ไม่แก้เนื้อโค้ด (ใส่ป้ายชุดเต็มบรรทัดแรกเท่านั้น) |
| 8 | `06_GoogleMapsService.gs` | `158765a96f43c176f832b631154eed3e3ac85464` | ไม่แก้เนื้อโค้ด (ใส่ป้ายชุดเต็มบรรทัดแรกเท่านั้น) |
| 9 | `Service_SCG.gs` | `4aaf6c897ead95d00aa51280b85c158816c429e4` | ไม่แก้เนื้อโค้ด (ใส่ป้ายชุดเต็มบรรทัดแรกเท่านั้น) |
| 10 | `99_SelfTest.gs` | `ea878ea871193fd58376064437df882eeda218b2` | +pickGeoMatcher_ + selfTestVersionLabel_ + call → pickGeoMatcher_ + +Test 9 ลงทะเบียน + ป้ายเวอร์ชันกลาง 2 จุด + +testPostalFormat_ ท้ายไฟล์ |

## ไฟล์ชุดล้าง rev2.3 (กลุ่ม 2 — สร้างไฟล์ใหม่ 12 ไฟล์)

| # | ไฟล์ | sha1 (= MANIFEST r2.3) | สถานะ |
|---|---|---|---|
| 11 | `50_CleanupConfig.gs` | `98418a11ab6bf650b74559d8d651cd2493b39888` | byte-identical กับชุดทดสอบ 121/121 — ไม่แตะแม้แต่ 1 ไบต์ |
| 12 | `51_CleanupLib.gs` | `ab8aa57293edaddca50e2bcef8b75ca5ec0b45b1` | byte-identical กับชุดทดสอบ 121/121 — ไม่แตะแม้แต่ 1 ไบต์ |
| 13 | `52_CleanupPhase0.gs` | `05927c394d25a39967cbdb50c404c40d1844a132` | byte-identical กับชุดทดสอบ 121/121 — ไม่แตะแม้แต่ 1 ไบต์ |
| 14 | `53_CleanupPhase1.gs` | `eb8703fb15a55a55b059fc5be893d2b75fabeec0` | byte-identical กับชุดทดสอบ 121/121 — ไม่แตะแม้แต่ 1 ไบต์ |
| 15 | `54_CleanupPhase2.gs` | `b039c51ba06ac07590186506a15b1e16fb7f0f16` | byte-identical กับชุดทดสอบ 121/121 — ไม่แตะแม้แต่ 1 ไบต์ |
| 16 | `55_CleanupPhase3.gs` | `dee278c251669e7453bd857d3ee2a27bf14ab0d8` | byte-identical กับชุดทดสอบ 121/121 — ไม่แตะแม้แต่ 1 ไบต์ |
| 17 | `56_CleanupPhase4.gs` | `0411cf4cf1d3059ae65418a8a6f6b7b38ccec5bc` | byte-identical กับชุดทดสอบ 121/121 — ไม่แตะแม้แต่ 1 ไบต์ |
| 18 | `57_CleanupPhase5.gs` | `78fe0cd72107d38e12b77983c62775b8ebf7fd01` | byte-identical กับชุดทดสอบ 121/121 — ไม่แตะแม้แต่ 1 ไบต์ |
| 19 | `58_CleanupMenu.gs` | `5ea75489519186d21c35fb77f732fec24d17987a` | byte-identical กับชุดทดสอบ 121/121 — ไม่แตะแม้แต่ 1 ไบต์ |
| 20 | `59_CleanupPhase1b.gs` | `01a694b3912a1760e34dfa7809b119305554092f` | byte-identical กับชุดทดสอบ 121/121 — ไม่แตะแม้แต่ 1 ไบต์ |
| 21 | `60_CleanupExtras.gs` | `45658472606b04a17c04b6a4e04edc9f365481c2` | byte-identical กับชุดทดสอบ 121/121 — ไม่แตะแม้แต่ 1 ไบต์ |
| 22 | `61_CleanupAudit.gs` | `36053ba89344c57c9aa6a86cbcc5119ea1256fee` | byte-identical กับชุดทดสอบ 121/121 — ไม่แตะแม้แต่ 1 ไบต์ |

## แพตช์รอวันเฟส 1b

| ไฟล์ | sha1 | หมายเหตุ |
|---|---|---|
| `GAS_patches/00_CleanService_prefix_phone_patch.gs` | `47da572362b27f607d8486488e21d13c39d72b84` | ⛔ ยังไม่ใส่ใน 00_CleanService.gs — วางเฉพาะวันเฟส 1b (ขั้น 12-13) เท่านั้น |

## เอกสารในโฟลเดอร์

| ไฟล์ | sha1 |
|---|---|
| `00_อ่านก่อนวาง.md` | `4d96fd7e0efb6e14861cceb7708ce2733c7302f9` |
| `README_GAS_วิธีใช้_rev2.3.txt` | `4fc5fb813fc8ed22a2442a494b0778f8c26ee77b` |

---

**ต้นทางอ้างอิง:** production v5.5.7 = Code_Sheet.zip 22/09 (ของผู้ใช้) · ชุดล้าง = rev2.3 03-10 (Task 65, เทส 121/121 กับ 11,961 แถวจริง) · แพตช์ 3 ชิ้น = PATCH TASK65-3 / TASK44-2 / TASK46-A จาก `GAS_patches/` ของ suite

**ประกอบโดย:** Task 68 (03-10-2026) — สคริปต์ `scripts/build_full_set_r23.py` + ตรวจ `scripts/verify_full_set_r23.py` (node --check 23/23 ไฟล์ + sha1 + assertions ผ่านทั้งหมด)

**อัปเดต:** Task 69 (05-10-2026) — ย้ายคู่มือ `README_GAS_วิธีใช้_rev2.3.txt` จากราก repo เข้าโฟลเดอร์นี้ · ปรับกรณี A เป็นวิธีวาง 22 ไฟล์ (แพตช์ใส่แล้ว) · โค้ด 22 ไฟล์ + แพตช์ cleanThai ไม่ถูกแตะแม้แต่ 1 ไบต์ (sha1 ตรงตารางบน)

**อัปเดต:** Task 72 (07-10-2026) — FIX ปุ่ม 1 อ่านพิกัดจากคอลัมน์ "จุดส่งสินค้าปลายทาง" เป็นหลัก (`01_MasterService.gs` · fallback LAT/LONG เดิม · เทส mock 17/17) · ปั๊ม `SCRIPT_VERSION` → `20261007` · อัปเดต `00_อ่านก่อนวาง.md` + คู่มือ + MANIFEST ให้ตรงกัน · อีก 20 ไฟล์ที่เหลือไม่ถูกแตะ
