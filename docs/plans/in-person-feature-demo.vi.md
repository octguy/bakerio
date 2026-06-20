# Bakerio — Demo tính năng trực tiếp (Kế hoạch & Kịch bản)

> **Đối tượng:** hội đồng học thuật / chấm điểm môn học — chứng minh cả độ rộng kỹ thuật *lẫn* việc từng tính năng chạy được end-to-end.
> **Môi trường:** cụm production đã triển khai (HTTPS thật, định tuyến theo domain).
> **Phạm vi:** tour đầy đủ — web công khai → luồng đặt hàng của khách → console quản trị nội bộ → kiến trúc.
> **Định dạng:** ~40 phút demo sâu + Hỏi đáp, lồng các ghi chú kiến trúc trong từng phần.
> **Trạng thái các dữ kiện bên dưới:** đã kiểm chứng với bản triển khai đang chạy và mã seed ngày 2026-06-15.

---

## 0. Tài liệu này là gì

Một **sổ tay thao tác + kịch bản nói** để người demo bám theo khi trình bày thật. Mỗi phần có bốn nhãn:

- **LÀM** — thao tác click / điều hướng cụ thể.
- **NÓI** — ý cần nói (diễn đạt tự nhiên, đừng đọc nguyên văn).
- **TẠI SAO** — ghi chú kiến trúc để lồng vào cho hội đồng học thuật.

Mục tiêu trước hội đồng: cho thấy một sản phẩm liền mạch *và* phần kỹ thuật phía sau nó (toàn vẹn giao dịch, RBAC, nhắn tin bất đồng bộ, i18n, CI/CD).

---

## 1. URL môi trường thật (đã xác minh truy cập được + đã seed, 2026-06-15)

| Bề mặt | URL | Ghi chú |
|---|---|---|
| Web công khai (branding) | `https://thinhuit.id.vn` | Static export, host riêng. Trả về `200`. |
| Cửa hàng cho khách (`order`) | `https://order.bakerio.thinhuit.id.vn` | Next.js, có tiền tố ngôn ngữ (`/en`, `/vi`). Root `307` → trang chủ theo locale. |
| Quản trị nội bộ (`console`) | `https://console.bakerio.thinhuit.id.vn` | Root `307` → `/login` nếu chưa đăng nhập. |
| Backend API | `https://api.bakerio.thinhuit.id.vn/api/v1` | `GET /branch` là **công khai** và trả về **10 chi nhánh** — prod đã có dữ liệu seed. |
| Swagger UI | `https://api.bakerio.thinhuit.id.vn/swagger/index.html` | Xác nhận khi kiểm tra trước; dùng trong phần kiến trúc. |

---

## 2. Thẻ tra cứu — để trên màn hình phụ / in ra

### Tài khoản (mọi tài khoản seed đều dùng mật khẩu `123456`)

| Email | Vai trò | Dùng ở đâu trong demo |
|---|---|---|
| `customer1@bakerio.com` | khách hàng | Khách **chính** cho luồng đặt hàng |
| `customer2@bakerio.com`, `customer3@bakerio.com` | khách hàng | Dự phòng để xoay vòng voucher (xem cảnh báo bên dưới) |
| `alice@bakerio.com` … `tina@bakerio.com` | khách hàng | 20 tài khoản khách dự phòng nữa |
| `superadmin@bakerio.com` | super_admin (`*:*:all`) | Toàn quyền back-office trên console |
| `productmanager@bakerio.com` | product_manager | Console: catalog + voucher, **không** có thao tác chi nhánh (dùng để demo phạm vi quyền) |
| `manager1@bakerio.com` | branch_manager — *District 1, Saigon Square* | Góc nhìn console bị cấp chi nhánh |
| `staff1a@bakerio.com` | branch_staff — *Quận 1* | Quyền cấp nhân viên |

> Quy ước tài khoản nhân sự chi nhánh: `manager{1..10}@bakerio.com`, `staff{1..10}{a..d}@bakerio.com`. Chỉ số `N` ứng với chi nhánh thứ N trong danh sách bên dưới (vì vậy `manager1` = District 1 Saigon Square).

### Voucher (ma trận demo)

