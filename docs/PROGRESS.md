# Tiến độ Japeans

Đọc đầu phiên, cập nhật cuối phiên. Mới nhất ở trên cùng.

## Trạng thái hiện tại (2026-11-25, sau PR #7)

### Đã xong
- **Đăng nhập (PR #7):** Google qua next-auth 4.24 (bản ổn định) + Prisma adapter, session trong DB. `/dang-nhap`, `/tai-khoan`, avatar ở header. `getCurrentUser()` / `requireUser()` trong `src/lib/auth.ts`. Chưa thử Google thật (cần OAuth client).
- **Dịch nghĩa tiếng Việt bằng AI (PR #6):** `npm run ai:translate` (sync để thử, `--mode batch` cho số lớn, `--max-usd`), lưu ở `AIContent` (`WORD_GLOSS_VI`) → `Sense.glossVi`, nhãn "AI · chưa duyệt" trên trang từ và kết quả tìm kiếm. Chưa chạy API thật.
- **Tìm kiếm (PR #4, #5):** gợi ý khi gõ (`/api/goi-y`, combobox ARIA, an toàn với IME); xếp hạng bậc "khớp đầu từ" (`たべ` → 食べる).
- **Tra kanji theo bộ thủ (PR #2):** `/kanji/bo-thu?bo=…`.
- **Test & CI (PR #1):** Vitest (61 test), GitHub Actions (lint, typecheck, test, build).
- **Giai đoạn 2 – MVP tra cứu:** trang chủ, `/tim-kiem`, `/tu/[id]`, `/kanji`, `/kanji/[char]`. Design system ở `design-system/japeans/MASTER.md`.
- **Giai đoạn 1 – dữ liệu:** 219.205 từ JMdict, 26.485 câu ví dụ Tatoeba, 10.384 kanji (9.865 có Hán Việt, 6.414 có thứ tự nét), 43.737 liên kết phân rã KRADFILE; index Meilisearch `words`, `kanji`.
- **Giai đoạn 0 – workspace:** Next.js 16, Prisma 7 + PostgreSQL, Meilisearch, Redis (Docker), repo GitHub công khai.

### Đang dở
- Không có PR mở.

### Bước tiếp theo
1. Chủ repo: thêm `ANTHROPIC_API_KEY`, chạy thử `npm run ai:translate -- --limit 100`, xem chất lượng / chi phí trước khi chạy ~10k từ.
2. Chủ repo: tạo Google OAuth client, điền `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, thử đăng nhập thật.
3. Giai đoạn 4a – học phần (Module H): kế hoạch chờ duyệt.
4. Cấp JLPT N5–N1: đề xuất nguồn Bluskyo/JLPT_Vocabulary (dữ liệu CC BY, Jonathan Waller; danh sách không chính thức), chờ duyệt.
5. Mẹo nhớ kanji bằng AI (`AIContent` `KANJI_MNEMONIC`).

### Câu hỏi mở
- Dùng Bluskyo/JLPT_Vocabulary làm nguồn JLPT (hiển thị "JLPT (tham khảo)")? Trang gốc tanos.co.uk không còn truy cập được.
- Hiển thị Hán Việt của từ: đề xuất liệt kê mọi tổ hợp âm (như Mazii) và đánh dấu "âm chính" thay vì chọn một tổ hợp. Chờ chủ repo đồng ý.
- Ai duyệt bản dịch AI và duyệt ở đâu (cần vai trò `EDITOR` + trang duyệt)?

### Ý tưởng / việc phát sinh
- Tên gọi tiếng Việt cho bộ thủ (`Radical.nameVi`, ví dụ "nhân đứng") cần biên soạn và duyệt.
- Thứ tự âm Hán Việt: cả KANJIDIC2 lẫn Unihan lẫn âm Nôm (強 hiện "CÀNG" trước "CƯỜNG", 時 "THÌ", 行 "HÀNG"); 勉強 thành "miễn càng". Liên quan câu hỏi mở về hiển thị Hán Việt.
