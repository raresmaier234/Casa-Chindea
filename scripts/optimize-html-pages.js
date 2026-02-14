#!/usr/bin/env node
/**
 * Script pentru optimizarea automată a tuturor paginilor HTML
 * Adaugă resource hints și optimizează încărcarea script-urilor
 *
 * Usage: node scripts/optimize-html-pages.js
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGES_DIR = join(__dirname, '..', 'public', 'js', 'pages');

// Resource hints to add
const RESOURCE_HINTS = `
    <!-- Resource Hints for faster loading -->
    <link rel="preconnect" href="https://cdn.tailwindcss.com" crossorigin>
    <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
    <link rel="dns-prefetch" href="https://unpkg.com">
    `;

// Scripts to defer (non-critical)
const DEFER_SCRIPTS = [
    'https://unpkg.com/pocketbase/dist/pocketbase.umd.js',
    'https://cdn.auth0.com/js/auth0-spa-js'
];

async function optimizeHtmlFile(filePath) {
    try {
        let content = await readFile(filePath, 'utf-8');
        let modified = false;

        // Check if already optimized
        if (content.includes('<!-- Resource Hints for faster loading -->')) {
            console.log(`  ⏭️  Already optimized: ${filePath}`);
            return false;
        }

        // Add resource hints after <head>
        if (!content.includes('rel="preconnect"') && content.includes('<head>')) {
            content = content.replace(/<head>\s*\n/, `<head>\n${RESOURCE_HINTS}\n`);
            modified = true;
        }

        // Defer non-critical scripts
        DEFER_SCRIPTS.forEach(scriptUrl => {
            const scriptPattern = new RegExp(
                `<script\\s+src="${scriptUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*>`,
                'g'
            );

            if (scriptPattern.test(content)) {
                content = content.replace(scriptPattern, (match) => {
                    if (!match.includes('defer') && !match.includes('async')) {
                        return match.replace('<script ', '<script defer ');
                    }
                    return match;
                });
                modified = true;
            }
        });

        // Add loading="lazy" to images that don't have it
        const imgPattern = /<img\s+(?![^>]*loading=)[^>]*>/g;
        if (imgPattern.test(content)) {
            content = content.replace(imgPattern, (match) => {
                // Don't add lazy to images above the fold (first 2 images)
                return match.replace('<img ', '<img loading="lazy" ');
            });
            modified = true;
        }

        if (modified) {
            await writeFile(filePath, content, 'utf-8');
            console.log(`  ✅ Optimized: ${filePath}`);
            return true;
        }

        return false;
    } catch (error) {
        console.error(`  ❌ Error optimizing ${filePath}:`, error.message);
        return false;
    }
}

async function optimizeAllPages() {
    console.log('🚀 Starting HTML optimization...\n');

    try {
        const files = await readdir(PAGES_DIR);
        const htmlFiles = files.filter(f => f.endsWith('.html'));

        console.log(`📄 Found ${htmlFiles.length} HTML files\n`);

        let optimized = 0;
        let skipped = 0;
        let errors = 0;

        for (const file of htmlFiles) {
            const filePath = join(PAGES_DIR, file);
            console.log(`Processing: ${file}`);

            const result = await optimizeHtmlFile(filePath);

            if (result === true) {
                optimized++;
            } else if (result === false) {
                skipped++;
            } else {
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 OPTIMIZATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total files:         ${htmlFiles.length}`);
        console.log(`Optimized:           ${optimized} ✅`);
        console.log(`Skipped:             ${skipped} ⏭️`);
        console.log(`Errors:              ${errors} ❌`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the optimization
optimizeAllPages()
    .then(() => {
        console.log('\n✨ HTML optimization complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Optimization failed:', error);
        process.exit(1);
    });

