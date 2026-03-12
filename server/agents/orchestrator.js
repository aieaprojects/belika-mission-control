// Orchestrator — Henry / COO
// Coordinates the full pipeline: Data Miner → Signal Processor
// Manages agent lifecycle and broadcasts status via WebSocket

import { runDataMiner } from './dataMiner.js';
import { runSignalProcessor } from './signalProcessor.js';

export async function executeResearchProtocol(db, broadcast) {
  broadcast({
    agent: 'orchestrator',
    status: 'running',
    message: '🦅 RESEARCH PROTOCOL INITIATED — Henry, COO Online',
    phase: 'initialization',
  });

  const startTime = Date.now();

  try {
    // Phase 1: Data Mining
    broadcast({
      agent: 'orchestrator',
      status: 'running',
      message: 'Phase 1/2: Deploying Data Miner...',
      phase: 'data_mining',
    });

    const minerResult = await runDataMiner(db, broadcast);

    // Phase 2: Signal Processing
    broadcast({
      agent: 'orchestrator',
      status: 'running',
      message: 'Phase 2/2: Deploying Signal Processor...',
      phase: 'signal_processing',
    });

    const signalResult = await runSignalProcessor(db, broadcast);

    // Final summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalCost = (minerResult.cost + signalResult.cost).toFixed(4);

    broadcast({
      agent: 'orchestrator',
      status: 'completed',
      message: `✅ RESEARCH PROTOCOL COMPLETE — ${minerResult.results.length} trends scraped, Top ${signalResult.top10.length} viral concepts identified`,
      phase: 'complete',
      summary: {
        trendsScraped: minerResult.results.length,
        viralConcepts: signalResult.top10.length,
        totalCost: parseFloat(totalCost),
        elapsed: `${elapsed}s`,
      },
    });

    return {
      success: true,
      trendsScraped: minerResult.results.length,
      viralConcepts: signalResult.top10,
      totalCost: parseFloat(totalCost),
      elapsed: `${elapsed}s`,
    };
  } catch (error) {
    broadcast({
      agent: 'orchestrator',
      status: 'failed',
      message: `❌ PROTOCOL FAILED: ${error.message}`,
      phase: 'error',
    });

    return { success: false, error: error.message };
  }
}

// Run signal processor only (on existing data, no scraping)
export async function analyzeExistingData(db, broadcast) {
  broadcast({
    agent: 'orchestrator',
    status: 'running',
    message: '🔬 Analyzing existing trend data...',
    phase: 'analysis',
  });

  try {
    const result = await runSignalProcessor(db, broadcast);

    broadcast({
      agent: 'orchestrator',
      status: 'completed',
      message: `✅ Analysis complete — Top ${result.top10.length} viral concepts identified`,
      phase: 'complete',
    });

    return { success: true, viralConcepts: result.top10, cost: result.cost };
  } catch (error) {
    broadcast({
      agent: 'orchestrator',
      status: 'failed',
      message: `❌ Analysis failed: ${error.message}`,
      phase: 'error',
    });
    return { success: false, error: error.message };
  }
}
