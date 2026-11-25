# Japeans

Web học tiếng Nhật cho người Việt. Kế hoạch sản phẩm: [docs/PLAN.md](docs/PLAN.md).

## Chạy local

Yêu cầu: Node.js 20+, Docker Desktop.

```bash
npm install
cp .env.example .env        # nếu chưa có .env
npm run services:up         # Postgres + Meilisearch + Redis
npm run db:migrate          # áp dụng migration
npm run dev                 # http://localhost:3000
```

Kiểm tra kết nối: http://localhost:3000/api/health

## Cấu trúc

```
src/app/            Next.js App Router (trang + API routes)
src/lib/db.ts       Prisma client dùng chung
prisma/             schema.prisma + migrations
scripts/import/     script nạp JMdict, KANJIDIC2, KRADFILE, KanjiVG, Tatoeba
data/raw/           file dữ liệu tải về (không commit)
docs/               tài liệu sản phẩm
```

## Ghi nguồn dữ liệu
JMdict/KANJIDIC2/KRADFILE © EDRDG (CC BY-SA 4.0), KanjiVG © Ulrich Apel (CC BY-SA 3.0), Tatoeba (CC BY 2.0 FR).
