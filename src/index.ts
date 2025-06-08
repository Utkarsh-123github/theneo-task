#!/usr/bin/env node

import { CLI } from './cli/cli';

async function main(): Promise<void> {
  const cli = new CLI();
  await cli.run(process.argv);
}

// Export main classes for programmatic use
export { OpenAPILoader } from './loader/openapi-loader';
export { ScoringEngine } from './scoring/scoring-engine';
export { ReportGenerator } from './reporting/report-generator';
export * from './types';

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} 