| Mã | Tác dụng | Dùng để chứng minh |
|---|---|---|
| `WELCOME10` | Giảm 10%, không trần, không tối thiểu | happy-path |
| `SWEET20` / `LOYAL25` | Giảm 20% / 25% | happy-path với mức giảm lớn hơn |
| `CAP50K` | Giảm 50%, **trần 50.000₫** | Tính toán mức trần — mức giảm dừng ở ngưỡng trần khi giỏ hàng lớn |
| `SPEND200K` | Giảm 20% (trần 60k), **tổng phụ tối thiểu 200.000₫** | Điều kiện tổng phụ tối thiểu: dưới 200k bị từ chối, trên 200k được chấp nhận |
| `EXPIRED10` | Khung thời gian đã qua | Luồng lỗi — bị từ chối |
| `INACTIVE10` | `is_active = false` | Luồng lỗi — bị từ chối |

> ⚠️ **Mỗi khách chỉ đổi mã được một lần** (`UNIQUE (voucher_id, user_id)`). Mã nào `customer1` đã dùng trong lúc tập dượt sẽ bị từ chối là *đã sử dụng*. **Kế hoạch xoay vòng:** lúc tập dượt bằng `customer2`/`customer3`; ngày demo dùng một mã happy-path *chưa* tiêu trên `customer1`. Ghi lại để khỏi nhầm.

### Chi nhánh (10, seeded; target cho định tuyến gần nhất)

District 1 — Saigon Square · District 3 — Ben Thanh · District 4 — Khanh Hoi · District 5 — Cho Lon · District 7 — Phu My Hung · District 10 — Su Van Hanh · Tan Binh — Cong Hoa · Phu Nhuan — Phan Xich Long · Binh Thanh — Hang Xanh · Thu Duc — Linh Trung.

> Địa chỉ đã lưu mặc định của `customer1` là **12 Nguyen Hue, Quan 1** → chi nhánh hợp lệ gần nhất là **District 1 — Saigon Square** (~0,3 km) → phí giao hàng rơi vào bậc **≤3 km / 15.000₫**. Dùng đây làm ví dụ giao hàng cụ thể.

### Dữ kiện nhanh về catalog (để nói)

10 danh mục (Breads, Cakes, Pastries, Drinks, Cookies, Sandwiches, Coffee, Hot Drinks, Pizza, Donuts), ~80 sản phẩm lưu theo VND nguyên (ví dụ Baguette 25.000₫, Croissant 35.000₫, Tiramisu 95.000₫, Black Forest 130.000₫, pizza Margherita 150.000₫). ~300 đơn hàng lịch sử trải dài ~2 năm → biểu đồ thống kê có hình dạng thật ở day / week / month / year.

### Dữ kiện nhanh về bảo mật (để nhấn mạnh nếu giảng viên hỏi)

- **Authentication boundary:** browser không giữ JWT trong JavaScript phía client; phía giao diện gọi qua proxy phía server / route API, backend nhận request đã xác thực.
- **JWT + đăng xuất:** token ký bằng HS256; đăng xuất đưa vào danh sách chặn `jti` trong Redis để token đã đăng xuất không dùng lại được.
- **RBAC:** quyền dạng chuỗi phẳng (`order:view:branch`, `voucher:manage:all`, `*:*:all`); middleware kiểm mọi route được bảo vệ, không chỉ ẩn nút trên UI.
- **Cấp chi nhánh:** branch_manager / branch_staff bị giới hạn phạm vi theo vai trò ở backend; tự sửa URL hoặc `branch_id` cũng không vượt quyền được.
- **Transactional:** order confirm là giao dịch nguyên tử; trừ tồn kho dùng điều kiện `quantity >= n` để chống bán vượt quá tồn kho / race condition.
- **Safe outbox:** Business record + event `order.placed` commit cùng giao dịch; không có trạng thái “đơn đã tạo nhưng event mất” hoặc ngược lại.
- **Các biến môi trường:** không nhúng cứng secret trong repo; secret nằm ở VPS/secret/biến môi trường của GitHub Actions. Demo chỉ dùng thông tin đăng nhập seed.
- **Truyền tải:** endpoint công khai chạy qua HTTPS + Nginx + Let's Encrypt; Swagger chỉ để quan sát API contract, endpoint được bảo vệ vẫn cần xác thực.
- **Kiểm soát chặt chẽ:** lệnh đọc công khai được mở có chủ đích; route thay đổi dữ liệu cần xác thực + quyền.

