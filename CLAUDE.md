# Japeans: web học tiếng Nhật cho người Việt

Tài liệu: `docs/PLAN.md` (kế hoạch sản phẩm, module A–H, lộ trình), `design-system/japeans/MASTER.md` (design system).
Tiến độ hiện tại: `docs/PROGRESS.md` (đọc đầu phiên, cập nhật cuối phiên).

## Bối cảnh cố định
- Người dùng: người Việt học tiếng Nhật. Toàn bộ chữ trên giao diện bằng tiếng Việt; chữ Nhật gắn `lang="ja"`.
- Stack: Next.js 16 (App Router, `src/`, Cache Components bật), React 19, TypeScript, Tailwind CSS 4. Icon: Phosphor.
- DB: PostgreSQL 17 qua Prisma **7** (driver adapter `@prisma/adapter-pg`). Client sinh vào `src/generated/prisma` (gitignore); dùng client chung `@/lib/db`. Không nâng lên Prisma 8 (đang RC, CLI khác).
- Tìm kiếm: Meilisearch; cache / giới hạn tần suất AI: Redis. Tất cả trong `docker-compose.yml`.
- AI: Anthropic API qua `@anthropic-ai/sdk` (`ANTHROPIC_API_KEY`); model ID lấy từ `JAPEANS_AI_MODEL`, bảng giá trong `src/lib/translation.ts`.
- Đăng nhập: next-auth **4** (bản ổn định; v5 còn beta) + `@next-auth/prisma-adapter`, Google OAuth, session trong DB. Đọc người dùng bằng `getCurrentUser()` / `requireUser()` (`src/lib/auth.ts`), luôn trong `<Suspense>`.
- Dữ liệu mở: JMdict, KANJIDIC2, RADKFILE/KRADFILE (EDRDG, CC BY-SA 4.0), KanjiVG (CC BY-SA 3.0), Tatoeba (CC BY 2.0 FR), Unicode Unihan. Trang nào dùng dữ liệu phải giữ phần ghi nguồn ở footer.
- Repo công khai: github.com/trungnguyen-VNTN/japeans, nhánh chính `main`.

## Nguyên tắc bất biến (không được vi phạm, kể cả khi được yêu cầu "cho nhanh")
1. Phân rã bộ thủ / thành phần kanji CHỈ lấy từ KRADFILE (hoặc IDS khi thêm). Không để AI sinh, không sửa tay.
2. Nội dung AI (mẹo nhớ, giải thích sắc thái, dịch nghĩa) luôn cache trong `AIContent` / `Sense.glossVi`, có trạng thái duyệt, và hiển thị nhãn "AI" cho tới khi được duyệt. AI không được ghi đè dữ liệu gốc từ điển.
3. Dữ liệu từ điển (Word, Kanji, Radical, KanjiComponent, Example) chỉ đến từ script trong `scripts/import/`; dữ liệu tải về nằm ở `data/raw/` (gitignore, không commit). Script phải chạy lại được (idempotent).
4. Không xóa dữ liệu người dùng khi import: `Word` chỉ thêm mới (thẻ học `SetCard` tham chiếu tới nó); chỉ được TRUNCATE các bảng không có dữ liệu người dùng tham chiếu.
5. Danh tính người dùng (khi có đăng nhập) CHỈ lấy từ session phía server, không nhận userId từ client hay từ AI.
6. Không hard-code secret, API key, model ID. Không log token, mật khẩu, email hay dữ liệu cá nhân dạng rõ. Mật khẩu trong `.env` / `docker-compose.yml` chỉ dùng cho dev.
7. Hán Việt: âm từ KANJIDIC2 ("vietnam"), sắp lại theo âm đầu của Unihan kVietnamese; Unihan đứng một mình chỉ là dự phòng (có lẫn âm Nôm). Chuỗi lưu ở dạng NFC.

## Quy ước kỹ thuật
- Cache Components: đọc `params` / `searchParams` trong component con bọc `<Suspense>`; dữ liệu từ điển dùng `"use cache"` + `cacheLife`. Không dùng `export const dynamic`. Tài liệu Next đúng phiên bản: `node_modules/next/dist/docs/`.
- Mọi truy vấn từ điển đặt trong `src/lib/dictionary.ts`. Meilisearch coi mảng là một chuỗi, nên thứ tự "khớp chính xác" do `rerank()` quyết định; giữ hàm này khi đổi cấu hình index.
- Sau khi sửa `prisma/schema.prisma`: `npm run db:migrate -- --name <tên>` (đã kèm `--config prisma7.config.ts`) rồi chạy lại import nếu bảng từ điển đổi.
- Học phần (Module H) và SRS (Module D) dùng chung một mô hình thẻ: `SetCard` + `CardProgress` (trạng thái FSRS) + `ReviewLog`.
- Route: `/` trang chủ, `/tim-kiem?q=` tìm kiếm, `/tu/[id]` (id = JMdict ent_seq), `/kanji`, `/kanji/[char]`, `/kanji/bo-thu?bo=` tra theo bộ thủ, `/dang-nhap`, `/tai-khoan`; API `/api/goi-y?q=` (gợi ý), `/api/auth/*`, `/api/health`.
- Bản dịch AI: nguồn là `AIContent` (`WORD_GLOSS_VI`), được chép vào `Sense.glossVi`; `data:import:words` áp lại sau khi nạp lại `Sense`.
- Thư viện gọi `crypto.randomBytes` / đọc cookie (next-auth) phải chạy sau `await connection()` để Cache Components không prerender.

