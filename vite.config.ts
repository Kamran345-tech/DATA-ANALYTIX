import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            // 1. Icon library (must be checked BEFORE 'react' because 'lucide-react' contains 'react')
            if (/node_modules\/lucide-react\//.test(id)) {
              return 'vendor-icons';
            }

            // 2. D3 visualization engine (isolated for DataModelingView / D3SchemaGraph)
            if (
              /node_modules\/(d3|d3-[^/]+|internmap|delaunator|robust-predicates)\//.test(id)
            ) {
              return 'vendor-d3';
            }

            // 3. PDF generation engine (jsPDF + jspdf-autotable + transitive canvas/compression deps)
            if (
              /node_modules\/(jspdf|jspdf-autotable|html2canvas|canvg|dompurify|fflate|fast-png|iobuffer|rgbcolor|stackblur-canvas|svg-pathdata|core-js)\//.test(
                id
              )
            ) {
              return 'vendor-pdf';
            }

            // 4. ExcelJS workbook engine + its transitive stream/CSV/XML/archive dependencies
            if (
              /node_modules\/(exceljs|fast-csv|@fast-csv|saxes|archiver|archiver-utils|unzipper|readable-stream|zip-stream|compress-commons|crc32-stream|crc|dayjs|uuid|bignumber\.js|bluebird|immediate|lie|setimmediate|xmlchars|lazystream|normalize-path|glob|minimatch|tar-stream|bl|buffer|events|util|stream-browserify|string_decoder|inherits|process|@babel\/runtime)\//.test(
                id
              )
            ) {
              return 'vendor-exceljs';
            }

            // 5. SheetJS (xlsx) spreadsheet parser/writer
            if (/node_modules\/(xlsx|cfb|codepage|adler-32|crc-32|ssf|wmf|word)\//.test(id)) {
              return 'vendor-xlsx';
            }

            // 6. JSZip archive builder
            if (/node_modules\/(jszip|pako)\//.test(id)) {
              return 'vendor-zip';
            }

            // 7. In-browser SQL engine (AlaSQL)
            if (/node_modules\/alasql\//.test(id)) {
              return 'vendor-sql';
            }

            // 8. Firebase SDK
            if (/node_modules\/(@?firebase|idb)\//.test(id)) {
              return 'vendor-firebase';
            }

            // 9. Animation utilities
            if (/node_modules\/(motion|framer-motion)\//.test(id)) {
              return 'vendor-motion';
            }

            // 10. Absolute core necessities ONLY (React runtime + CSV parser)
            if (/node_modules\/(react|react-dom|scheduler|papaparse)\//.test(id)) {
              return 'vendor-core';
            }

            // Let Rollup/Rolldown co-locate any remaining transitive modules with their dynamic importer
            return undefined;
          },
        },
      },
    },
  };
});