---

## 3. Trình tự demo (≈40 phút + Hỏi đáp)

| # | Phần | Bề mặt | Thời lượng |
|---|---|---|---|
| 0 | Mở đầu & định khung | slide / terminal | 2 phút |
| 1 | Web công khai / branding | `thinhuit.id.vn` | 4 phút |
| 2 | Đặt hàng của khách (luồng trọng tâm) | `order.…` | 12 phút |
| 3 | Console quản trị nội bộ | `console.…` | 11 phút |
| 4 | RBAC + sự kiện trực tiếp liên ứng dụng | `console.…` | 5 phút |
| 5 | Kiến trúc & Swagger | bảng / Swagger | 5 phút |
| 6 | Kết & Hỏi đáp | — | 5+ phút |

---

## 4. Danh sách kiểm tra trước demo

**T-30 phút**

- [ ] Chạy kiểm tra truy cập từ một terminal bất kỳ:
  ```bash
  for u in https://thinhuit.id.vn \
           https://order.bakerio.thinhuit.id.vn \
           https://console.bakerio.thinhuit.id.vn \
           https://api.bakerio.thinhuit.id.vn/api/v1/branch; do
    printf "%-50s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$u")"
  done
  ```
  Kỳ vọng `200 / 307 / 307 / 200`. `api/v1/branch` phải trả về 10 chi nhánh (`curl -s …/branch | head`).
- [ ] Login một lần vào `console` bằng `superadmin@bakerio.com` và một lần vào `order` bằng `customer1@bakerio.com` để **làm nóng phiên và xác nhận mật khẩu**.
- [ ] Chọn và ghi lại **một happy-path voucher** sẽ dùng trực tiếp (chưa dùng trên `customer1`).
- [ ] Mở sẵn tab trình duyệt theo thứ tự demo; zoom ~125%; tắt extension gây nhiễu.
- [ ] Chuẩn bị hai ngữ cảnh trình duyệt: một **thường** (giữ phiên đăng nhập khách) và một **ẩn danh/khách** (cho các tình huống chưa đăng nhập / bị từ chối RBAC) để các phiên không xung đột.
- [ ] Chuẩn bị sẵn tab DevTools/Mạng hoặc Swagger để chỉ ra ranh giới bảo mật: request chưa xác thực bị `401/403`, còn request hợp lệ đi qua proxy phía server.

**T-10 phút**

- [ ] Tắt thông báo hệ điều hành/Slack/email (Do Not Disturb).
- [ ] Mở sẵn: trang chủ `order`, `console` `/login`, Swagger UI.
- [ ] Mở sẵn **bộ dự phòng** trong một tab ẩn — ảnh chụp từng màn hình quan trọng + bản quay màn hình toàn bộ luồng đặt hàng (xem `frontend/playwright-report-deployed/` và `frontend/e2e/visual/*` để có sẵn ảnh chụp).

**T-2 phút**

- [ ] Tải lại trang chủ `order`; xác nhận danh sách chi nhánh "**N open**" hiển thị (SSR nguội có thể chậm ở lần tải đầu — hãy làm nóng ngay bây giờ, đừng để trước mặt cả phòng).
- [ ] Mạng: chuẩn bị hotspot điện thoại làm dự phòng.

---

## 5. Kịch bản demo

### Phần 0 — Mở đầu & định khung (2 phút)

**NÓI:** "Bakerio là nền tảng thương mại điện tử cho chuỗi tiệm bánh trong phạm vi một thành phố: TP. Hồ Chí Minh. Khách duyệt catalog, được định tuyến tới chi nhánh gần nhất thực sự đủ khả năng đáp ứng đơn, thanh toán với voucher và hạng thành viên, rồi theo dõi đơn — trong khi nhân viên vận hành toàn bộ qua một console riêng. Tất cả chạy trên một Go backend phía sau ba ứng dụng Next.js."

**LÀM:** Cho xem một slide (hoặc chỉ nói) về hình dạng hệ thống: **`web` (marketing công khai) · `order` (khách) · `console` (nhân viên/quản trị)**, tất cả dùng chung một Go **monolith mô-đun** API.