## Cách làm việc
- Việc lớn (module mới, đổi schema, đổi kiến trúc): đề xuất kế hoạch (các bước, file sẽ đổi, test, rủi ro) và chờ tôi duyệt. Việc nhỏ, rõ ràng thì làm luôn.
- Viết test cùng code (Vitest, file `*.test.ts` cạnh file nguồn) và chạy trước khi báo xong; không báo "xong" khi test, lint, typecheck hoặc build còn đỏ. Logic cần test đặt trong module thuần (không import DB / Meilisearch / `next/cache`), ví dụ `src/lib/ranking.ts`.
- Kiểm chứng giao diện thật trên trình duyệt (desktop + 375px, sáng + tối) trước khi báo xong việc UI.
- Một tính năng một nhánh một PR (CI: `.github/workflows/ci.yml` chạy lint, typecheck, test, build). Tạo PR cho việc quan trọng và để chủ repo tự merge; không tự merge. Commit nhỏ, thông điệp rõ.
- Không xếp chồng PR (base phải là `main`): PR #3 từng merge vào nhánh cũ sau khi PR dưới đã vào `main`, nên code không tới `main`. Hai PR cùng sửa một file (vd. `docs/PROGRESS.md`) thì chờ PR trước merge, hoặc gom thay đổi tài liệu vào một PR riêng.
- Commit và PR chỉ đứng tên chủ repo: KHÔNG thêm `Co-Authored-By` hay bất kỳ dòng ghi công AI / Claude Code nào.
- Không đổi phạm vi: thấy việc ngoài yêu cầu thì ghi vào `docs/PROGRESS.md` (mục "Ý tưởng / việc phát sinh") thay vì tự làm.
- Kiến thức có thể đã cũ (Next.js 16, Prisma 7/8, Meilisearch, Tailwind 4): kiểm chứng bằng tài liệu đi kèm trong `node_modules` hoặc lệnh chỉ đọc, và nói rõ chỗ chưa chắc.
- Không tự cài công cụ hệ thống (Python, v.v.); hỏi trước.
- Cuối phiên: cập nhật `docs/PROGRESS.md` (đã xong, đang dở, bước tiếp theo, câu hỏi mở).

## Giao diện UI/UX
- Mọi tác vụ thiết kế, xây dựng, chỉnh sửa hoặc đánh giá giao diện: PHẢI dùng skill `ui-ux-pro-max` (`.claude/skills/ui-ux-pro-max/`) trước khi làm, và tuân theo `design-system/japeans/MASTER.md`.
- Stack khi tra cứu skill: `--stack nextjs`. Script cần Python 3; máy hiện chưa có Python nên tra trực tiếp các file CSV trong `data/` của skill và dùng phần Quick Reference trong SKILL.md, không tự cài Python.
- Màu chỉ dùng token (`bg-primary`, `text-muted-foreground`…), không viết mã hex trong component. Không dùng emoji làm icon. Tương phản ≥ 4.5:1 ở cả sáng và tối.

## Lệnh thường dùng
- Dịch vụ local (cần Docker Desktop): `npm run services:up` / `npm run services:down`.
- Dev server: `npm run dev` (http://localhost:3000). Kiểm tra kết nối: `/api/health`.
- Dữ liệu: `npm run data:download` rồi `npm run data:import` (~3 phút; gồm `data:import:kanji`, `data:import:words`, `data:index`).
- Dịch nghĩa bằng AI: `npm run ai:translate -- --limit 100` (thử), `--mode batch` (giá 50%), `--collect <batch_id>`, `--max-usd <n>`. Tốn tiền: chỉ chạy khi chủ repo yêu cầu.
- Prisma: `npm run db:migrate -- --name <tên>`, `npm run db:generate`, `npm run db:studio`.
- Test: `npm test` (một lần) hoặc `npm run test:watch`.
- Kiểm tra đầy đủ (giống CI): `npm run lint && npm run typecheck && npm test && npx next build`.

## Định nghĩa "xong" của một giai đoạn
Lint, typecheck, build và test xanh; đã kiểm tra trên trình duyệt theo tiêu chí trong `docs/PLAN.md`; không vi phạm nguyên tắc bất biến; `docs/PROGRESS.md` đã cập nhật.
