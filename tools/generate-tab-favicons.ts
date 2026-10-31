/**
 * Write `favicon.svg` from the mark helpers.
 *
 * The PNG and ICO tab icons in `packages/worker/public/` are the official
 * Rhino app-icon masters. This script does not overwrite them.
 *
 * Usage: `npx tsx tools/generate-tab-favicons.ts`
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { kodyFaviconSvgMarkup } from '../packages/worker/start/brand/kody-mark-path.ts'
import { isExecutedDirectly } from './node-runtime.ts'

const publicDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../packages/worker/public',
)

function main() {
	writeFileSync(path.join(publicDir, 'favicon.svg'), kodyFaviconSvgMarkup())
	console.log('Wrote favicon.svg')
}

if (isExecutedDirectly(import.meta.url)) {
	main()
}