**TẠI SAO (đặt luận điểm):** "Một backend triển khai duy nhất, một database Postgres với mỗi module một schema, ba frontend triển khai độc lập. em sẽ trình diễn tính năng trước, rồi bóc dần xuống phần kiến trúc khiến các luồng đó an toàn."

**NÓI (móc nối độ chỉn chu kỹ thuật):** "Mọi luồng em sắp demo đều có kiểm thử end-to-end tự động bằng Playwright — gồm cả khả năng tiếp cận và bộ kiểm thử hồi quy giao diện — và được đưa lên qua GitHub Actions build→push→deploy pipeline. Riêng phần bảo mật không chỉ nằm ở UI: xác thực, RBAC, cấp chi nhánh và an toàn giao dịch đều được cưỡng chế ở backend."

---

### Phần 1 — Web công khai / branding (4 phút) · `https://thinhuit.id.vn`

**LÀM:**
1. Vào trang chủ — hero + thanh điều hướng header + footer.
2. Toggle **language** (VI ⇄ EN) để cho thấy quốc tế hóa đầy đủ.
3. Điều hướng → **Menu** (phân loại sản phẩm), → **Locations** (TP.HCM, bản đồ chi nhánh)
4. Vào một URL sai (ví dụ `/nope`) → trang 404 thân thiện **"loaf not found"**. Mở `/sitemap.xml` và `/robots.txt`.

**NÓI:** "Đây là bề mặt marketing — render phía server, song ngữ đầy đủ, sẵn sàng SEO với sitemap và robots, và hỗ trợ tiếp cận (mỗi ảnh đều có alt text, điều hướng dùng được bằng bàn phím)."

**TẠI SAO:** "Static export được host riêng khỏi tầng ứng dụng — rẻ để phục vụ, không cần server. Cùng dữ liệu catalog từ backend nuôi trang này. Điểm bảo mật: đây là bề mặt đọc công khai, chỉ đọc dữ liệu được phép công khai; thao tác ghi/sửa như order/voucher/admin luôn đi qua xác thực + RBAC."

---

### Phần 2 — Đặt hàng của khách: luồng trọng tâm (12 phút) · `https://order.bakerio.thinhuit.id.vn`

Đây là phần trọng tâm. Chạy như một câu chuyện liên tục.

**2a. Duyệt với tư cách khách (chưa đăng nhập)**

**LÀM:**
1. Mở trang chủ `order` → màn hình chọn chi nhánh hiển thị "**N open**" và các chế độ **Pickup / Delivery**.
2. Click một chi nhánh (ví dụ **District 1 — Saigon Square**) → chuyển tới `/menu`.
3. Mở một sản phẩm (ví dụ **Tiramisu**) → trang chi tiết với thư viện ảnh + giá theo VND.

**NÓI:** "Lệnh đọc catalog và chi nhánh là công khai — không cần đăng nhập để duyệt. Giá là tiền đồng Việt Nam thật."

**TẠI SAO:** "Trang chủ là React Server Component; chi nhánh được fetch phía server tại thời điểm request. Các lệnh đọc catalog công khai giúp cửa hàng nhanh và crawl được."

**2b. Thêm vào giỏ → gặp cổng xác thực**

**LÀM:**
4. Trên sản phẩm, tăng số lượng, **Thêm vào giỏ** → toast xác nhận.
5. Click **View cart** / vào `/cart`. Nếu đang là khách chưa đăng nhập, bước này **chuyển hướng tới `/login`**.
6. Đăng ký bằng **`23521511@gm.uit.edu.vn` / `123456`**, quay lại đúng luồng.

**NÓI:** "Duyệt mở; giỏ hàng và thanh toán được bảo vệ. Để ý cổng xác thực kích hoạt đúng tại ranh giới thanh toán."

**TẠI SAO:** "Giỏ hàng là trạng thái phía client (Zustand) nên sống sót qua lần chuyển qua đăng nhập. Token xác thực không bao giờ chạm JavaScript phía client — mỗi ứng dụng có một route `proxy` phía server chuyển tiếp các lời gọi đã xác thực tới backend, nên JWT luôn nằm phía server. Điểm bảo mật để nhấn mạnh: dữ liệu được bảo vệ không dựa vào việc ẩn nút; nếu gọi thẳng API thiếu token sẽ nhận `401`, có token nhưng thiếu quyền sẽ nhận `403`."

