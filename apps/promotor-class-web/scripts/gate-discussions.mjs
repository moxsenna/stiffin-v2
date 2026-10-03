import fs from 'node:fs';

const apiAppFile = '../platform-api/src/app.ts';
const discussionQueryFile = 'src/modules/learning/discussions.ts';
const playerFile = 'src/app/(learner)/learn/programs/[enrollmentId]/LearnerProgramClient.tsx';

if (!fs.existsSync(apiAppFile) || !fs.existsSync(discussionQueryFile) || !fs.existsSync(playerFile)) {
  console.error('Missing target files for discussion');
  process.exit(1);
}

const apiContent = fs.readFileSync(apiAppFile, 'utf8');
const discContent = fs.readFileSync(discussionQueryFile, 'utf8');
const playerContent = fs.readFileSync(playerFile, 'utf8');

const hasApiDiscussionGet = apiContent.includes('/lessons/:lessonId/discussions');
const hasQueryModule = discContent.includes('listLessonDiscussionsQuery') && discContent.includes('postLessonDiscussionCommand');
const hasPlayerIntegration = playerContent.includes('listLessonDiscussionsQuery') || playerContent.includes('postLessonDiscussionCommand');

if (!hasApiDiscussionGet) {
  console.error('API endpoint /lessons/:lessonId/discussions missing in platform-api');
  process.exit(1);
}
if (!hasQueryModule) {
  console.error('Discussion queries/commands missing in discussions.ts');
  process.exit(1);
}
if (!hasPlayerIntegration) {
  console.error('Player discussion not wired to discussion module');
  process.exit(1);
}

console.log('GATECHECK discussions passed');
