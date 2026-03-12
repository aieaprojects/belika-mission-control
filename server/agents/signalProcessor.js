// Signal Processor — VP of Creative
// Analyzes scraped data to identify psychological triggers behind viral content
// In production, this would call Gemini 2.5 Flash for NLP analysis.
// For now, uses pattern matching + scoring to classify trends.

const TRIGGER_PATTERNS = {
  'The Flex': [
    'trackhawk', 'lambo', 'cadillac', 'rolex', 'gucci', 'louis', 'prada',
    'millones', 'dinero', 'lana', 'feria', 'rancho', 'beverly', 'mansion',
    'outfit', 'botas', 'texana', 'drip', 'joyería', 'cadena', 'anillo',
    'carro', 'truck', 'voltean', 'llegando', 'entrando'
  ],
  'The Emotional Story': [
    'abuela', 'mamá', 'papá', 'familia', 'llorar', 'llorando', 'recuerdo',
    'cantaba', 'infancia', 'pueblo', 'casa nueva', 'sacrificio', 'padres',
    'hijos', 'bendición', 'corazón', 'alma', 'promesa'
  ],
  'The Heartbreak': [
    'traición', 'dolor', 'llorar', 'olvidar', 'desamor', 'sola', 'solo',
    '3am', 'noche', 'botella', 'tequila', 'mezcal', 'pensando', 'extraño',
    'duele', 'curan', 'cicatriz', 'perdón'
  ],
  'The Party Anthem': [
    'baila', 'fiesta', 'peda', 'cotorreo', 'remix', 'paso', 'tutorial',
    'pista', 'dj', 'club', 'antro', 'reventón', 'ambiente', 'voz',
    'éxito', 'mundial', 'dance', 'vibe'
  ],
  'The Hustle': [
    'calle', 'trabajo', 'hustle', 'negocio', 'enseña', 'escuela',
    'madrugar', 'grind', 'meta', 'sueño', 'desde abajo', 'humilde',
    'barrio', 'struggle', 'tiempo', 'opportunity', 'reloj'
  ],
};

function classifyTrigger(caption) {
  const text = (caption || '').toLowerCase();
  let bestTrigger = 'Unclassified';
  let bestScore = 0;

  for (const [trigger, keywords] of Object.entries(TRIGGER_PATTERNS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestTrigger = trigger;
    }
  }

  return bestTrigger;
}

export async function runSignalProcessor(db, broadcast, rawResults) {
  broadcast({ agent: 'signal_processor', status: 'running', message: 'Processing raw data for trigger classification...' });

  const run = db.prepare(`
    INSERT INTO agent_runs (agent_name, status, started_at)
    VALUES ('signal_processor', 'running', datetime('now'))
  `).run();
  const runId = run.lastInsertRowid;

  try {
    // Token cost simulation based on text volume
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Classify each trend
    const results = rawResults || db.prepare('SELECT * FROM trends ORDER BY velocity_score DESC').all();

    for (const trend of results) {
      const trigger = classifyTrigger(trend.caption || trend.hook_transcript);
      totalInputTokens += (trend.caption || '').length / 4; // rough token estimate
      totalOutputTokens += 20; // classification output

      db.prepare('UPDATE trends SET trigger_type = ? WHERE id = ?').run(trigger, trend.id);
    }

    // Sort by velocity and get top 10
    const top10 = db.prepare(`
      SELECT * FROM trends
      WHERE trigger_type IS NOT NULL AND trigger_type != 'Unclassified'
      ORDER BY velocity_score DESC
      LIMIT 10
    `).all();

    // Calculate Gemini cost (Flash pricing: ~$0.075/1M input, ~$0.30/1M output)
    const geminiCost = (totalInputTokens * 0.000000075) + (totalOutputTokens * 0.0000003);
    const totalCost = Math.round(geminiCost * 10000) / 10000;

    db.prepare(`
      UPDATE agent_runs SET status = 'completed', completed_at = datetime('now'),
      results_count = ?, cost_usd = ? WHERE id = ?
    `).run(top10.length, totalCost, runId);

    db.prepare(`
      INSERT INTO opex_ledger (run_id, gemini_input_tokens, gemini_output_tokens, gemini_cost, total_cost)
      VALUES (?, ?, ?, ?, ?)
    `).run(runId, Math.round(totalInputTokens), Math.round(totalOutputTokens), totalCost, totalCost);

    broadcast({
      agent: 'signal_processor',
      status: 'completed',
      message: `Classified ${results.length} trends, Top 10 viral concepts ready`,
      top10: top10.map(t => ({
        trigger: t.trigger_type,
        caption: t.caption,
        velocity: t.velocity_score,
        platform: t.platform,
      })),
    });

    return { top10, runId, cost: totalCost };
  } catch (error) {
    db.prepare(`
      UPDATE agent_runs SET status = 'failed', completed_at = datetime('now'),
      error_message = ? WHERE id = ?
    `).run(error.message, runId);

    broadcast({ agent: 'signal_processor', status: 'failed', message: error.message });
    throw error;
  }
}
