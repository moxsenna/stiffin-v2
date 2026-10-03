import fs from 'node:fs';

const contractsFile = '../../packages/contracts/src/index.ts';
const storefrontFile = 'src/app/(public)/p/[workspaceSlug]/StorefrontClient.tsx';
const landingFile = 'src/app/(public)/p/[workspaceSlug]/[programSlug]/PublicLandingClient.tsx';

if (!fs.existsSync(contractsFile) || !fs.existsSync(storefrontFile) || !fs.existsSync(landingFile)) {
  console.error('Missing target files for pricing and category');
  process.exit(1);
}

const contractsContent = fs.readFileSync(contractsFile, 'utf8');
const storefrontContent = fs.readFileSync(storefrontFile, 'utf8');
const landingContent = fs.readFileSync(landingFile, 'utf8');

const hasStrikeInContracts = contractsContent.includes('strikePriceAmount');
const hasNo185InStorefront = !storefrontContent.includes('now * 1.85');
const hasNo185InLanding = !landingContent.includes('listPrice * 1.85');
const hasOfficialStrikeUsage = landingContent.includes('strikePriceAmount') || landingContent.includes('originalPriceAmount');

if (!hasStrikeInContracts) {
  console.error('strikePriceAmount missing in contracts');
  process.exit(1);
}
if (!hasNo185InStorefront || !hasNo185InLanding) {
  console.error('1.85 heuristic multiplier still used in storefront or landing');
  process.exit(1);
}

console.log('GATECHECK pricing category passed');
