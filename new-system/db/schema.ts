
import { sqliteTable, text, integer, uniqueIndex, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const participants = sqliteTable('participants', {
 id:text().primaryKey(), nationalId:text().notNull().unique(), name:text().notNull(), passwordHash:text().notNull(), recoveryPhone:text(), institution:text(), track:text().notNull().default('easy'), nextTrack:text(), trackEffective:text(), balance:integer().notNull().default(0), blocked:integer().notNull().default(0), createdAt:text().notNull(),
},t=>[check('nonnegative_balance',sql`${t.balance} >= 0`)]);
export const exams = sqliteTable('exams',{
 id:text().primaryKey(),title:text().notNull(),materialKey:text().notNull(),week:text().notNull(),track:text().notNull(),kind:text().notNull(), opensAt:text().notNull(),closesAt:text().notNull(),questionCount:integer().notNull(),questions:text().notNull(),published:integer().notNull().default(0),createdAt:text().notNull(),
});
export const attempts = sqliteTable('attempts',{
 id:text().primaryKey(),participantId:text().notNull().references(()=>participants.id),examId:text().notNull().references(()=>exams.id), materialKey:text().notNull(),snapshot:text().notNull(),completed:integer().notNull().default(0),score:integer().notNull().default(0),createdAt:text().notNull(),completedAt:text(),
},t=>[uniqueIndex('one_material_attempt').on(t.participantId,t.materialKey)]);
export const answers = sqliteTable('answers',{
 id:text().primaryKey(),attemptId:text().notNull().references(()=>attempts.id),questionId:text().notNull(),choice:integer().notNull(),points:integer().notNull(),createdAt:text().notNull(),
},t=>[uniqueIndex('one_answer').on(t.attemptId,t.questionId)]);
export const ledger = sqliteTable('ledger',{
 id:text().primaryKey(),participantId:text().notNull().references(()=>participants.id),delta:integer().notNull(),reason:text().notNull(),reference:text().notNull().unique(),actor:text().notNull(),createdAt:text().notNull(),
});
export const benefits = sqliteTable('benefits',{
 id:text().primaryKey(),title:text().notNull(),merchant:text().notNull(),branch:text(),kind:text().notNull(),cost:integer().notNull(),faceValue:integer().notNull().default(0), opensAt:text().notNull(),closesAt:text().notNull(),redeemUntil:text().notNull(),delivery:text().notNull().default('export'),active:integer().notNull().default(1),createdAt:text().notNull(),
},t=>[check('positive_cost',sql`${t.cost}>0`)]);
export const cards = sqliteTable('cards',{
 id:text().primaryKey(),participantId:text().notNull().references(()=>participants.id),network:text().notNull(),number:text().notNull(),approved:integer().notNull().default(1),createdAt:text().notNull(),
},t=>[uniqueIndex('participant_network').on(t.participantId,t.network)]);
export const orders = sqliteTable('orders',{
 id:text().primaryKey(),participantId:text().notNull().references(()=>participants.id),benefitId:text().notNull().references(()=>benefits.id), quantity:integer().notNull(),total:integer().notNull(),cardNumber:text(),status:text().notNull(),code:text().notNull().unique(),requestKey:text().notNull().unique(),snapshot:text().notNull(), createdAt:text().notNull(),exportedAt:text(),completedAt:text(),
},t=>[check('positive_quantity',sql`${t.quantity}>0`)]);
export const messages = sqliteTable('messages',{
 id:text().primaryKey(),participantId:text().notNull().references(()=>participants.id),subject:text().notNull(),body:text().notNull(),audioKey:text(),reply:text(),replyAudioKey:text(),status:text().notNull().default('open'),createdAt:text().notNull(),
});
export const staff = sqliteTable('staff',{userId:text().primaryKey(),name:text().notNull(),role:text().notNull(),scope:text(),createdAt:text().notNull()});
export const audit = sqliteTable('audit',{id:text().primaryKey(),actor:text().notNull(),action:text().notNull(),target:text().notNull(),details:text().notNull(),createdAt:text().notNull()});
export const sessions = sqliteTable('sessions',{tokenHash:text().primaryKey(),participantId:text().notNull().references(()=>participants.id),expiresAt:text().notNull()});
export const authLimits = sqliteTable('auth_limits',{key:text().primaryKey(),failures:integer().notNull().default(0),until:text().notNull()});
export const legacy = sqliteTable('legacy',{id:text().primaryKey(),source:text().notNull(),rowKey:text().notNull().unique(),nationalId:text(),kind:text().notNull(),payload:text().notNull(),createdAt:text().notNull()});
export const shipments = sqliteTable('shipments',{id:text().primaryKey(),participantId:text().notNull().references(()=>participants.id),kind:text().notNull(),address:text().notNull(),status:text().notNull().default('pending'),notes:text(),createdAt:text().notNull()});
export const settings = sqliteTable('settings',{key:text().primaryKey(),value:text().notNull()});

// Separate module: no wallets, accounts or partner networks are shared with IVR.
export const youthParticipants = sqliteTable('b_participants', {
 id:text().primaryKey(), nationalId:text().notNull().unique(), name:text().notNull(), passwordHash:text().notNull(), recoveryPhone:text(), institution:text(), track:text().notNull().default('easy'), nextTrack:text(), trackEffective:text(), balance:integer().notNull().default(0), blocked:integer().notNull().default(0), createdAt:text().notNull(),
},t=>[check('b_nonnegative_balance',sql`${t.balance} >= 0`)]);
export const youthExams = sqliteTable('b_exams',{
 id:text().primaryKey(),title:text().notNull(),materialKey:text().notNull(),week:text().notNull(),track:text().notNull(),kind:text().notNull(), opensAt:text().notNull(),closesAt:text().notNull(),questionCount:integer().notNull(),questions:text().notNull(),published:integer().notNull().default(0),createdAt:text().notNull(),
});
export const youthAttempts = sqliteTable('b_attempts',{
 id:text().primaryKey(),participantId:text().notNull().references(()=>youthParticipants.id),examId:text().notNull().references(()=>youthExams.id), materialKey:text().notNull(),snapshot:text().notNull(),completed:integer().notNull().default(0),score:integer().notNull().default(0),createdAt:text().notNull(),completedAt:text(),
},t=>[uniqueIndex('b_one_material_attempt').on(t.participantId,t.materialKey)]);
export const youthAnswers = sqliteTable('b_answers',{
 id:text().primaryKey(),attemptId:text().notNull().references(()=>youthAttempts.id),questionId:text().notNull(),choice:integer().notNull(),points:integer().notNull(),createdAt:text().notNull(),
},t=>[uniqueIndex('b_one_answer').on(t.attemptId,t.questionId)]);
export const youthLedger = sqliteTable('b_ledger',{
 id:text().primaryKey(),participantId:text().notNull().references(()=>youthParticipants.id),delta:integer().notNull(),reason:text().notNull(),reference:text().notNull().unique(),actor:text().notNull(),createdAt:text().notNull(),
});
export const youthBenefits = sqliteTable('b_benefits',{
 id:text().primaryKey(),title:text().notNull(),merchant:text().notNull(),branch:text(),kind:text().notNull(),cost:integer().notNull(),faceValue:integer().notNull().default(0), opensAt:text().notNull(),closesAt:text().notNull(),redeemUntil:text().notNull(),delivery:text().notNull().default('export'),active:integer().notNull().default(1),createdAt:text().notNull(),
},t=>[check('b_positive_cost',sql`${t.cost}>0`)]);
export const youthCards = sqliteTable('b_cards',{
 id:text().primaryKey(),participantId:text().notNull().references(()=>youthParticipants.id),network:text().notNull(),number:text().notNull(),approved:integer().notNull().default(1),createdAt:text().notNull(),
},t=>[uniqueIndex('b_participant_network').on(t.participantId,t.network)]);
export const youthOrders = sqliteTable('b_orders',{
 id:text().primaryKey(),participantId:text().notNull().references(()=>youthParticipants.id),benefitId:text().notNull().references(()=>youthBenefits.id), quantity:integer().notNull(),total:integer().notNull(),cardNumber:text(),status:text().notNull(),code:text().notNull().unique(),requestKey:text().notNull().unique(),snapshot:text().notNull(), createdAt:text().notNull(),exportedAt:text(),completedAt:text(),
},t=>[check('b_positive_quantity',sql`${t.quantity}>0`)]);
export const youthMessages = sqliteTable('b_messages',{
 id:text().primaryKey(),participantId:text().notNull().references(()=>youthParticipants.id),subject:text().notNull(),body:text().notNull(),audioKey:text(),reply:text(),replyAudioKey:text(),status:text().notNull().default('open'),createdAt:text().notNull(),
});
export const youthStaff = sqliteTable('b_staff',{userId:text().primaryKey(),name:text().notNull(),role:text().notNull(),scope:text(),createdAt:text().notNull()});
export const youthAudit = sqliteTable('b_audit',{id:text().primaryKey(),actor:text().notNull(),action:text().notNull(),target:text().notNull(),details:text().notNull(),createdAt:text().notNull()});
export const youthSessions = sqliteTable('b_sessions',{tokenHash:text().primaryKey(),participantId:text().notNull().references(()=>youthParticipants.id),expiresAt:text().notNull()});
export const youthAuthLimits = sqliteTable('b_auth_limits',{key:text().primaryKey(),failures:integer().notNull().default(0),until:text().notNull()});
export const youthLegacy = sqliteTable('b_legacy',{id:text().primaryKey(),source:text().notNull(),rowKey:text().notNull().unique(),nationalId:text(),kind:text().notNull(),payload:text().notNull(),createdAt:text().notNull()});
export const youthShipments = sqliteTable('b_shipments',{id:text().primaryKey(),participantId:text().notNull().references(()=>youthParticipants.id),kind:text().notNull(),address:text().notNull(),status:text().notNull().default('pending'),notes:text(),createdAt:text().notNull()});
export const youthSettings = sqliteTable('b_settings',{key:text().primaryKey(),value:text().notNull()});

export const youthWebAttempts=sqliteTable('b_web_attempts',{attemptId:text().primaryKey().references(()=>youthAttempts.id),settings:text().notNull(),payload:text().notNull(),revision:integer().notNull().default(0),finalized:integer().notNull().default(0)});
