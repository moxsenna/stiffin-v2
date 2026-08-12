import { LessonEditorClient } from './LessonEditorClient';

export function generateStaticParams() {
  return [
    { programId: 'prog_7_hari_belajar', lessonId: 'les_1_1' },
    { programId: 'prog_7_hari_belajar', lessonId: 'les_1_2' },
    { programId: 'prog_7_hari_belajar', lessonId: 'les_2_1' },
  ];
}

export default function LessonEditorPage() {
  return <LessonEditorClient />;
}
