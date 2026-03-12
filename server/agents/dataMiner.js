// Data Miner — Mike / Director of Intelligence
// Scrapes TikTok using Apify to collect viral content for research
// Identifies trending hashtags, analyzes engagement metrics, and stores data
// Cost monitoring: ~$2.50 per 1,000 results from Apify API

import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
dotenv.config();

const KEYWORDS = [
  '#corridostumbados',
  '#pesopluma',
  '#alucin',
  '#regionalmexicano',
];

const APIFY_COST_PER_1K = 2.50; // ~$2.50 per 1,000 results

export async function runDataMiner(db, broadcast) {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    throw new Error('APIFY_API_KEY not set in .env');
  }

  const client = new ApifyClient({ token: apiKey });
  const allResults = [];

  broadcast({ agent: 'data_miner', status: 'running', message: 'Initializing Apify scrapers...' });

  // Create agent run record
  const run = db.prepare(`
    INSERT INTO agent_runs (agent_name, status, started_at)
    VALUES ('data_miner', 'running', datetime('now'))
  `).run();
  const runId = run.lastInsertRowid;

  try {
    for (const keyword of KEYWORDS) {
      broadcast({ agent: 'data_miner', status: 'running', message: `Scraping TikTok for ${keyword}...` });

      // TikTok Scraper via Apify
      const tiktokRun = await client.actor('clockworks/free-tiktok-scraper').call({
        hashtags: [keyword.replace('#', '')],
        resultsPerPage: 20,
        shouldDownloadVideos: false,
      });

      const { items: tiktokItems } = await client.dataset(tiktokRun.defaultDatasetId).listItems();

      for (const item of tiktokItems) {
        const views = item.playCount || item.stats?.playCount || 0;
        const likes = item.diggCount || item.stats?.diggCount || 0;
        const velocityScore = views > 0 ? ((likes / views) * 100) : 0;

        const trend = {
          platform: 'tiktok',
          trigger_keyword: keyword,
          video_url: item.webVideoUrl || `https://tiktok.com/@${item.authorMeta?.name}/video/${item.id}`,
          caption: item.text || '',
          hook_transcript: (item.text || '').substring(0, 200),
          audio_url: item.musicMeta?.musicUrl || '',
          views,
          likes,
          velocity_score: Math.round(velocityScore * 100) / 100,
        };

        allResults.push(trend);
      }
    }

    // Insert into database
    const insertTrend = db.prepare(`
      INSERT INTO trends (platform, trigger_keyword, video_url, caption, hook_transcript, audio_url, views, likes, velocity_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((trends) => {
      for (const t of trends) {
        insertTrend.run(
          t.platform, t.trigger_keyword, t.video_url, t.caption,
          t.hook_transcript, t.audio_url, t.views, t.likes, t.velocity_score
        );
      }
    });
    insertMany(allResults);

    // Calculate cost
    const apifyCost = (allResults.length / 1000) * APIFY_COST_PER_1K;

    // Update run record
    db.prepare(`
      UPDATE agent_runs SET status = 'completed', completed_at = datetime('now'),
      results_count = ?, cost_usd = ? WHERE id = ?
    `).run(allResults.length, apifyCost, runId);

    // Log OPEX
    db.prepare(`
      INSERT INTO opex_ledger (run_id, apify_results, apify_cost, total_cost)
      VALUES (?, ?, ?, ?)
    `).run(runId, allResults.length, apifyCost, apifyCost);

    broadcast({ agent: 'data_miner', status: 'completed', message: `Scraped ${allResults.length} results`, count: allResults.length });

    return { results: allResults, runId, cost: apifyCost };
  } catch (error) {
    db.prepare(`
      UPDATE agent_runs SET status = 'failed', completed_at = datetime('now'),
      error_message = ? WHERE id = ?
    `).run(error.message, runId);

    broadcast({ agent: 'data_miner', status: 'failed', message: error.message });
    throw error;
  }
}
