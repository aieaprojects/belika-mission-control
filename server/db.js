import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '..', 'mission_control.db'));

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    trigger_keyword TEXT NOT NULL,
    video_url TEXT,
    caption TEXT,
    hook_transcript TEXT,
    audio_url TEXT,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    velocity_score REAL DEFAULT 0,
    trigger_type TEXT,
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS agent_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name TEXT NOT NULL,
    status TEXT DEFAULT 'idle',
    started_at DATETIME,
    completed_at DATETIME,
    results_count INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    error_message TEXT
  );

  CREATE TABLE IF NOT EXISTS opex_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER,
    apify_results INTEGER DEFAULT 0,
    apify_cost REAL DEFAULT 0,
    gemini_input_tokens INTEGER DEFAULT 0,
    gemini_output_tokens INTEGER DEFAULT 0,
    gemini_cost REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES agent_runs(id)
  );
`);

// Insert seed/demo data
const trendCount = db.prepare('SELECT COUNT(*) as count FROM trends').get();
if (trendCount.count === 0) {
  const insertTrend = db.prepare(`
    INSERT INTO trends (platform, trigger_keyword, video_url, caption, hook_transcript, audio_url, views, likes, velocity_score, trigger_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const demoTrends = [
    ['tiktok', '#corridostumbados', 'https://tiktok.com/@user1/video/001', 'Cuando llegas en la Trackhawk y todos voltean 🔥', 'When you pull up in the Trackhawk and everyone turns around', 'https://audio.example.com/track001.mp3', 2800000, 420000, 15.0, 'The Flex'],
    ['tiktok', '#pesopluma', 'https://tiktok.com/@user2/video/002', 'Ella Baila Sola remix que nadie esperaba 💃', 'The Ella Baila Sola remix nobody expected', 'https://audio.example.com/track002.mp3', 5200000, 910000, 17.5, 'The Party Anthem'],
    ['instagram', '#regionalmexicano', 'https://instagram.com/p/003', 'Mi abuela me cantaba esta canción cada noche 🥺', 'My grandmother used to sing me this song every night', 'https://audio.example.com/track003.mp3', 1500000, 375000, 25.0, 'The Emotional Story'],
    ['tiktok', '#alucin', 'https://tiktok.com/@user4/video/004', 'No necesito reloj, el tiempo me sobra 💰', 'I dont need a watch, I have all the time in the world', 'https://audio.example.com/track004.mp3', 3100000, 434000, 14.0, 'The Hustle'],
    ['tiktok', '#corridostumbados', 'https://tiktok.com/@user5/video/005', 'Del rancho a Beverly Hills, la historia de siempre 🏠➡️🏰', 'From the ranch to Beverly Hills, the same old story', 'https://audio.example.com/track005.mp3', 4400000, 880000, 20.0, 'The Flex'],
    ['instagram', '#pesopluma', 'https://instagram.com/p/006', 'POV: Escuchando corridos a las 3am pensando en ella 💔', 'POV: Listening to corridos at 3am thinking about her', 'https://audio.example.com/track006.mp3', 1900000, 456000, 24.0, 'The Heartbreak'],
    ['tiktok', '#regionalmexicano', 'https://tiktok.com/@user7/video/007', 'Esta voz no es de este mundo hermano 🎤🔥', 'This voice is not of this world bro', 'https://audio.example.com/track007.mp3', 7800000, 1170000, 15.0, 'The Party Anthem'],
    ['tiktok', '#alucin', 'https://tiktok.com/@user8/video/008', 'La traición duele pero los corridos curan 🩹', 'Betrayal hurts but corridos heal', 'https://audio.example.com/track008.mp3', 2200000, 550000, 25.0, 'The Heartbreak'],
    ['instagram', '#corridostumbados', 'https://instagram.com/p/009', 'El outfit completo: botas, texana y actitud 🤠', 'The complete outfit: boots, cowboy hat and attitude', 'https://audio.example.com/track009.mp3', 3500000, 525000, 15.0, 'The Flex'],
    ['tiktok', '#pesopluma', 'https://tiktok.com/@user10/video/010', 'Tutorial: Cómo hacer el paso de Peso Pluma 🕺', 'Tutorial: How to do the Peso Pluma dance step', 'https://audio.example.com/track010.mp3', 6100000, 1159000, 19.0, 'The Party Anthem'],
    ['tiktok', '#regionalmexicano', 'https://tiktok.com/@user11/video/011', 'Mamá llorando cuando le compré su casa nueva 😭🏡', 'Mom crying when I bought her a new house', 'https://audio.example.com/track011.mp3', 9200000, 2760000, 30.0, 'The Emotional Story'],
    ['instagram', '#alucin', 'https://instagram.com/p/012', 'La calle enseña lo que la escuela no puede 📚🚫', 'The street teaches what school cannot', 'https://audio.example.com/track012.mp3', 1800000, 360000, 20.0, 'The Hustle'],
  ];

  const insertMany = db.transaction((trends) => {
    for (const t of trends) {
      insertTrend.run(...t);
    }
  });
  insertMany(demoTrends);

  // Demo agent runs
  const insertRun = db.prepare(`
    INSERT INTO agent_runs (agent_name, status, started_at, completed_at, results_count, cost_usd)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertRun.run('data_miner', 'completed', '2026-03-11T15:00:00Z', '2026-03-11T15:02:30Z', 12, 0.03);
  insertRun.run('signal_processor', 'completed', '2026-03-11T15:02:31Z', '2026-03-11T15:03:00Z', 10, 0.0012);

  // Demo OPEX
  const insertOpex = db.prepare(`
    INSERT INTO opex_ledger (run_id, apify_results, apify_cost, gemini_input_tokens, gemini_output_tokens, gemini_cost, total_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertOpex.run(1, 12, 0.03, 0, 0, 0, 0.03);
  insertOpex.run(2, 0, 0, 4500, 1200, 0.0012, 0.0012);
}

export default db;