**2c. Thanh toán — định tuyến, giao hàng, voucher, thành viên**

**LÀM:**
7. Vào **Thanh toán**. Cho xem hai chế độ: **Pay at counter (lấy tại quầy)** và **Delivery (giao hàng)**.
8. Chọn **Delivery** → dùng địa chỉ đã lưu của `customer1` (**12 Nguyen Hue, Quan 1**). Chỉ ra kết quả **định tuyến chi nhánh gần nhất** (District 1 — Saigon Square) và **phí ship** (bậc ≤3 km → 15.000₫).
9. **Ma trận demo voucher** — áp từng mã và thuyết minh kết quả:
   - `WELCOME10` → giảm 10%, không trần → mức giảm rõ ràng. *(Dùng mã chưa-dùng đã chọn trước ở đây.)*
   - `CAP50K` → giảm 50% nhưng **trần 50.000₫** → mức giảm dừng ở ngưỡng trần.
   - Giảm giỏ hàng xuống dưới 200.000₫, áp `SPEND200K` → **bị từ chối: chưa đạt tổng phụ tối thiểu**; thêm món lại cho vượt 200k → **được chấp nhận**.
   - `EXPIRED10` và `INACTIVE10` → **bị từ chối** (hết hạn / đã tắt).
10. Chỉ vào **hạng thành viên** ở trang hồ sơ/thành viên (BRONZE / SILVER / GOLD theo tổng chi tiêu tích lũy).
11. Đặt đơn → màn hình xác nhận **"Order placed"** + link **Track order**.
12. Theo link **Track order**; mở **chuông thông báo** → có thông báo biên nhận đơn hàng.

**NÓI:** "Một màn hình kích hoạt bốn quy tắc tính giá — phần trăm thường, phần trăm có trần, điều kiện tổng phụ tối thiểu, và mã bị từ chối/hết hạn — cộng thêm phí giao hàng theo khoảng cách và thành viên. Mã đơn có dạng `BKO-YYYYMMDD-…`."

**TẠI SAO (điểm nhấn lớn):** "Xác nhận đơn là **một atomic Postgres transaction duy nhất**: trừ tồn kho ở chi nhánh đã chọn, chèn đơn và các dòng hàng kèm ảnh chụp giá (snapshot), đổi voucher, cập nhật hạng thành viên, và ghi các sự kiện miền vào bảng outbox — tất-cả-hoặc-không-gì. Khách không bao giờ thấy trạng thái áp dụng nửa vời. Và định tuyến chi nhánh gần nhất chỉ xét chi nhánh *thực sự còn hàng* cho mọi món trong giỏ. Điểm bảo mật/đồng thời: trừ tồn kho dùng cập nhật có điều kiện kiểu `WHERE quantity >= n`, nên hai khách tranh món cuối cùng thì chỉ một giao dịch thắng; voucher redemption có ràng buộc unique theo người dùng để chống dùng hai lần."

**BACKUP:**
- Voucher happy-path bị từ chối vì *đã sử dụng* → đổi sang `SWEET20`/`LOYAL25`, hoặc hoàn tất bằng `customer2`. (Đây là bẫy số 1 khi demo trực tiếp — xem cảnh báo xoay vòng ở §2.)
- "Order placed" treo > ~10 giây → bước xác nhận là giao dịch nguyên tử; chờ một nhịp, rồi tải lại trang đơn hàng để cho thấy nó đã vào. Nếu kẹt thật thì cắt sang clip đã quay.
- Một món hết hàng → chọn sản phẩm hoặc chi nhánh khác; nhân tiện nói rõ đó chính là tính hợp lệ định tuyến.

---

### Phần 3 — Console quản trị nội bộ: tiếp nhận đơn vừa đặt (11 phút) · `https://console.bakerio.thinhuit.id.vn`

Phần này **không bắt đầu lại như một tour admin rời rạc**. Nó nối thẳng từ màn hình **Order placed / Track order** ở Phần 2: khách vừa hoàn tất đơn, hệ thống phải đẩy việc tiếp nhận sang đúng chi nhánh.

