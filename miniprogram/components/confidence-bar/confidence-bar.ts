import type { ConfidenceStats } from '../../types';

function derive(c: ConfidenceStats) {
  const visible = c.total_rounds > 0 || c.sample_size > 0;
  const max = c.max_rounds || 18;
  const progressPct = Math.min(100, ((c.total_rounds || 0) / max) * 100);

  let progressColor: string;
  if (c.total_rounds >= (c.max_rounds || 18)) progressColor = 'progress-blue';
  else if (c.total_rounds >= (c.min_rounds || 8)) progressColor = 'progress-green';
  else progressColor = 'progress-yellow';

  return {
    visible,
    progressPct,
    progressColor,
    accuracyPct: Math.round((c.accuracy || 0) * 100),
    confidencePct: Math.round((c.confidence || 0) * 100),
  };
}

Component({
  properties: {
    confidence: {
      type: Object,
      value: {
        accuracy: 0, confidence: 0, sample_size: 0,
        should_stop: false, total_rounds: 0,
        min_rounds: 8, max_rounds: 18,
        dimension_rounds: { vocabulary: 0, grammar: 0, reading: 0 },
      } as ConfidenceStats,
    },
  },

  data: derive({
    accuracy: 0, confidence: 0, sample_size: 0,
    should_stop: false, total_rounds: 0,
    min_rounds: 8, max_rounds: 18,
    dimension_rounds: { vocabulary: 0, grammar: 0, reading: 0 },
    ci_lower: 0, ci_upper: 0, remaining: 18, stop_reason: '',
  }),

  observers: {
    'confidence': function (c: ConfidenceStats) {
      if (c) this.setData(derive(c));
    },
  },

  lifetimes: {
    attached() {
      const c = this.properties.confidence as ConfidenceStats;
      if (c) this.setData(derive(c));
    },
  },
});
