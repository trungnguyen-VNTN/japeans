import Link from "next/link";
import { Compass } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <Compass size={48} className="text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-bold text-card-foreground">Không tìm thấy trang</h1>
      <p className="text-muted-foreground">
        Trang này không tồn tại, đã bị xóa, hoặc bạn không có quyền xem.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn-primary">
          Về trang chủ
        </Link>
        <Link href="/hoc-phan" className="btn-secondary">
          Học phần
        </Link>
      </div>
    </div>
  );
}
