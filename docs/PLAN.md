# Japeans — Kế hoạch sản phẩm

Web học tiếng Nhật cho người Việt: tra từ → hiểu kanji → nhớ lâu.

## Module

| Mã | Module | Nội dung chính |
|---|---|---|
| A | Tra cứu từ vựng | Tìm bằng kanji/kana/romaji/tiếng Việt/Hán Việt, nghĩa, JLPT, phát âm, pitch accent |
| B | Cách dùng từ | Câu ví dụ (furigana + dịch), collocation, AI giải thích sắc thái, phân tích câu |
| C | Kanji & bộ thủ | On/Kun/Hán Việt, nét viết (KanjiVG), cây phân rã bộ thủ, AI mnemonic, tra theo bộ |
| D | Học & ghi nhớ | Sổ tay, SRS (FSRS), bộ từ JLPT, quiz, luyện viết |
| E | Ngữ pháp | Mẫu ngữ pháp theo JLPT, bảng chia động từ |
| F | Tiện ích | Bảng kana, số đếm, đọc báo với pop-up tra từ, browser extension |
| G | Tài khoản & gamification | Đăng nhập, streak, XP, thống kê |
| H | Học phần kiểu flashcard set | Tự tạo/import/AI tạo bộ thẻ; chế độ Lật thẻ, Học, Viết, Chính tả, Viết tay, Kiểm tra, Ghép nhanh; lớp học; liên kết SRS |

## Nguyên tắc AI
- Phân rã bộ thủ lấy từ dữ liệu chuẩn (KRADFILE / IDS), **không** để AI đoán.
- AI chỉ diễn giải (mnemonic, sắc thái, so sánh). Kết quả cache trong `AIContent`, có status PENDING/APPROVED/REJECTED và nút báo sai.
- Nghĩa tiếng Việt: dịch batch từ JMdict bằng AI → người duyệt (`Sense.viReviewed`), ưu tiên ~10k từ phổ biến.

## Nguồn dữ liệu (kiểm tra license trước khi dùng thương mại)
JMdict, KANJIDIC2, KRADFILE/RADKFILE (EDRDG, CC BY-SA) · KanjiVG (CC BY-SA 3.0) · Tatoeba (CC BY 2.0 FR) · CHISE IDS · Sudachi/kuromoji (tách từ). Cần trang ghi nguồn.

## Lộ trình
| Giai đoạn | Thời gian | Kết quả |
|---|---|---|
| 0. Discovery | 1–2 tuần | Phỏng vấn người học, chốt MVP, wireframe |
| 1. Data foundation | 2–3 tuần | Script import dữ liệu vào Postgres, index Meilisearch |
| 2. MVP tra cứu | 3–4 tuần | Module A, trang kanji cơ bản, trang SEO `/tu/[word]`, `/kanji/[char]` |
| 3. AI kanji & cách dùng | 2–3 tuần | Module C, B |
| 4a. Học phần cơ bản | 2–3 tuần | Tạo/sửa/import set, tự điền từ từ điển, Lật thẻ/Học/Viết |
| 4b. Kiểm tra, game, SRS | 2 tuần | Kiểm tra, Ghép nhanh, FSRS |
| 5. Beta | 2 tuần | Tester, sửa lỗi, admin duyệt AI |
| 6+. Mở rộng | — | Ngữ pháp, lớp học, đọc báo, extension, Premium |

## KPI
Lượt tra/ngày, traffic organic, retention D1/D7/D30, thẻ ôn/ngày, tỷ lệ nội dung AI bị báo sai < 2%, chi phí AI / người dùng hoạt động, tỷ lệ học phần công khai được clone.
