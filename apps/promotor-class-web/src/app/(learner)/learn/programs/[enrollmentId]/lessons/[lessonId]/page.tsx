import { LessonReaderClient } from './LessonReaderClient';

export function generateStaticParams() {
  return [
    { enrollmentId: 'enr_ayu_7hari', lessonId: 'les_1_1' },
    { enrollmentId: 'enr_ayu_7hari', lessonId: 'les_1_2' },
    { enrollmentId: 'enr_ayu_7hari', lessonId: 'les_2_1' },
    { enrollmentId: 'enr_nina_7hari', lessonId: 'les_1_1' },
    { enrollmentId: 'enr_nina_7hari', lessonId: 'les_1_2' },
  ];
}

export default function LessonReaderPage() {
  return <LessonReaderClient />;
}
