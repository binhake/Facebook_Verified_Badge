<div align="center">

<img src="icons/icon128.png" width="96" height="96" alt="Biểu tượng Facebook Verified Badge">

# Facebook Verified Badge

Extension trình duyệt gọn nhẹ, hiển thị **huy hiệu tích xanh trang trí** cạnh tên bạn trên Facebook — ở trang chủ và trang cá nhân.

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-0866ff)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![No permissions](https://img.shields.io/badge/permissions-none-brightgreen)
![Chromium](https://img.shields.io/badge/Chrome%20%7C%20Edge%20%7C%20Brave-supported-blue)

[English](README.md) · Tiếng Việt

</div>

> [!IMPORTANT]
> Huy hiệu **chỉ là hiển thị, chỉ có trên máy bạn**. Extension chỉ sửa trang trong trình duyệt *của bạn* — tài khoản **không** hề được xác minh và người khác **không** nhìn thấy huy hiệu. Đừng dùng nó để giả mạo tài khoản đã xác minh hay lừa người khác.

---

## Mục lục

- [Hình minh hoạ](#hình-minh-hoạ)
- [Tính năng](#tính-năng)
- [Cách hoạt động](#cách-hoạt-động)
- [Cài đặt](#cài-đặt)
- [Cấu hình](#cấu-hình)
- [Xử lý sự cố](#xử-lý-sự-cố)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Quyền riêng tư](#quyền-riêng-tư)
- [Giới hạn](#giới-hạn)
- [Đóng góp](#đóng-góp)
- [Giấy phép](#giấy-phép)

## Hình minh hoạ

![Trước và sau: header trang cá nhân và cột trái trang chủ](docs/images/preview.png)

| Trang | Vị trí huy hiệu | Kích thước |
|---|---|---|
| Trang chủ — `www.facebook.com/` hoặc `web.facebook.com/` (có `?…&…` vẫn được) | Tên bạn ở cột trái | 12 px |
| Trang cá nhân — `facebook.com/<username>` hoặc `profile.php?id=<id>` | Tên ở header, đứng trước ` (biệt danh)` nếu có | 24 px |

## Tính năng

- **Không xin quyền nào.** Chỉ có một content script chạy trên `www.facebook.com` và `web.facebook.com`; không background, không storage, không gửi request.
- **Giống hệt huy hiệu thật.** Markup chèn vào sao chép đúng cấu trúc huy hiệu của Facebook (cùng class, màu `--accent`), nên tự đổi theo giao diện sáng/tối.
- **Ai cài cũng chạy.** Tên tài khoản đang đăng nhập được đọc từ dữ liệu Facebook nhúng sẵn trong trang, không cần sửa code.
- **Hiểu SPA.** Facebook không tải lại trang khi chuyển trang; extension kiểm tra lại mỗi giây, gỡ huy hiệu cũ khi đổi URL và tự gắn lại nếu React vẽ lại phần tên.
- **An toàn với React.** Sửa trực tiếp text node có sẵn thay vì thay cả element, dựng huy hiệu bằng DOM API (không `innerHTML`) nên không xung đột React / Trusted Types.
- **Đa ngôn ngữ.** Tên, mô tả extension và tooltip huy hiệu có tiếng Anh và tiếng Việt (`_locales/`).

## Cách hoạt động

![Luồng: hẹn giờ, nhận dạng trang, tìm tên, chèn huy hiệu](docs/images/how-it-works.svg)

1. **Nhận dạng trang** theo `location.pathname`:
   - `/` hoặc `/home.php` → *trang chủ*
   - path 1 cấp trông giống username (5–50 ký tự `A–Z a–z 0–9 .`) hoặc `/profile.php?id=…` → *trang cá nhân*
   - các path dành riêng như `/groups`, `/watch`, `/marketplace`, `/reels`, … bị bỏ qua.
2. **Tìm element chứa tên.** Chỉ xét element có text *trực tiếp* đúng bằng tên, và bỏ qua mọi thứ nằm trong bài viết, feed, popup (`[role="article"]`, `[role="feed"]`, `[role="dialog"]`).

   | Trang | Thứ tự cách tìm |
   |---|---|
   | Trang chủ | 1. Tên tài khoản đang đăng nhập (từ `CurrentUserInitialData`), ưu tiên ở cột điều hướng bên trái · 2. Dự phòng: `span.x1lliihq` đầu tiên đang hiển thị và có chữ |
   | Trang cá nhân | 1. Tên trong `<title>` (`(3) Nguyễn Văn A \| Facebook`) · 2. Tên tài khoản đang đăng nhập trong `h1` / `[role="main"]` · 3. `span.x1lliihq` có chứa span biệt danh · 4. Text bất kỳ đang hiển thị trong `[role="main"] h1` |

   Cần nhiều cách vì Facebook không phải lúc nào cũng đổi `<title>` khi chuyển trang (có lúc vẫn để `(1) Facebook`), và DOM khác nhau giữa các tài khoản / bản thử nghiệm A/B.
3. **Chèn huy hiệu.** Text tên được chuẩn hoá thành `Tên&nbsp;`, huy hiệu được chèn trước span biệt danh (hoặc cuối element):

   ```html
   <span class="x1lliihq" data-fbvb="">
     Nguyễn Văn A&nbsp;
     <span data-fbvb-badge="">
       <div class="x1rg5ohu"><span class="xjp7ctv"><div tabindex="0">
         <span class="x3nfvp2 x11njtxf">
           <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" role="img" …>
             <title>Tài khoản đã xác minh</title><path d="…"/>
           </svg>
         </span>
       </div></span></div>
     </span>
     <span class="x1q74xe4 x1fcty0u"> (nguyenvana)</span>
   </span>
   ```

   `data-fbvb` / `data-fbvb-badge` đánh dấu chỗ đã sửa để không bao giờ chèn trùng.

## Cài đặt

Extension chưa có trên Chrome Web Store; cài ở chế độ nhà phát triển. Chạy được trên mọi trình duyệt nhân Chromium (Chrome, Edge, Brave, Opera, Cốc Cốc, …).

1. **Tải code**
   ```bash
   git clone https://github.com/binhake/Facebook_Verified_Badge.git
   ```
   hoặc tải ZIP trên GitHub (**Code → Download ZIP**) rồi giải nén.
2. **Mở trang quản lý extension**
   - Chrome / Brave / Cốc Cốc: `chrome://extensions`
   - Edge: `edge://extensions`
3. Bật **Developer mode** (Chế độ dành cho nhà phát triển).
4. Bấm **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục chứa `manifest.json`.
5. Mở hoặc tải lại Facebook.

Cập nhật: kéo code mới (hoặc giải nén ZIP mới đè lên thư mục cũ), bấm **Reload** trên thẻ extension rồi tải lại Facebook.

> [!NOTE]
> Hãy chọn **thư mục**, đừng cài file `.crx`. Trình duyệt Chromium tự tắt các extension `.crx` không đến từ cửa hàng chính thức.

## Cấu hình

Các thiết lập là hằng số ở đầu file [`src/content.js`](src/content.js). Sửa xong bấm **Reload** ở `chrome://extensions`.

| Hằng số | Mặc định | Ý nghĩa |
|---|---|---|
| `ONLY_OWN_PROFILE` | `false` | `true`: chỉ gắn huy hiệu trên trang cá nhân của chính tài khoản đang đăng nhập. `false`: gắn trên mọi trang cá nhân bạn mở. |
| `DEBUG` | `false` | In từng bước ra Console (DevTools) với tiền tố `[FBVB]`. |
| `RUN_INTERVAL_MS` | `1000` | Chu kỳ kiểm tra lại trang (ms). Nhỏ hơn = huy hiệu hiện nhanh hơn sau khi chuyển trang; lớn hơn = nhẹ máy hơn. |
| `VIEWER_MAX_TRIES` | `10` | Số lượt thử đọc tên tài khoản đang đăng nhập trước khi bỏ cuộc (mỗi lần tải trang). |
| `BADGE_SIZE` | `{ home: 12, profile: 24 }` | Kích thước huy hiệu (px) theo loại trang. |

## Xử lý sự cố

**Không thấy huy hiệu**

1. Kiểm tra extension đang bật và đã **Reload** sau khi sửa.
2. Đảm bảo URL là trang được hỗ trợ (xem [Hình minh hoạ](#hình-minh-hoạ)); `m.facebook.com` và các path như `/username/photos` không được hỗ trợ.
3. Đặt `DEBUG = true`, Reload extension, tải lại Facebook, mở DevTools (<kbd>F12</kbd>) → **Console** và lọc `FBVB`:

   | Log | Ý nghĩa |
   |---|---|
   | *(không có gì)* | Content script không chạy — kiểm tra extension đã bật chưa. |
   | `Unsupported page: /…` | URL không phải trang chủ hay trang cá nhân. |
   | `Signed-in user not found yet …` | Chưa đọc được dữ liệu tài khoản; trang chủ dùng cách dự phòng (span tên đầu tiên). |
   | `Profile: name not found …` | Không tìm thấy element phù hợp. Log liệt kê title, tên tài khoản và mọi `h1` — hãy gửi kèm khi tạo issue. |
   | `Badge (24px) added next to "…"` | Đã chạy đúng. |

**Đoạn lệnh chẩn đoán**

Khi tạo issue, hãy chạy đoạn dưới trong Console **ngay trên trang không hiện huy hiệu** rồi dán kết quả (đã tự copy vào clipboard). Đoạn lệnh chỉ đọc trang, không gửi gì đi đâu.

```js
(() => {
  const norm = t => t.replace(/[\u00a0\s]+/g, ' ').trim();
  const own = el => norm([...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join(''));
  const path = el => {
    const p = [];
    for (let e = el; e && e !== document.body && p.length < 8; e = e.parentElement) {
      p.push(e.tagName.toLowerCase()
        + (e.getAttribute('role') ? '[role=' + e.getAttribute('role') + ']' : '')
        + (e.classList.contains('x1lliihq') ? '.x1lliihq' : ''));
    }
    return p.reverse().join(' > ');
  };
  let viewer = null;
  for (const s of document.scripts) {
    const m = s.textContent.match(/"CurrentUserInitialData",\[\],\{[^{}]*?"NAME":"((?:[^"\\]|\\.)*)"/);
    if (m) { viewer = JSON.parse('"' + m[1] + '"'); break; }
  }
  const lines = [
    'URL: ' + location.href,
    'title: ' + document.title,
    'viewer: ' + viewer,
    'h1 count: ' + document.querySelectorAll('h1').length,
    ...[...document.querySelectorAll('h1')].map(h =>
      '  ' + path(h) + ' | visible=' + (h.getClientRects().length > 0) + ' | ' + h.outerHTML.slice(0, 400))
  ];
  if (viewer) {
    const hits = [...document.querySelectorAll('body *')].filter(e => own(e) === norm(viewer));
    lines.push('elements whose text = viewer name: ' + hits.length);
    hits.slice(0, 15).forEach(e =>
      lines.push('  ' + path(e) + ' | visible=' + (e.getClientRects().length > 0) + ' | ' + e.outerHTML.slice(0, 300)));
  }
  const report = lines.join('\n');
  console.log(report);
  copy(report);
})();
```

> [!TIP]
> Chrome có thể yêu cầu gõ `allow pasting` trước khi cho dán code vào Console. Facebook cũng hiện cảnh báo lớn "Stop!" ở đó — cảnh báo nhắm vào các đoạn script đánh cắp tài khoản; luôn đọc kỹ một đoạn lệnh trước khi chạy.

## Cấu trúc dự án

```
Facebook_Verified_Badge/
├── manifest.json          # Manifest V3, chỉ có content script
├── src/
│   └── content.js         # Toàn bộ logic: nhận dạng trang, tìm tên, chèn huy hiệu
├── _locales/
│   ├── en/messages.json   # Chuỗi tiếng Anh (mặc định)
│   └── vi/messages.json   # Chuỗi tiếng Việt
├── icons/                 # Icon 16 / 48 / 128 px
├── docs/images/           # Hình minh hoạ cho README
├── CHANGELOG.md
├── LICENSE
├── README.md              # Tiếng Anh
└── README.vi.md           # Tiếng Việt
```

## Quyền riêng tư

- Không xin quyền nào; content script chỉ chạy trên `www.facebook.com` và `web.facebook.com`.
- Tên và ID tài khoản được đọc từ trang hiện tại trong bộ nhớ, chỉ dùng để tìm vị trí tên trên màn hình, không lưu và không gửi đi.
- Không analytics, không tải code từ xa, không có request mạng.

## Giới hạn

- Phụ thuộc vào markup của Facebook (vd `span.x1lliihq`, thuộc tính `role`). Facebook đổi giao diện thường xuyên nên có thể cần cập nhật selector — hãy tạo issue kèm kết quả đoạn lệnh chẩn đoán.
- Trên trang cá nhân **của người khác**, tên được tìm qua `<title>` hoặc tiêu đề trang; nếu Facebook để title là `Facebook` và tên không nằm trong `h1` thì sẽ không có huy hiệu.
- Chưa hỗ trợ bản mobile (`m.facebook.com`), Messenger, Trang/Nhóm và các trang con như `/username/about`.
- Huy hiệu chỉ để trang trí: không xuất hiện trên thiết bị, trình duyệt khác hay với người khác.

## Đóng góp

Rất hoan nghênh issue và pull request.

1. Fork repo và tạo nhánh: `git checkout -b fix/profile-selector`.
2. Giữ extension không xin quyền, không phụ thuộc thư viện ngoài.
3. Theo đúng phong cách code hiện có (thụt 2 dấu cách, nháy đơn, khai báo `function`; xem `.editorconfig`).
4. Thử trên cả `/` và một trang `/username` với `DEBUG = true` trước khi mở PR.
5. Mô tả thay đổi; với các sửa selector, kèm kết quả đoạn lệnh chẩn đoán làm căn cứ.

## Giấy phép

[MIT](LICENSE) © 2026 Nguyễn Trọng Bình ([@binhake](https://github.com/binhake))

---

<sub>Dự án không liên kết, không được bảo trợ hay tài trợ bởi Meta Platforms, Inc. "Facebook" là nhãn hiệu của Meta Platforms, Inc.</sub>
