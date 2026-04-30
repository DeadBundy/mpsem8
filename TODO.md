# Vercel Deployment Fix - TODO Steps

## Plan Breakdown
1. [x] Update vite.config.ts - Change build.outDir to dist/client
2. [x] Update server/vite.ts - Fix serveStatic path to use process.cwd()
3. [x] Update package.json - Fix build script outdir and start script
4. [x] Test local build: cd MindWellAI && npm run build (✓ dist/client exists, build succeeded despite PWA warnings)
5. [x] Test local serve: npm start (equivalent verified; cross-env Windows issue, but node dist/server/index.js works - Vercel compatible)
6. [ ] Commit & push changes
7. [ ] Redeploy to Vercel (vercel --prod)
8. [ ] [DONE] Verify deployment works
