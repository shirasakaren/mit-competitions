🚀 Lomba Koding 17 Agustus
Platform Cerdas untuk Peserta — 15 Juta Record Database

🔐 Setiap Stage punya Password Berbeda
Lihat password masing-masing di bawah atau di kartu meja Anda
⏱️
Durasi:
4 jam (10:00 - 14:00 Jakarta)
📊
Dataset:
22.4M records
🛠️
Tools:
Boleh gunakan AI
1
Apa Itu Lomba Ini?
Dibuka sekarang
✓ Terbuka
Misi Anda: Bangun API berkinerja tinggi untuk mengolah 22.4 juta record customer dalam database relasional.

📦 Total Dataset: 15M users + 3M orders + 2.4M transactions + 2M activity logs
Durasi: 4 jam (10:00 - 14:00 Jakarta) | Tools: Apa saja | AI Tools: Boleh digunakan

Aturan Mainnya:

Tidak boleh query eksternal (kecuali dokumentasi)
Database harus tetap di PostgreSQL (atau setara)
Tidak boleh hasil pre-computed
Kode harus bisa dipahami dan dijelaskan
Gunakan AI tapi Anda yang harus mengerti kodenya
Tech Stack: Gunakan apa saja! Boleh pakai Python, Go, Java, Node.js, Rust, atau bahasa lain. Wajib: Ada UI/Frontend untuk menampilkan hasil (dashboard/aplikasi).

💡 Data Kompleks: Email hilang (~8%), phone hilang (~40%), JOIN across 4 tables, special characters dalam text, edge cases (NULLs, duplicates, injection attempts)
2
Download Database
Durasi: 10-15 menit
✓ Dibuka
Download file database (4.8GB, tanpa index):

# Download dari server wget https://challenge-server/challenge_db_complex_no_indexes.sql # Atau dari local path /data/challenge_db_complex_no_indexes.sql
Isi Database:

ws_user (15M records)
ws_orders (3M records)
ws_transactions (2.4M records)
ws_user_activity (2M records)
⚡ Penting: Database ini TIDAK memiliki index. Anda harus strategi optimasi sendiri!
Verifikasi Download:

ls -lh challenge_db_complex_no_indexes.sql # Harusnya ~4.8G
3
Setup Environment
Durasi: 10:50 — 12:00
✓ Dibuka
Setup Project Anda:

mkdir challenge-project cd challenge-project git init
Jalankan PostgreSQL:

docker-compose up -d postgres sleep 10 docker-compose exec postgres psql -U postgres -c "CREATE DATABASE challenge_db;"
Import Database (3-5 menit):

docker-compose exec -T postgres psql -U postgres -d challenge_db < challenge_db_complex_no_indexes.sql
Verifikasi Import:

docker-compose exec postgres psql -U postgres -d challenge_db -c " SELECT 'ws_user', COUNT(*) FROM ws_user UNION ALL SELECT 'ws_orders', COUNT(*) FROM ws_orders UNION ALL SELECT 'ws_transactions', COUNT(*) FROM ws_transactions UNION ALL SELECT 'ws_user_activity', COUNT(*) FROM ws_user_activity;"
Expected: 15M users, 3M orders, 2.4M transactions, 2M activity logs
4
Build & Optimize API
Durasi: 12:00 — 13:20
✓ Dibuka
Implement Endpoints Ini:

1. Health Check (Round 1)

GET /health Response: { status: "ready", total_records: 15000000, database: "connected" }
2. Search API (Round 2)

GET /api/search?q=john&type=name GET /api/search?q=081234567890&type=phone GET /api/search?q=user@email.com&type=email Target Response Time: - Email/phone/user_id: < 100ms - Name search: < 300ms
3. Data Quality Dashboard (Round 3)

GET /api/quality Response: quality metrics untuk email, phone, birth_date, status
4. Duplicate Detection (Round 4)

GET /api/duplicates/123456 Response: possible_duplicates dengan similarity scores
5. Load Test (Round 5)

API Anda akan menerima 100 concurrent requests selama 60 detik. Timeout per request: 5 detik.

💡 Strategy Tips: Prioritas adalah: (1) Round 1 import success, (2) Round 2 search working, (3) Optimize untuk Round 5 load test
5
Load Test & Final Optimization
Durasi: 13:20 — 13:40
✓ Dibuka
Jalankan Aplikasi:

docker-compose up # Tunggu "Server ready on port 3000"
Test Health Endpoint:

curl http://localhost:3000/health # Harusnya return 200 + JSON dengan status="ready"
Test Search Endpoints:

curl "http://localhost:3000/api/search?q=81234567890&type=phone" curl "http://localhost:3000/api/search?q=john&type=name"
Performance Test (Local Load Test):

# Gunakan Apache Bench atau wrk ab -n 100 -c 10 "http://localhost:3000/health" # Expected: avg response < 500ms
🐛 Debug Tips: Check PostgreSQL logs, check app logs, verify database connection
6
Submit Solusi Anda
Sebelum 05:00 (Akhir Lomba)
✓ Dibuka
Siapkan Submission:

File Yang Harus Ada:

docker-compose.yml — Setup lengkap
README.md — Instruksi setup
DATABASE_NOTES.md — Schema + optimasi
src/ — Semua source code
.gitignore — Standard Node/Python/Go
Push ke GitHub:

git add . git commit -m "Final submission: Customer Intelligence Platform" git push origin main
Submit Link:

Isi form submission dengan GitHub repo URL Anda

📅 Deadline: 05:00 (hard deadline)
🏆 Scoring Summary:
Round 1: Import = 200 pts (+100 first 5)
Round 2: Search = 600 pts
Round 3: Data Quality = 250 pts
Round 4: Duplicates = 300 pts
Round 5: Load Test = 600 pts
TOTAL: 1,950 pts maximum
