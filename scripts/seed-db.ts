import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Create exam
  const exam = await prisma.exam.create({
    data: {
      title: 'מבחן דוגמה',
      isRandom: false,
      questions: {
        create: [
          {
            text: 'מהי בירת ישראל?',
            answers: ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע'],
            correctIdx: 1,
          },
          {
            text: 'כמה שפות רשמיות בישראל?',
            answers: ['1', '2', '3', '4'],
            correctIdx: 1,
          },
          {
            text: 'מתי הוקמה מדינת ישראל?',
            answers: ['1945', '1947', '1948', '1950'],
            correctIdx: 2,
          },
        ],
      },
      tokens: {
        create: [
          { tokenCode: '123456' },
          { tokenCode: '654321' },
          { tokenCode: '789012' },
        ],
      },
    },
  });

  console.log('✅ Exam created:', exam.title);
  console.log('✅ Questions created: 3');
  console.log('✅ Tokens created: 3');
  console.log('\n📝 Test tokens: 123456, 654321, 789012');
}

seed()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
