# 🎵 BeatPay v2 — Live Club Song Bidding System

Real-time song bidding platform for clubs. DJ controls rounds, users bid on songs live.

---

## 📁 Structure

```
beatpay2/
├── server/
│   ├── config/         db.js, jwt.js, response.js
│   ├── controllers/    authController, songController, roundController, bidController
│   ├── routes/         auth, songs, rounds, bids
│   ├── middlewares/    auth, role, validate
│   ├── sockets/        socketManager (timer + real-time)
│   ├── services/       otpService (mock OTP, ready for SMS)
│   └── index.js
├── client/
│   ├── src/
│   │   ├── pages/      Login, DJDashboard, DJPlaylist, DJHistory, LiveBidding
│   │   ├── components/ Navbar, ProtectedRoute, CountdownTimer
│   │   ├── context/    AuthContext, ToastContext
│   │   └── services/   api.js, socket.js
│   └── index.html
└── database.sql
```

---

## ⚙️ Local Setup

### 1. Database
```bash
mysql -u root -p < database.sql
# OR in MySQL Shell:
\source C:\path\to\database.sql
```

### 2. Server
```bash
cd server
cp .env.example .env
# Edit .env: set DB_PASSWORD, DB_NAME=beatpay2
npm install
npm run dev
```

### 3. Client
```bash
cd client
npm install
npm run dev
```

---

## 🔐 Test Accounts

| Role | Mobile | How to Login |
|------|--------|-------------|
| DJ | 9999999999 | Enter mobile → get OTP from server console |
| User | Any 10-digit number | Enter mobile → get OTP from server console |

OTP appears in the server terminal AND on the login screen (dev mode).

---

## 🎮 How to Test

1. **Open two browser tabs** (or incognito)
2. **Tab 1** → Login as DJ (9999999999) → Go to Playlist → Add songs → Go to Dashboard → Start Round
3. **Tab 2** → Login as User (any number) → Go to Live Bidding → Select song → Place bid
4. Watch bids update live in both tabs! Timer counts down and announces winner automatically.

---

## 🔌 Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `start_round` | Client(DJ)→Server | DJ triggers round start |
| `round_started` | Server→All | Broadcasts round start + songs |
| `bids_updated` | Server→All | Live bid totals per song |
| `end_round` | Client(DJ)→Server | DJ manually ends round |
| `round_ended` | Server→All | Winner announced |
| `get_state` | Client→Server | Request current round state |
| `current_state` | Server→Client | Returns active round + bids |

---

## 🚀 AWS Deployment

### EC2 + RDS Setup

```bash
# 1. Launch EC2 (Ubuntu 22.04), open ports 80, 443, 5000
# 2. Create RDS MySQL 8.0 instance
# 3. Import schema to RDS:
mysql -h <rds-endpoint> -u admin -p < database.sql

# 4. On EC2:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2

git clone <your-repo> beatpay2
cd beatpay2/server && npm install

# 5. Set production .env
DB_HOST=<rds-endpoint>
DB_PASSWORD=<rds-password>
NODE_ENV=production
CLIENT_URL=https://your-domain.com
JWT_SECRET=<64-char-random-string>

# 6. Build frontend
cd ../client
echo "VITE_API_URL=https://your-domain.com/api" > .env
echo "VITE_SOCKET_URL=https://your-domain.com" >> .env
npm run build

# 7. Nginx config
sudo cp -r dist/* /var/www/html/
```

**Nginx config** (`/etc/nginx/sites-available/beatpay`):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;

    location / { try_files $uri $uri/ /index.html; }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# 8. Start with PM2
cd beatpay2/server
pm2 start index.js --name beatpay2
pm2 startup && pm2 save

# 9. SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔌 Adding Real SMS (Future)

In `server/services/otpService.js`, replace the `console.log` block with:

```javascript
// Twilio example:
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
await client.messages.create({
  body: `Your BeatPay OTP: ${otp}`,
  from: process.env.TWILIO_PHONE,
  to: `+91${mobile}`
});
```