**LÀM:**
1. Giữ màn hình khách ở **Track order** hoặc chuông thông báo **Order placed**. Nói rõ mã đơn `BKO-YYYYMMDD-…`, chi nhánh được định tuyến là **District 1 — Saigon Square**.
2. Chuyển sang `console` trong cửa sổ ẩn danh/phiên riêng. Đăng nhập bằng **`manager1@bakerio.com` / `123456`** — branch_manager của District 1.
3. Mở **thông báo / order inbox / danh sách đơn mới của chi nhánh**. Bắt đầu ngay tại **order notification**: đơn vừa đặt ở Phần 2 xuất hiện cho quản lý chi nhánh.
4. Mở chi tiết đơn: khách, dòng hàng, phương thức nhận hàng/giao hàng, địa chỉ, phí ship, voucher/giảm giá, tổng tiền, trạng thái hiện tại. Đối chiếu nhanh với màn hình khách đang mở.
5. Thực hiện bước vận hành đầu tiên nếu UI cho phép: **accept/confirm/mark preparing**. Quay lại màn hình khách → trạng thái theo dõi đơn cập nhật hoặc có thông báo mới.
6. Từ chi tiết đơn, chuyển sang **tồn kho theo chi nhánh** để chỉ ra lượng tồn vừa bị trừ bởi transaction đặt hàng. Nói rõ đây là cùng bảng `branch_products` mà Phần 2 dùng để quyết định chi nhánh đủ hàng.
7. Mở nhanh các màn hình hỗ trợ sau khi đơn đã được tiếp nhận:
   - **Catalog & danh mục:** dữ liệu sản phẩm mà khách vừa mua.
   - **Voucher:** mở `CAP50K`/mã vừa dùng để thấy rule phần trăm, trần, điều kiện.
   - **Thống kê:** dashboard ngày/tuần/tháng/năm; đơn mới là một phần của pipeline thống kê cùng ~300 đơn lịch sử.

**NÓI:** "Ta vừa chuyển vai: cùng một đơn hàng, lúc nãy là góc nhìn khách; bây giờ là góc nhìn quản lý chi nhánh nhận việc. Điểm quan trọng là em không đi tìm thủ công trong toàn hệ thống — thông báo đưa đơn tới đúng branch manager của chi nhánh được định tuyến. Từ đây quản lý thấy đủ thông tin để vận hành: món, địa chỉ, phí giao hàng, voucher, tổng tiền và trạng thái."

**TẠI SAO:** "Order completion không dừng ở màn hình cảm ơn. Khi giao dịch confirm commit, backend đồng thời ghi đơn, trừ tồn kho, snapshot giá, redeem voucher, cập nhật thành viên và ghi event `order.placed` vào outbox. Worker phát event đó để console của chi nhánh nhận notification. Vì dữ liệu nghiệp vụ và event commit cùng transaction, quản lý không gặp trạng thái 'có thông báo nhưng chưa có đơn' hoặc 'có đơn nhưng mất thông báo'. Branch manager chỉ nhận đơn thuộc branch của mình; scope này được cưỡng chế ở backend, không phụ thuộc vào UI."

---

### Phần 4 — RBAC + console super-admin (5 phút)

Phần này khép lại câu chuyện console: sau khi branch manager nhận đơn ở Phần 3, cho thấy cùng hệ thống dưới góc nhìn toàn quyền. Không cần đi sâu từng CRUD — chỉ quét nhanh để chứng minh phạm vi quản trị.

**LÀM:**
1. Trong cửa sổ **ẩn danh**, vào `console` `/login` và đăng nhập bằng **`customer1@bakerio.com`** → **bị từ chối / bật lại trang login** (khách không có quyền vào console).
2. Đăng nhập bằng **`manager1@bakerio.com`** nếu chưa ở sẵn phiên Phần 3 → nhắc lại góc nhìn **cấp chi nhánh**: chỉ đơn/nhân viên/tồn kho của District 1.
3. Đăng xuất hoặc mở phiên khác, đăng nhập bằng **`superadmin@bakerio.com` / `123456`** → dashboard tổng quan.
4. Quét nhanh các màn hình super-admin, không thao tác chi tiết:
   - **Orders:** thấy đơn vừa đặt trong toàn hệ thống, không chỉ một chi nhánh.
   - **Catalog / Categories:** quản lý sản phẩm và danh mục.
   - **Branches / Inventory:** quản lý chi nhánh và tồn kho toàn chuỗi.
   - **Users / Staff / Roles:** gán vai trò, gán chi nhánh, xem phạm vi quyền.
   - **Vouchers:** quản lý mã giảm giá và rule áp dụng.
   - **Analytics:** thống kê ngày/tuần/tháng/năm.
