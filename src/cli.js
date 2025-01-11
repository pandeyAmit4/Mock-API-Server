#!/usr/bin/env node

import { program } from 'commander';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { startServer } from './server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

program
    .name('mock-server')
    .description('CLI to run the Mock API Server')
    .version('1.0.0');

program.command('start')
    .description('Start the mock API server')
    .option('-c, --config <path>', 'Path to routes configuration file', 'routes.json')
    .option('-p, --port <number>', 'Port number', '3000')
    .option('-v, --verbose', 'Enable verbose logging', false)
    .option('-r, --reset', 'Reset in-memory data on start', false)
    .action(async (options) => {
        try {
            // Resolve config path
            const configPath = path.resolve(process.cwd(), options.config);

            // Check if config file exists
            try {
                await fs.access(configPath);
            } catch (error) {
                console.error(`Error: Config file not found at ${configPath}`);
                process.exit(1);
            }

            // Read and validate config
            const routesConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
            
            if (!Array.isArray(routesConfig)) {
                console.error('Error: Routes configuration must be an array');
                process.exit(1);
            }

            // Start server with options
            await startServer({
                port: parseInt(options.port),
                routesConfig,
                verbose: options.verbose,
                reset: options.reset
            });

        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    });

program.parse();
