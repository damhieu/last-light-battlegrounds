# LAST LIGHT — Battlegrounds

**Thiết kế bởi Đàm Mạnh Hiếu · v1.2.0**

🎮 **[Chơi ngay trên GitHub Pages](https://damhieu.github.io/last-light-battlegrounds/)** · [Mã nguồn](https://github.com/damhieu/last-light-battlegrounds)

Game battle royale 3D độc lập, lấy cảm hứng từ PUBG. Chơi một người với 23 bot trên đảo Northwatch. Giao diện tiếng Việt, không cần đăng nhập hay dịch vụ máy chủ game.

## Chạy game

Cần Node.js 20.19+ hoặc 22.12+.

```sh
npm install
npm run dev
```

Mở địa chỉ localhost do Vite hiển thị (mặc định http://localhost:5173). Bấm **Vào chiến trường** để bắt đầu. Chrome/Edge hỗ trợ khóa chuột; trình duyệt nhúng có thể dùng giữ chuột phải và kéo, hoặc phím mũi tên. Nên dùng bàn phím, chuột và tai nghe.

```sh
npm run build
npm run preview
```

Bản production mở ở **http://127.0.0.1:5188/**.

`dist/` là bản đóng gói để chạy trên bất kỳ static web server nào. Không mở `index.html` trực tiếp bằng `file://`.

## Gameplay

- Đảo 3D với địa hình, biển, thị trấn có nhà đi vào được, rừng, khu container quân sự, xe và vật chắn.
- Solo: thả dù, 23 bot tự tìm mục tiêu và giao tranh với cả người chơi lẫn nhau, 6 giai đoạn vòng bo. Trận đấu khoảng 4–7 phút tùy cách chơi.
- Luyện tập: không thu bo, bot đứng làm mục tiêu và không bắn trả.
- M416 tự động, Kar98k với kính 4×, UMP45 tự động. Đạn có độ tản, giật súng, sát thương trúng đầu và kiểm tra vật cản.
- Hệ thống giáp, cứu thương, lựu đạn có vật lý và vùng sát thương, nhặt tiếp tế, giới hạn thể lực, ngồi và nhảy.
- Bản đồ nhỏ, bản đồ toàn đảo, thông báo hạ gục, lịch sử giao tranh, kết quả xếp hạng và chơi lại.
- Cài đặt độ nhạy, âm lượng, 3 mức hình ảnh và 3 độ khó được lưu trên thiết bị.
- Cài lên màn hình chính iPhone, mở dạng ứng dụng, lưu ngoại tuyến sau lần tải đầu; xem [hướng dẫn iPhone](IPHONE.md).
- Chế độ **Xem bot chơi**: tự di chuyển, tìm mục tiêu, đổi súng, ngắm, bắn, thay đạn, hồi máu; không cộng thống kê người chơi.
- Điều khiển cảm ứng: joystick, kéo nhìn, bắn, ngắm, nhảy, thay đạn, nhặt đồ, chạy nhanh, ngồi, vùng an toàn cho tai thỏ; chạm các ô vũ khí để đổi súng.

## Điều khiển

| Phím                      | Chức năng                          |
| ------------------------- | ---------------------------------- |
| W A S D                   | Di chuyển / điều khiển dù          |
| Chuột                     | Nhìn xung quanh                    |
| Chuột trái                | Bắn                                |
| Chuột phải / V            | Ngắm / kính 4×                     |
| Shift trái                | Chạy nhanh / hạ dù nhanh           |
| Space                     | Nhảy                               |
| C                         | Đứng / ngồi                        |
| R                         | Thay đạn                           |
| 1 / 2 / 3 hoặc cuộn chuột | Đổi súng                           |
| E                         | Nhặt vật phẩm gần nhất             |
| H                         | Dùng cứu thương; đứng yên 3,5 giây |
| G                         | Ném lựu đạn                        |
| M                         | Bản đồ chiến thuật                 |
| Tab                       | Ba lô                              |
| Esc                       | Tạm dừng / tiếp tục                |
| Phím mũi tên              | Nhìn bằng bàn phím                 |

## Kiểm thử

```sh
npm test
```

Chạy kiểm thử tích hợp trong chính engine bằng cách mở `http://localhost:5173/?test=1` ở chế độ development rồi bấm **Run integration checks**. Bộ kiểm thử kiểm tra thả dù, di chuyển, va chạm, bắn, đạn bị tường chặn, thay đạn liên tiếp, nhặt đồ, hồi máu, lựu đạn, bot bắn trả, tạm dừng, vòng bo, thắng/thua và chơi lại. Các công cụ kiểm thử không được đưa vào production build. Có thể chạy tự động bằng `npm run test:e2e` khi Chromium của Playwright đã được cài.

## Cấu trúc

- `src/core.js`: địa hình xác định, va chạm, hitscan, giáp, thông số vũ khí và vòng bo.
- `src/world.js`: cảnh 3D, shader biển/bầu trời/vòng bo, gộp hình học tĩnh và cây/cỏ instancing.
- `src/models.js`: mô hình nhân vật, vũ khí và vật phẩm dựng bằng hình học.
- `src/game.js`: vòng lặp game, điều khiển, AI, chiến đấu và trạng thái trận.
- `src/audio.js`: tổng hợp âm thanh bằng Web Audio.
- `src/ui.js`, `src/style.css`: sảnh, HUD, bản đồ, cài đặt và cảm ứng.

Đây là game offline với bot, không có multiplayer online, phương tiện lái được hoặc tài sản của PUBG. Tất cả mô hình, kết cấu và âm thanh trong game được tạo bằng mã. Three.js dùng giấy phép MIT; Barlow và Barlow Condensed dùng SIL Open Font License.

## Xuất bản trên GitHub Pages

Repo công khai: `damhieu/last-light-battlegrounds`.

Workflow `.github/workflows/deploy.yml` chạy kiểm thử, build và triển khai khi cập nhật `main`, hoặc khi chạy thủ công trong tab Actions. Site được xuất bản tại **https://damhieu.github.io/last-light-battlegrounds/**.

Phiên bản lấy từ `package.json`. Mỗi bản build tự ghi thời điểm thực tế vào giao diện và `build-info.json`; giao diện hiển thị giờ Việt Nam (UTC+7). File metadata còn chứa mã commit để đối chiếu bản đang chạy với mã nguồn. Thời gian này giữ nguyên khi người chơi tải lại trang và chỉ thay đổi khi build lại.

Có thể kiểm tra build cho đường dẫn GitHub Pages ở máy local:

```sh
BASE_PATH=/last-light-battlegrounds/ npm run build
npm run preview
```

Sau đó mở `http://127.0.0.1:5188/last-light-battlegrounds/`. Chạy `npm run build` bình thường để quay lại đường dẫn gốc khi phát triển local.

## Quay demo HD cho Facebook

Công cụ ghi hình chỉ có trong development. Video lấy cảnh từ WebGL, HUD từ trạng thái trận đấu và âm thanh tổng hợp của game; không xin camera hay microphone.

```sh
RECORD_DEMO=1 npm run dev -- --port 5190
```

Mở `http://127.0.0.1:5190/?record=1`, nhấn **QUAY DEMO HD · 55 GIÂY** và giữ trang hoạt động. Bản gốc WebM lưu vào `exports/demo-source.webm`, âm thanh game được dựng lại từ các sự kiện có thời gian chính xác vào `exports/demo-audio.wav` qua endpoint chỉ bật khi có `RECORD_DEMO=1`. Thư mục `exports/` không được đưa vào Git.

Đổi sang MP4 H.264/AAC, 1080×1920, 30 fps:

```sh
ffmpeg -i exports/demo-source.webm -i exports/demo-audio.wav -map 0:v:0 -map 1:a:0 -vf fps=30 -af volume=6dB -t 55 -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart exports/Last-Light-Facebook-HD.mp4
```