5. Nếu còn thời gian, mở lại đơn vừa đặt từ super-admin để đối chiếu: cùng một đơn nhưng super-admin nhìn ở phạm vi toàn tổ chức, branch manager chỉ nhìn theo chi nhánh.

**NÓI:** "Đến đây ta có ba danh tính và ba phạm vi rõ ràng: khách không vào console; quản lý chi nhánh chỉ vận hành chi nhánh của mình; super-admin thấy toàn bộ hệ thống. Các màn hình còn lại là CRUD/quản trị chuẩn — sản phẩm, chi nhánh, tồn kho, nhân sự, voucher, thống kê — em chỉ lướt qua vì điểm kỹ thuật quan trọng là phạm vi quyền được áp từ backend."

**TẠI SAO:** "Quyền là flat string — ví dụ `order:view:branch`, `voucher:manage:all`, `*:*:all` cho super-admin — được middleware kiểm trên mọi route được bảo vệ, lấy từ Redis. Đây là phân quyền phía server: khách hàng không thể vào console dù biết URL; branch_manager không xem được toàn hệ thống dù sửa query/URL; super-admin có quyền toàn cục có chủ đích."

---

### Phần 5 — Kiến trúc & Swagger (5 phút)

**LÀM:**
1. Mở **Swagger UI** (`…/swagger/index.html`) — cuộn qua các endpoint được nhóm (xác thực, sản phẩm, đơn hàng, voucher, thống kê, admin).
2. Tùy chọn mở rộng `POST /orders/confirm` và `POST /admin/seed-demo` để cho thấy annotation là source of truth của API.
3. Nếu muốn nhấn bảo mật: chỉ ra nhóm endpoint công khai (`GET /branch`, lệnh đọc catalog) vs thao tác ghi/sửa được bảo vệ; nói rõ Swagger hiển thị API contract, không vượt qua xác thực.
4. Draw (trên bảng hoặc slide) vòng đời đơn hàng: `find-branches → select-branch → confirm (giao dịch nguyên tử) → outbox → fanout thông báo`.

**NÓI:** "Bên dưới: một monolith mô-đun viết bằng Go — một binary, một database, mỗi module một schema (xác thực, product, order, voucher, thành viên, …). Các module nói chuyện qua minimal interface và domain events, không bao giờ tương tác trực tiếp vào bảng của nhau. Đó là điều giữ cho monolith dễ tái cấu trúc thay vì biến thành một mớ hỗn độn."

**TẠI SAO / các điểm nói sẵn:**
- **Modular monolith, mỗi module một schema** — một module chỉ ghi vào schema của chính nó (+ outbox dùng chung).
- **Outbox giao dịch** — đảm bảo tính toàn vẹn đứng sau Phần 4.
- **JWT (HS256) + RBAC dựa trên quyền**, đưa vào danh sách chặn JTI trong Redis cho đăng xuất.
- **Phân quyền phía server:** middleware kiểm tra trên route được bảo vệ; tầng service cưỡng chế phạm vi chi nhánh để chống IDOR / sửa `branch_id`.
- **Giao dịch + an toàn ràng buộc:** trừ tồn kho có điều kiện chống bán vượt tồn kho; ràng buộc duy nhất khi đổi voucher chống đổi voucher lặp; dòng đơn hàng lưu ảnh chụp giá để chống giá đổi sau khi đặt.
- **Outbox integrity:** dữ liệu nghiệp vụ + sự kiện commit cùng giao dịch; worker publish bất đồng bộ nhưng không làm mất nhất quán.
- **i18n** (next-intl, VI/EN), **múi giờ của TP.HCM**, **tiền VND theo kiểu số nguyên**.
- **Vận hành:** Docker Compose, Nginx + Let's Encrypt TLS, GitHub Actions CI/CD, MinIO cho ảnh, RabbitMQ cho nhắn tin.
- **Bảo mật:** không hard-code thông tin đăng nhập/secret trong mã nguồn; secrets nằm trên VPS/GitHub Actions biến môi trường; tài khoản demo công khai là dữ liệu seed có chủ đích.