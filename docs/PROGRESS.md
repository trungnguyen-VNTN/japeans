# Tiến độ Japeans

Đọc đầu phiên, cập nhật cuối phiên. Mới nhất ở trên cùng.

## Trạng thái hiện tại (2026-11-25)

### Đã xong
- **Giai đoạn 0 – workspace:** Next.js 16 + TS + Tailwind 4, Prisma 7 + PostgreSQL, Meilisearch, Redis (Docker), repo GitHub công khai.
- **Giai đoạn 1 – dữ liệu:** script tải và import (`npm run data:download`, `npm run data:import`).
  - 219.205 từ JMdict, 254.341 nghĩa, 26.485 câu ví dụ Tatoeba.
  - 10.384 kanji KANJIDIC2; 9.865 có Hán Việt; 6.414 có thứ tự nét KanjiVG; 278 bộ / thành phần; 43.737 liên kết phân rã KRADFILE.
  - Index Meilisearch `words`, `kanji`; tìm được bằng kanji, kana, romaji, Hán Việt (có / không dấu), tiếng Anh.
- **Giai đoạn 2 – MVP tra cứu:** trang chủ, `/tim-kiem`, `/tu/[id]`, `/kanji`, `/kanji/[char]` (hoạt ảnh nét viết, bộ Khang Hy, thành phần, từ thông dụng). Design system ở `design-system/japeans/MASTER.md`. Lint, typecheck, `next build` xanh; đã kiểm tra trên trình duyệt (desktop, 375px, sáng, tối).

### Đang dở
- PR `chore/vitest-ci`: Vitest (31 test cho Hán Việt, xếp hạng tìm kiếm, nhãn từ loại), tách logic xếp hạng ra `src/lib/ranking.ts`, CI GitHub Actions. Chờ chủ repo merge.
- PR `feat/radical-search` (xếp chồng trên PR #1): trang `/kanji/bo-thu` tra kanji theo bộ thủ; thành phần không phải kanji ở trang chi tiết dẫn sang trang này.

### Bước tiếp theo
1. Giai đoạn 3: nghĩa tiếng Việt (dịch batch bằng AI → `Sense.glossVi`, `viReviewed = false`, ưu tiên ~10k từ thông dụng), mẹo nhớ kanji bằng AI (cache `AIContent`). Cần `ANTHROPIC_API_KEY` và ngân sách (xem câu hỏi mở).
2. Cấp JLPT N5–N1 cho từ và kanji (hiện chỉ có JLPT thang cũ của KANJIDIC). Cần chọn nguồn dữ liệu có license rõ.

### Câu hỏi mở
- Nguồn danh sách JLPT N-level nào chấp nhận được về license?
- Ngân sách gọi AI để dịch nghĩa hàng loạt (số từ, model)?
- Khi nào thêm đăng nhập (cần cho học phần / SRS) và dùng nhà cung cấp nào?

### Ý tưởng / việc phát sinh
- Autocomplete khi gõ trong ô tìm kiếm (debounce + dropdown).
- Tên gọi tiếng Việt cho bộ thủ (`Radical.nameVi`, ví dụ "nhân đứng") cần biên soạn và duyệt.
- Âm Hán Việt của 行 đang ưu tiên "HÀNG" do theo Unihan; 時 ra "THÌ" nên 学生時代 hiện "học sinh thì đại" (đúng: "thời đại"). Cân nhắc danh sách ngoại lệ có duyệt.
