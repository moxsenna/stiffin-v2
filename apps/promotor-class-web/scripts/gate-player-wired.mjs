import fs from 'node:fs';

const readerFile = 'src/app/(learner)/learn/programs/[enrollmentId]/lessons/[lessonId]/LessonReaderClient.tsx';
const playerFile = 'src/app/(learner)/learn/programs/[enrollmentId]/LearnerProgramClient.tsx';
const commandsFile = 'src/modules/learning/commands.ts';

if (!fs.existsSync(readerFile) || !fs.existsSync(playerFile) || !fs.existsSync(commandsFile)) {
  console.error('Missing target files');
  process.exit(1);
}

const readerContent = fs.readFileSync(readerFile, 'utf8');
const playerContent = fs.readFileSync(playerFile, 'utf8');
const commandsContent = fs.readFileSync(commandsFile, 'utf8');

const hasStartInCommands = /export async function startLessonCommand/.test(commandsContent);
const hasStartInReader = /startLessonCommand\(/.test(readerContent);
const hasPositionInReader = /submitLessonPositionCommand\(/.test(readerContent);
const hasReflectionInReader = /submitReflectionCommand\(/.test(readerContent);
const hasEventInReader = /recordLearningEventCommand\(/.test(readerContent);
const hasFakeCodeRemoved = !playerContent.includes("@pinecone-database/pinecone");
const hasFakeTimestampsRemoved = !playerContent.includes("14:28") && !playerContent.includes("32:50");

if (!hasStartInCommands) {
  console.error('startLessonCommand missing from commands.ts');
  process.exit(1);
}
if (!hasStartInReader) {
  console.error('startLessonCommand not called in LessonReaderClient.tsx');
  process.exit(1);
}
if (!hasPositionInReader) {
  console.error('submitLessonPositionCommand not called in LessonReaderClient.tsx');
  process.exit(1);
}
if (!hasReflectionInReader) {
  console.error('submitReflectionCommand not called in LessonReaderClient.tsx');
  process.exit(1);
}
if (!hasEventInReader) {
  console.error('recordLearningEventCommand not called in LessonReaderClient.tsx');
  process.exit(1);
}
if (!hasFakeCodeRemoved || !hasFakeTimestampsRemoved) {
  console.error('Fake timestamps or dummy code still in LearnerProgramClient');
  process.exit(1);
}

console.log('GATECHECK player wired passed');
