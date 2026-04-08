// Preset scenarios — not yet exposed in UI, wired to a future scenario selector.
// Each preset defines the full simulation state override.

export const SCENARIOS = {
  default: {
    name: 'Default — Normal Operations',
    description: 'All compressors running, equal well priorities, all wells at target rate.',
    compressorOverrides: null, // all running
    wellPriorityOrder: null, // default 1,2,3...
    wellRateOverrides: null, // all at default
    totalGasOverride: null, // full capacity
    huntSequence: false,
  },

  compressor_trip: {
    name: 'Compressor Trip',
    description: 'C2 trips unexpectedly. Gas is constrained and prioritization kicks in.',
    compressorOverrides: {
      1: 'tripped', // C2 (0-indexed)
    },
    wellPriorityOrder: null,
    wellRateOverrides: null,
    totalGasOverride: null,
    huntSequence: false,
  },

  gas_constrained: {
    name: 'Gas Constrained',
    description: 'Total available gas drops to 60% of demand. Priority wells are protected.',
    compressorOverrides: null,
    wellPriorityOrder: null,
    wellRateOverrides: null,
    totalGasMultiplier: 0.6,
    huntSequence: false,
  },

  full_priority_demo: {
    name: 'Full Priority Demo',
    description: '3 wells at high priority, 3 at low. Gas constrained to show stark contrast.',
    compressorOverrides: null,
    wellPriorityOrder: [0, 1, 2, 5, 4, 3], // W1, W2, W3 high; W6, W5, W4 low
    wellRateOverrides: null,
    totalGasMultiplier: 0.65,
    huntSequence: false,
  },
}
