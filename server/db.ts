import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DATA_FILE = path.join(DATA_DIR, 'civic_watch.sqlite');

let connection = new Database(DATA_FILE);
connection.pragma('journal_mode = WAL');
connection.pragma('foreign_keys = ON');

export type DatabaseConnection = typeof connection;

/**
 * Swaps the live connection. Node never calls this; the static browser build uses it
 * to install the IndexedDB-backed SQLite connection after the page boots.
 */
export function setDatabaseConnection(next: DatabaseConnection) {
  connection = next;
}

/**
 * Read-through accessor. Every statement resolves against the current connection, so
 * swapping it (browser build) takes effect immediately without changing call sites.
 */
export const db: DatabaseConnection = new Proxy({} as DatabaseConnection, {
  get(_target, property) {
    const source = connection as unknown as Record<string | symbol, unknown>;
    const value = source[property];
    return typeof value === 'function' ? value.bind(connection) : value;
  },
});

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'citizen', -- citizen | advocate | admin
      state TEXT NOT NULL DEFAULT 'Lagos',
      lga TEXT NOT NULL DEFAULT 'Ikeja',
      email_verified INTEGER NOT NULL DEFAULT 0,
      otp_code TEXT,
      reset_code TEXT,
      mfa_enabled INTEGER NOT NULL DEFAULT 0,
      mfa_secret TEXT,
      preferred_lang TEXT NOT NULL DEFAULT 'en',
      whatsapp_opt_in INTEGER NOT NULL DEFAULT 0,
      amplify_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS advocates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      photo TEXT NOT NULL,
      type TEXT NOT NULL, -- lawyer | trained_advocate
      specialisations TEXT NOT NULL, -- JSON array
      languages TEXT NOT NULL, -- JSON array
      state TEXT NOT NULL,
      lga TEXT NOT NULL,
      bar_number TEXT,
      organisation TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 1,
      available INTEGER NOT NULL DEFAULT 1,
      rating REAL NOT NULL DEFAULT 4.8,
      cases_handled INTEGER NOT NULL DEFAULT 0,
      bio TEXT NOT NULL,
      availability_hours TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      case_reference TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL, -- JSON array of category ids
      urgency INTEGER NOT NULL DEFAULT 3,
      incident_datetime TEXT NOT NULL,
      state TEXT NOT NULL,
      lga TEXT NOT NULL,
      address TEXT NOT NULL,
      coordinates TEXT NOT NULL,
      geostamp TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      victims TEXT NOT NULL DEFAULT '',
      witnesses TEXT NOT NULL DEFAULT '',
      evidence_urls TEXT NOT NULL DEFAULT '[]', -- JSON array of sealed file objects
      credibility_score INTEGER NOT NULL DEFAULT 78,
      status TEXT NOT NULL DEFAULT 'submitted',
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      is_public INTEGER NOT NULL DEFAULT 1,
      is_verified INTEGER NOT NULL DEFAULT 0,
      ai_summary TEXT,
      assigned_advocate_id INTEGER,
      assigned_lawyer_name TEXT,
      report_type TEXT NOT NULL DEFAULT 'written', -- written | voice | live
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (assigned_advocate_id) REFERENCES advocates(id)
    );

    CREATE TABLE IF NOT EXISTS case_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      advocate_id INTEGER NOT NULL,
      report_reference TEXT,
      requester_name TEXT NOT NULL,
      contact_method TEXT NOT NULL,
      contact_value TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested',
      created_at TEXT NOT NULL,
      FOREIGN KEY (advocate_id) REFERENCES advocates(id)
    );

    CREATE TABLE IF NOT EXISTS petitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      description TEXT NOT NULL,
      demands TEXT NOT NULL, -- JSON array
      evidence_items TEXT NOT NULL DEFAULT '[]', -- JSON array
      media_updates TEXT NOT NULL DEFAULT '[]', -- JSON array
      public_insight TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      target_signatures INTEGER NOT NULL DEFAULT 1000,
      current_signatures INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      deadline TEXT NOT NULL,
      related_report_ref TEXT,
      hashtag TEXT NOT NULL,
      legislative_targets TEXT NOT NULL, -- JSON array
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      petition_id INTEGER NOT NULL,
      user_id INTEGER,
      signer_name TEXT NOT NULL,
      state TEXT NOT NULL,
      lga TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (petition_id) REFERENCES petitions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      state TEXT NOT NULL,
      category TEXT NOT NULL,
      participants_count INTEGER NOT NULL DEFAULT 0,
      organizer_type TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaign_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      user_id INTEGER,
      member_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS town_halls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      event_date TEXT NOT NULL,
      state TEXT NOT NULL,
      lga TEXT NOT NULL,
      format TEXT NOT NULL, -- In-person civic hall | Audio dial-in & online
      rsvp_count INTEGER NOT NULL DEFAULT 0,
      is_sample INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS town_hall_rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      town_hall_id INTEGER NOT NULL,
      user_id INTEGER,
      attendee_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS volunteer_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      commitment TEXT NOT NULL,
      skills TEXT NOT NULL,
      scope TEXT NOT NULL,
      description TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS volunteer_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      user_id INTEGER,
      applicant_name TEXT NOT NULL,
      email TEXT NOT NULL,
      state TEXT NOT NULL,
      languages TEXT NOT NULL,
      motivation TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      content TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'national', -- lga | state | national
      state TEXT NOT NULL DEFAULT 'Lagos',
      lga TEXT NOT NULL DEFAULT 'Ikeja',
      language TEXT NOT NULL DEFAULT 'English',
      content_type TEXT NOT NULL DEFAULT 'text', -- text | voice | image
      attachments TEXT NOT NULL DEFAULT '[]',
      solidarity_count INTEGER NOT NULL DEFAULT 0,
      witnessed_count INTEGER NOT NULL DEFAULT 0,
      amplify_count INTEGER NOT NULL DEFAULT 0,
      reply_count INTEGER NOT NULL DEFAULT 0,
      moderation_status TEXT NOT NULL DEFAULT 'approved', -- approved | flagged | hidden
      is_pinned INTEGER NOT NULL DEFAULT 0,
      author_name TEXT NOT NULL,
      author_badge TEXT NOT NULL DEFAULT 'Citizen reporter',
      related_case_reference TEXT,
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS post_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS broadcast_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info', -- info | warning | urgent
      scope TEXT NOT NULL DEFAULT 'national', -- national | state | lga
      target_state TEXT,
      target_lga TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER, -- null means public/demo broadcast notification
      category TEXT NOT NULL, -- case | petition | alert | community | system
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      deep_link TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      reading_minutes INTEGER NOT NULL,
      summary TEXT NOT NULL,
      body TEXT NOT NULL, -- structured paragraphs JSON array
      key_points TEXT NOT NULL, -- JSON array
      related_slugs TEXT NOT NULL, -- JSON array
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whatsapp_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_label TEXT NOT NULL,
      state TEXT NOT NULL,
      lga TEXT NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'weekly',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS civic_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL, -- report | petition | campaign | community | consultation
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      link TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_name TEXT NOT NULL,
      amount_ngn INTEGER NOT NULL,
      frequency TEXT NOT NULL,
      purpose TEXT NOT NULL,
      reference TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      state TEXT NOT NULL,
      lga TEXT NOT NULL,
      topics TEXT NOT NULL DEFAULT '[]',
      user_agent TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      last_success_at TEXT
    );

    CREATE TABLE IF NOT EXISTS push_delivery_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER,
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      deep_link TEXT NOT NULL DEFAULT '/notifications',
      status TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS social_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_handle TEXT NOT NULL,
      author_followers INTEGER NOT NULL DEFAULT 0,
      body TEXT NOT NULL,
      topic_tags TEXT NOT NULL DEFAULT '[]',
      state TEXT,
      lga TEXT,
      source_url TEXT NOT NULL,
      media_kind TEXT NOT NULL DEFAULT 'none',
      reply_count INTEGER NOT NULL DEFAULT 0,
      repost_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      view_count INTEGER NOT NULL DEFAULT 0,
      language TEXT NOT NULL DEFAULT 'English',
      is_verified_source INTEGER NOT NULL DEFAULT 0,
      related_case_ref TEXT,
      is_sample INTEGER NOT NULL DEFAULT 1,
      posted_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trending_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      hashtag TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      mentions_24h INTEGER NOT NULL,
      mentions_7d INTEGER NOT NULL,
      mentions_30d INTEGER NOT NULL,
      change_pct INTEGER NOT NULL,
      momentum TEXT NOT NULL,
      states TEXT NOT NULL DEFAULT '[]',
      platform_mix TEXT NOT NULL DEFAULT '{}',
      series TEXT NOT NULL DEFAULT '[]',
      top_voices TEXT NOT NULL DEFAULT '[]',
      related_case_ref TEXT,
      related_petition_id INTEGER,
      is_sample INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bot_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      channel TEXT NOT NULL,
      handle TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL,
      lga TEXT NOT NULL,
      topics TEXT NOT NULL DEFAULT '[]',
      frequency TEXT NOT NULL DEFAULT 'daily',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      last_sent_at TEXT
    );

    CREATE TABLE IF NOT EXISTS bot_digests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER,
      channel TEXT NOT NULL,
      state TEXT NOT NULL,
      lga TEXT NOT NULL,
      headline TEXT NOT NULL,
      body TEXT NOT NULL,
      item_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      provider_response TEXT,
      created_at TEXT NOT NULL
    );
  `);

  runSchemaMigrations();
  seedInitialData();
  ensureEnrichedData();
  ensureIntegrationData();
}

function addColumnIfMissing(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function runSchemaMigrations() {
  // Tailored Legal Representative registration fields
  addColumnIfMissing('advocates', 'primary_practice_area', "TEXT NOT NULL DEFAULT 'Human Rights Law'");
  addColumnIfMissing('advocates', 'core_strengths', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('advocates', 'years_experience', 'INTEGER NOT NULL DEFAULT 5');
  addColumnIfMissing('advocates', 'courts_of_practice', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('advocates', 'education_qualifications', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('advocates', 'fee_arrangement', "TEXT NOT NULL DEFAULT 'Pro bono initial intake'");
  addColumnIfMissing('advocates', 'case_types_accepted', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('advocates', 'turnaround_commitment', "TEXT NOT NULL DEFAULT 'Within 24 working hours'");
  addColumnIfMissing('advocates', 'notable_representations', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('advocates', 'consultation_modes', "TEXT NOT NULL DEFAULT '[\"Phone call\",\"In-person chamber\",\"Secure message\"]'");

  // Expanded Knowledge Centre topic fields
  addColumnIfMissing('knowledge_guides', 'statutory_citations', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('knowledge_guides', 'practical_steps', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('knowledge_guides', 'what_not_to_do', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('knowledge_guides', 'faqs', "TEXT NOT NULL DEFAULT '[]'");
}

function ensureEnrichedData() {
  // Enrich existing seeded advocates with tailored core strengths & registration intake profiles
  const advRows = db.prepare('SELECT id, name FROM advocates').all() as Array<{ id: number; name: string }>;
  const updateAdv = db.prepare(`
    UPDATE advocates SET
      primary_practice_area = ?,
      core_strengths = ?,
      years_experience = ?,
      courts_of_practice = ?,
      education_qualifications = ?,
      fee_arrangement = ?,
      case_types_accepted = ?,
      turnaround_commitment = ?,
      notable_representations = ?,
      consultation_modes = ?
    WHERE id = ? AND (notable_representations = '' OR notable_representations IS NULL)
  `);

  for (const row of advRows) {
    const photoMap: Record<string, string> = {
      'Chinedu Okafor': '/images/advocate-chidi.jpg',
      'Hauwa Danjuma': '/images/advocate-amina.jpg',
      'Boma Briggs': '/images/advocate-efe.jpg',
      'Funmilayo Alabi': '/images/advocate-funmilayo.jpg',
      'Modu Kyari': '/images/advocate-modu.jpg',
    };
    const matchedPhotoKey = Object.keys(photoMap).find((k) => row.name.includes(k));
    if (matchedPhotoKey) {
      db.prepare('UPDATE advocates SET photo = ? WHERE id = ?').run(photoMap[matchedPhotoKey], row.id);
    }

    if (row.name.includes('Chinedu Okafor')) {
      updateAdv.run(
        'Criminal Defense & Fundamental Rights',
        JSON.stringify([
          'Criminal Law — Unlawful detention & remand review',
          'Human Rights — Section 35 personal liberty enforcement',
          'Station bail representation & ACJA Section 34 audits',
          'Forced confession & electronic statement challenges'
        ]),
        11,
        JSON.stringify(['Federal High Court (Lagos)', 'Lagos State High Court', 'Magistrates Courts (Ikeja & Yaba)']),
        'LL.B (UNN), B.L (Nigerian Law School, Lagos Campus), Certificate in Criminal Justice Reform',
        '100% Pro bono for unlawful detention & indigent bail; sliding scale for civil damages',
        JSON.stringify([
          'Detention past 24–48 constitutional hours without charge',
          'Extortion or unreceipted cash demands at checkpoints',
          'Custodial assault and medical access denials'
        ]),
        'Urgent detention calls reviewed within 4 hours; standard intake within 24 hours',
        'Sample representation summary: Filed 28 Fundamental Rights (Enforcement Procedure) applications in Lagos High Court and secured administrative station bail in over 40 commuter detention matters.',
        JSON.stringify(['Phone call', 'Police station attendance (Lagos)', 'In-person chamber (Ikeja)']),
        row.id
      );
    } else if (row.name.includes('Hauwa Danjuma')) {
      updateAdv.run(
        'Civil, Family & Property Protection Law',
        JSON.stringify([
          'Civil Law — Unlawful eviction & rural land title defense',
          'Family & Gender Protection — Magistrate protection orders',
          'Child Rights Act & school access enforcement',
          'Patient rights & unlawful hospital detention release'
        ]),
        9,
        JSON.stringify(['Kano State High Court', 'Family & Magistrates Courts (Kano)', 'National Industrial Court']),
        'LL.B (Ahmadu Bello University, Zaria), B.L (Nigerian Law School, Abuja)',
        'Pro bono for domestic safety, child rights, and indigent women farmers',
        JSON.stringify([
          'Domestic & gender-based violence protection orders',
          'Widowhood inheritance & smallholder farmland boundary disputes',
          'Maternity patients detained over unpaid hospital bills'
        ]),
        'Within 12 hours for safety orders; 24–48 hours for civil land review',
        'Sample representation summary: Represented rural women cooperatives in compensation assessments and obtained urgent magistrate protection orders across Kano State.',
        JSON.stringify(['Phone call (Hausa / Fulfulde / English)', 'Legal clinic walk-in (Nasarawa LGA)', 'Audio note review']),
        row.id
      );
    } else if (row.name.includes('Boma Briggs')) {
      updateAdv.run(
        'Administrative & Freedom of Information Advocacy',
        JSON.stringify([
          'Administrative Law — FOI Act 2011 drafting & tracking',
          'Public Procurement & Ward Project Verification',
          'Environmental & Host Community Grievance Documentation',
          'Peaceful Legislative Petition Formatting'
        ]),
        7,
        JSON.stringify(['Public Complaints Commission Desks', 'Ministry & Local Council FOI Registries']),
        'B.Sc Political Science (UNIPORT), Certified Community Paralegal & FOI Practitioner',
        'Free community paralegal support (100% non-fee civic clinic)',
        JSON.stringify([
          'Unanswered 7-day Freedom of Information requests',
          'Abandoned clinic, school, or borehole contracts',
          'Environmental spill & community farmland documentation'
        ]),
        'Within 48 hours with ready-to-stamp FOI draft letter',
        'Sample representation summary: Assisted 19 ward development committees in Rivers State to file stamped FOI requests and obtain contractor Bill of Quantities records.',
        JSON.stringify(['WhatsApp / Phone call (English & Pidgin)', 'Community hall clinic (Port Harcourt)']),
        row.id
      );
    } else if (row.name.includes('Funmilayo Alabi')) {
      updateAdv.run(
        'Constitutional, Media & Public Interest Litigation',
        JSON.stringify([
          'Constitutional Law — Section 39 press & speech defense',
          'Civil & Administrative Appeals — Tribunal misconduct review',
          'Peaceful Assembly (Section 40) & Civic Association Rights',
          'Cybercrimes Act unlawful arrest defense for journalists'
        ]),
        14,
        JSON.stringify(['Court of Appeal (Ibadan Division)', 'Federal High Court', 'Oyo State High Court']),
        'LL.B (University of Ibadan), LL.M Constitutional Law, B.L (Nigerian Law School)',
        'Pro bono public interest docket via chamber intake review',
        JSON.stringify([
          'Journalist or civic reporter arrests over public reporting',
          'Administrative abuse of court process or improper remand warrants',
          'Unlawful disruption of peaceful community town halls'
        ]),
        'Within 24–48 hours (currently at full court docket capacity)',
        'Sample representation summary: Lead appellate counsel on constitutional free expression and administrative fairness appeals in the Southwest.',
        JSON.stringify(['Scheduled chamber consultation (Ibadan)', 'Secure document review']),
        row.id
      );
    } else if (row.name.includes('Modu Kyari')) {
      updateAdv.run(
        'Humanitarian Civil Documentation & Education Rights',
        JSON.stringify([
          'Civil Documentation — Birth, ID & school enrolment records',
          'Education Rights — Informal school levy resolution',
          'Humanitarian Access & Displaced Household Mediation',
          'Multilingual Kanuri & Hausa Witness Statement Intake'
        ]),
        6,
        JSON.stringify(['State Universal Basic Education Board (SUBEB) Desks', 'Public Complaints Commission (Borno)']),
        'Diploma in Law (University of Maiduguri), Trained Humanitarian Legal Aid Paralegal',
        '100% Free community paralegal assistance',
        JSON.stringify([
          'Students excluded from public exams over unapproved levies',
          'Civil identity and documentation barriers for displaced families',
          'Primary healthcare access complaints'
        ]),
        'Within 24 hours (Kanuri, Hausa, and English supported)',
        'Sample representation summary: Helped over 60 displaced and low-income families resolve school registration barriers and obtain official civil documentation.',
        JSON.stringify(['In-person paralegal desk (Maiduguri)', 'Voice call (Kanuri / Hausa / English)']),
        row.id
      );
    }
  }

  // Enrich Knowledge Guides & add comprehensive topics
  const updateGuide = db.prepare(`
    UPDATE knowledge_guides SET
      reading_minutes = ?,
      body = ?,
      statutory_citations = ?,
      practical_steps = ?,
      what_not_to_do = ?,
      faqs = ?
    WHERE slug = ?
  `);

  updateGuide.run(
    6,
    JSON.stringify([
      'First, protect your physical safety. Stay calm, keep your hands visible, speak respectfully, and never argue physically with armed personnel. Every constitutional remedy works best when you are safe and unharmed.',
      'Under Section 35 of the 1999 Constitution of Nigeria (as amended), every citizen has the fundamental right to personal liberty. Any person who is arrested or detained must be informed in writing within 24 hours — and in a language they understand — of the specific facts and legal grounds for the arrest.',
      'Under Section 35(2) and the Administration of Criminal Justice Act (ACJA) 2015, you have the right to remain silent and avoid answering questions until after consultation with a legal practitioner or any person of your choice. Under Section 17 of the ACJA, confessional statements must be recorded in the presence of a legal practitioner or captured on video/audio to prevent coercion.',
      'Constitutional remand limits are strict: for any non-capital offence, where a court of competent jurisdiction exists within a 40-kilometre radius, an arrested person must be brought before a court within 24 hours (or 48 hours otherwise). Holding a citizen for days without a magistrate remand order or formal charge violates Section 35(4)–(5).',
      'Under Section 6 of the ACJA, police officers are prohibited from arresting a parent, spouse, sibling, or friend in place of a suspect ("arrest in lieu" is illegal in Nigeria). Furthermore, station bail is constitutionally free; unreceipted cash demands should be quietly noted with date, time, and officer details once safe.'
    ]),
    JSON.stringify([
      'Section 34, 1999 Constitution — Right to dignity of human person (prohibits torture or inhuman treatment)',
      'Section 35(1)–(6), 1999 Constitution — Personal liberty, 24–48 hour court limit, and right to compensation/apology for unlawful detention',
      'Sections 6, 15 & 17, Administration of Criminal Justice Act (ACJA) 2015 — Prohibition of arrest by proxy, mandatory arrest registry, and lawyer presence for statements',
      'Nigeria Police Act 2020 — Duty to notify next-of-kin upon arrest at public expense'
    ]),
    JSON.stringify([
      'Ask calmly: "Officer, please let me know the station we are going to so I can inform my family and lawyer."',
      'Send a brief message to one trusted contact with the patrol vehicle number, junction name, and time if safe to do so.',
      'Politely state: "I wish to wait for my lawyer before writing or signing a statement."',
      'Once safe, record the exact timeline, division name, and witness names on Civic Watch Nigeria.'
    ]),
    JSON.stringify([
      'Never physically resist, grab an officer’s uniform, or raise your voice in a roadside confrontation.',
      'Never sign a blank sheet of paper, a backdated bail bond, or a statement written for you that you could not read.',
      'Do not hand over banking PINs under informal pressure without logging the demand afterward.'
    ]),
    JSON.stringify([
      {
        q: 'Can police arrest my brother or wife if they cannot find someone else?',
        a: 'No. Section 7 of the ACJA 2015 and the Police Act 2020 strictly outlaw arrest in lieu (arrest by proxy) anywhere in Nigeria.'
      },
      {
        q: 'Is police station bail supposed to be paid for in cash?',
        a: 'Administrative bail at a police station is free. A surety signs a recognisance bond promising the person will appear when required.'
      }
    ]),
    'rights-during-police-stop-and-detention'
  );

  updateGuide.run(
    7,
    JSON.stringify([
      'Nigeria’s Freedom of Information (FOI) Act 2011 grants every person — regardless of age, occupation, or state of residence — a legally enforceable right to access records, contracts, and financial data held by government ministries, departments, agencies, and private contractors executing public projects.',
      'Under Section 1(2) of the FOI Act, an applicant does not need to demonstrate any specific personal interest in the information being applied for. Asking how public clinic funds, school renovations, or road contracts were executed is a protected civic right.',
      'To make your request effective, keep it narrow and verifiable. Instead of asking "Why is our road bad?", request specific records: "Certified copy of the Contract Award Letter, Bill of Quantities (BOQ), and Engineers Completion Certificate for the 2025 Solar Borehole at Ward 4 Primary Health Centre."',
      'Print two copies of your letter. Submit one to the registry or FOI Desk of the agency, and ensure the receiving clerk stamps, dates, and signs your duplicate copy. That stamped duplicate is your primary proof if the timeline is ignored.',
      'Under Section 4, the public institution must grant access within 7 days or issue a written notice citing the specific statutory exemption. Under Section 20, if access is wrongfully denied or ignored, you or a pro bono advocate can apply to a High Court for judicial review within 30 days.'
    ]),
    JSON.stringify([
      'Section 1, FOI Act 2011 — Right of any person to access public records without proving personal interest',
      'Section 2(3), FOI Act 2011 — Mandatory proactive publication of project contracts and budgets',
      'Section 4 & Section 7, FOI Act 2011 — Mandatory 7-day response timeline and written reasons for refusal',
      'Section 20, FOI Act 2011 — Right to apply to Court within 30 days of refusal or silence'
    ]),
    JSON.stringify([
      'Identify the exact ministry, board, or local council responsible for the project signboard.',
      'List 2 to 4 concrete documents with project year and ward location.',
      'Deliver two printed copies and photograph your stamped acknowledgement copy immediately.',
      'Mark day 7 on your calendar; if unanswered, connect with a trained FOI paralegal on the Justice page.'
    ]),
    JSON.stringify([
      'Do not include insults, political accusations, or unverified rumours in an FOI letter — keep the tone strictly formal and polite.',
      'Do not hand over your only copy without getting a dated registry stamp or courier delivery proof.'
    ]),
    JSON.stringify([
      {
        q: 'Can an ordinary student, farmer, or market trader sign an FOI letter without a lawyer?',
        a: 'Yes. Section 1 applies to "any person." Illiterate or disabled applicants may also make oral applications under Section 3(3), which the public official must reduce into writing.'
      },
      {
        q: 'Can an agency charge huge fees to discourage me?',
        a: 'No. Under Section 8, fees are strictly limited to standard actual duplication and photocopying costs.'
      }
    ]),
    'how-to-file-foi-request-nigeria'
  );

  updateGuide.run(
    5,
    JSON.stringify([
      'Strong accountability cases succeed on clear, honest facts — not dramatic adjectives. Lawyers, magistrates, and public complaints commissioners look first for consistent dates, verifiable locations, and unedited primary records.',
      'Whenever an incident happens, prioritise personal safety first. Once you are in a calm location, write down events in strict chronological order: what time it started, exact junction or building name, names or badge numbers visible, and direct quotes you heard.',
      'Keep original photos, receipts, hospital cards, and documents untouched on your phone. Avoid cropping out edges, adding social-media captions over images, or forwarding through heavy compression before uploading, because original file properties corroborate authenticity.',
      'Clearly separate eyewitness facts ("I saw two patrol vans arrive at 18:40") from hearsay ("Neighbours said the van came from Ikeja"). Reviewers trust reporters who state honestly what they do and do not know.',
      'When you attach files in Civic Watch Nigeria, our backend computes a SHA-256 cryptographic seal and UTC upload timestamp and stores the file privately so raw evidence is protected from public tampering.'
    ]),
    JSON.stringify([
      'Section 84, Evidence Act 2011 — Conditions for admissibility of computer-generated and digital photographs/recordings in Nigerian courts',
      'Data Protection Act (NDPA) 2023 — Lawful, minimal, and secure handling of personal witness records'
    ]),
    JSON.stringify([
      'Write down the date, time, State, LGA, and nearest landmark within hours while memory is accurate.',
      'Save original unedited photos, POS receipts, medical slips, or stamped letters in a safe folder.',
      'Ask consenting witnesses how a lawyer may reach them privately if an affidavit is needed.',
      'Upload originals directly into Step 5 of the Report flow so the SHA-256 timestamp seal is recorded.'
    ]),
    JSON.stringify([
      'Never endanger your life or safety to film armed individuals.',
      'Never exaggerate numbers, injuries, or timelines — a single false detail can undermine an otherwise valid case.',
      'Do not publish private phone numbers or medical records of victims on public feeds.'
    ]),
    JSON.stringify([
      {
        q: 'Can my report still be reviewed if I could not take any photo or video?',
        a: 'Yes. Detailed written or voice-dictated timelines with accurate dates, landmarks, and witness notes are regularly verified and acted upon by lawyers.'
      }
    ]),
    'preserving-evidence-safely'
  );

  updateGuide.run(
    5,
    JSON.stringify([
      'Peaceful civic participation is protected under Section 40 (freedom of assembly and association) and Section 39 (freedom of expression) of the 1999 Constitution of Nigeria. Citizens have every lawful right to petition legislators, attend town halls, and request institutional accountability.',
      'Petitions carry the greatest weight when they address the exact committee or agency that holds statutory power to fix the problem — for example, petitioning a State Universal Basic Education Board over informal school levies, or a Chief Magistrate Monitoring Committee over detention inspections.',
      'Civic Watch Nigeria maintains a strict non-partisan, non-violent standard. Keeping petitions focused on concrete public services and statutory duties allows citizens of every background to sign safely without partisan division.',
      'Every signature on this platform passes through an explicit consent notice so signers know how their name, State, and LGA are recorded on the formal committee schedule.'
    ]),
    JSON.stringify([
      'Section 39 & Section 40, 1999 Constitution — Freedom of expression and peaceful assembly/association',
      'Public Complaints Commission Act — Citizen right to lodge administrative injustice complaints free of charge'
    ]),
    JSON.stringify([
      'State the exact community problem, affected ward/LGA, and dates verified.',
      'Cite the public agency or legislative committee with lawful authority to act.',
      'List 2 or 3 realistic, measurable remedies (such as publishing a fee schedule or repairing a clinic borehole).',
      'Share updates calmly without insults or unverified personal attacks.'
    ]),
    JSON.stringify([
      'Never use threats, hate speech, or calls for unlawful disruption.',
      'Never sign another person’s name to a petition without their direct permission.'
    ]),
    JSON.stringify([
      {
        q: 'Does signing a petition on Civic Watch Nigeria affiliate me with a political party?',
        a: 'Never. All petitions on Civic Watch Nigeria are strictly non-partisan civic requests addressed to public institutions.'
      }
    ]),
    'peaceful-assembly-and-petitions'
  );

  // Insert 3 additional high-value Nigerian Civil, Labour/Healthcare & Tenancy/Land guides if missing
  const existingExtra = db.prepare("SELECT COUNT(*) as c FROM knowledge_guides WHERE slug = 'land-tenancy-and-unlawful-eviction-rights'").get() as { c: number };
  if (existingExtra.c === 0) {
    const insertRichGuide = db.prepare(`
      INSERT INTO knowledge_guides (
        slug, title, category, reading_minutes, summary, body, key_points,
        related_slugs, statutory_citations, practical_steps, what_not_to_do, faqs, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRichGuide.run(
      'land-tenancy-and-unlawful-eviction-rights',
      'Civil law guide: Tenancy notices, unlawful self-help eviction, and land grabbing',
      'Civil & property rights',
      6,
      'What Nigerian civil law requires before a tenant can be evicted or before community farmland can be acquired.',
      JSON.stringify([
        'Across Nigeria’s state Recovery of Premises and Tenancy Laws, a landlord or agent cannot lawfully evict a lawful tenant by removing roofs, locking gates, cutting water/electricity, or throwing belongings onto the street without a valid court order. "Self-help" eviction is unlawful and exposes the perpetrator to civil damages.',
        'Unless a written tenancy agreement states otherwise, statutory "Notice to Quit" periods apply: 1 week for a tenant at will, 1 month for a monthly tenant, 3 months for a quarterly or half-yearly tenant, and 6 months for a yearly tenant. After a valid Notice to Quit expires, the landlord must still serve a statutory "7 Days Notice of Owner’s Intention to Apply to Court to Recover Possession" before approaching a Magistrate or High Court.',
        'For rural farmland and family land, the Land Use Act 1978 allows revocation of rights of occupancy only for overriding public interest, accompanied by formal gazetted/written notice and prompt assessment of compensation for unexhausted improvements and economic crops.',
        'Several states (including Lagos, Ogun, Oyo, Edo, and Delta) have enacted anti-land-grabbing statutes criminalising forceful entry onto land with thugs ("omo onile" extortion) or demanding illegal foundation/roofing levies.'
      ]),
      JSON.stringify([
        'Lockouts, roof removal, and forceful street evictions without a court order are illegal self-help.',
        'Statutory Notice to Quit + 7-day court intention notice are required before court recovery.',
        'Compulsory land acquisition requires formal notice and crop/improvement valuation under the Land Use Act.'
      ]),
      JSON.stringify(['preserving-evidence-safely', 'rights-during-police-stop-and-detention']),
      JSON.stringify([
        'Recovery of Premises Laws / State Tenancy Laws — Mandatory quit notices and court possession orders',
        'Sections 28 & 29, Land Use Act 1978 — Revocation for overriding public purpose and mandatory compensation for crops/improvements',
        'State Property Protection (Anti-Land Grabbing) Laws — Prohibition of forceful land entry and illegal construction levies'
      ]),
      JSON.stringify([
        'Keep all rent receipts, bank transfer narrations, tenancy agreements, and survey/purchase receipts safely photographed.',
        'If served a written notice, check the exact date served and consult a civil lawyer immediately rather than ignoring it.',
        'If threatened with forceful lock-out or land-grabbing, document dates and witnesses safely and contact a civil rights lawyer or state Property Protection Taskforce.'
      ]),
      JSON.stringify([
        'Do not engage in physical fights over boundary beacons or locked doors.',
        'Do not pay cash rent or land settlements without a signed, dated receipt or traceable bank transfer.'
      ]),
      JSON.stringify([
        {
          q: 'Can police evict me from my rented apartment on behalf of a landlord?',
          a: 'No. Tenancy and rent recovery are civil matters, not criminal offences. Only court sheriffs/bailiffs executing a valid court judgment may carry out lawful possession recovery.'
        }
      ]),
      '2026-11-10'
    );

    insertRichGuide.run(
      'workplace-healthcare-and-school-rights',
      'Healthcare emergency treatment, public school levies, and basic worker protections',
      'Healthcare, school & civil life',
      6,
      'Know the Nigerian laws protecting emergency medical care, free basic schooling, and fair treatment of workers.',
      JSON.stringify([
        'Under Section 20 of the National Health Act 2014 and the Compulsory Treatment and Care for Victims of Gunshot Act 2017, healthcare providers (both public and private) must not refuse emergency medical treatment for any reason, nor demand a police report as a precondition before stabilising a gunshot or accident victim.',
        'Detaining new mothers, infants, or discharged patients inside hospital wards over unpaid medical bills restricts personal liberty; civil lawyers and legal clinics regularly negotiate structured payment plans and secure immediate release.',
        'Under the Compulsory, Free Universal Basic Education (UBE) Act 2004, primary and junior secondary education in public schools is tuition-free. Where parents face unapproved, unreceipted cash levies that exclude children from classes or exams, parent forums can report calmly to the State Universal Basic Education Board (SUBEB).',
        'Under the Nigerian Labour Act and National Industrial Court jurisprudence, workers are entitled to written contract terms within 3 months of employment, earned wages without unlawful deductions, and safe working conditions.'
      ]),
      JSON.stringify([
        'Emergency victims (including accident and gunshot patients) must receive immediate stabilising treatment without waiting for a police extract.',
        'Public primary and junior secondary education is protected under the UBE Act.',
        'Employees must receive written employment terms and earned wages.'
      ]),
      JSON.stringify(['how-to-file-foi-request-nigeria', 'preserving-evidence-safely']),
      JSON.stringify([
        'Section 20, National Health Act 2014 — Prohibition of refusal of emergency medical treatment',
        'Compulsory Treatment and Care for Victims of Gunshot Act 2017 — Immediate care without prior police report',
        'Section 2, Universal Basic Education (UBE) Act 2004 — Free, compulsory primary and junior secondary public schooling',
        'Section 7, Labour Act — Written particulars of employment terms within 3 months'
      ]),
      JSON.stringify([
        'In a medical emergency, calmly remind hospital intake staff of Section 20 of the National Health Act while family arranges registration.',
        'Request official state-published fee schedules before paying informal school cash levies.',
        'Keep copies of employment letters, salary bank alerts, and hospital invoices.'
      ]),
      JSON.stringify([
        'Never assault or threaten nurses, doctors, or teachers — document refusals or unlawful levies calmly in writing.',
        'Do not surrender original academic certificates or international passports to an employer as bond.'
      ]),
      JSON.stringify([
        {
          q: 'Can a hospital insist on a police report before treating a road accident or gunshot victim?',
          a: 'No. Under the Compulsory Treatment and Care for Victims of Gunshot Act 2017, hospitals must accept and commence immediate life-saving treatment first and notify police within two hours.'
        }
      ]),
      '2026-11-11'
    );

    insertRichGuide.run(
      'gender-protection-and-child-safeguarding',
      'Protection against domestic violence, gender abuse, and child rights violations',
      'Family & human rights',
      5,
      'Confidential legal remedies under the Violence Against Persons (Prohibition) Act and Child Rights laws.',
      JSON.stringify([
        'The Violence Against Persons (Prohibition) Act (VAPP) 2015 and corresponding state laws criminalise physical, sexual, emotional, and economic abuse, harmful widowhood practices, forceful ejection of a spouse from a matrimonial home, and abandonment of children without sustenance.',
        'Survivors or social workers/lawyers acting with their consent can apply to a Magistrate or High Court for a Protection Order. A Protection Order legally bars an abuser from approaching the survivor’s home, workplace, or school, and can grant temporary custody and maintenance support.',
        'Under the Child Rights Act 2003 (and state Child Rights Laws), the best interest of the child is paramount in every action. Child trafficking, hazardous child labour, denial of basic education, and abuse are prosecutable offences handled by specialised Family Courts and Gender Desks.',
        'Reports involving gender violence or children on Civic Watch Nigeria should always use confidential privacy settings so survivor identities are protected while connecting directly with verified trauma-informed female and male advocates.'
      ]),
      JSON.stringify([
        'Forceful ejection from a matrimonial home and harmful widowhood practices are unlawful under VAPP laws.',
        'Courts can issue urgent Protection Orders to safeguard survivors and children.',
        'Always protect survivor privacy — raw files and identities remain strictly confidential.'
      ]),
      JSON.stringify(['preserving-evidence-safely', 'rights-during-police-stop-and-detention']),
      JSON.stringify([
        'Violence Against Persons (Prohibition) Act (VAPP) 2015 — Comprehensive protection orders and prohibition of spousal ejection/harmful practices',
        'Child Rights Act 2003 — Paramountcy of child welfare, Family Courts, and protection from abuse/exploitation'
      ]),
      JSON.stringify([
        'Prioritise immediate physical safety and confidential medical care (such as a Sexual Assault Referral Centre / SARC where needed).',
        'Preserve medical reports, threatening messages, and witness contacts privately.',
        'Select confidential identity mode when filing a report and request a verified family/gender protection lawyer.'
      ]),
      JSON.stringify([
        'Never post a child’s face, school name, or survivor’s home address on public social feeds.',
        'Do not allow informal pressure to destroy medical records needed for a court Protection Order.'
      ]),
      JSON.stringify([
        {
          q: 'Will my name appear publicly if I report domestic or gender violence here?',
          a: 'No. Uncheck public feed sharing or select confidential mode in Step 6 so only your assigned verified lawyer can view your record.'
        }
      ]),
      '2026-11-11'
    );
  }
}

function seedInitialData() {
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existingUsers.count > 0) return;

  const now = '2026-11-12T09:15:00.000Z';
  const adminHash = bcrypt.hashSync('CivicAdmin2026!', 10);
  const advocateHash = bcrypt.hashSync('CivicAdvocate2026!', 10);
  const citizenHash = bcrypt.hashSync('CivicCitizen2026!', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, state, lga, email_verified, mfa_enabled, preferred_lang, amplify_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'en', ?, ?)
  `);

  const adminInfo = insertUser.run('admin@civicwatch.sample.ng', adminHash, 'Amina Abdullahi (Sample Admin)', 'admin', 'FCT Abuja', 'Municipal Area Council (AMAC)', 1, 4, now);
  const advUserInfo = insertUser.run('advocate@civicwatch.sample.ng', advocateHash, 'Barr. Chinedu Okafor (Sample Advocate)', 'advocate', 'Lagos', 'Ikeja', 1, 9, now);
  const citizenInfo = insertUser.run('citizen@civicwatch.sample.ng', citizenHash, 'Tunde Adeyemi (Sample Citizen)', 'citizen', 'Lagos', 'Surulere', 0, 6, now);

  void adminInfo;

  // Seed Advocates (clearly marked is_sample = 1, SVG avatar initials, non-invented transparent org labels)
  const insertAdvocate = db.prepare(`
    INSERT INTO advocates (user_id, name, photo, type, specialisations, languages, state, lga, bar_number, organisation, verified, available, rating, cases_handled, bio, availability_hours, is_sample, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 1, ?)
  `);

  const adv1 = insertAdvocate.run(
    advUserInfo.lastInsertRowid,
    'Barr. Chinedu Okafor (Sample Profile)',
    'CO',
    'lawyer',
    JSON.stringify(['Illegal detention', 'Police brutality', 'Human rights abuse']),
    JSON.stringify(['English', 'Igbo', 'Nigerian Pidgin']),
    'Lagos',
    'Ikeja',
    'SCN-SAMPLE-04182',
    'Sample Pro Bono Fundamental Rights Desk — Lagos',
    1,
    4.9,
    42,
    'Sample legal practitioner profile demonstrating fundamental rights enforcement filings, remand review applications, and station bail representation in Lagos State.',
    'Mon–Fri, 08:30–17:30 WAT',
    now
  );

  const adv2 = insertAdvocate.run(
    null,
    'Barr. Hauwa Danjuma (Sample Profile)',
    'HD',
    'lawyer',
    JSON.stringify(['Gender violence', 'Child rights', 'Healthcare abuse', 'Land grabbing']),
    JSON.stringify(['English', 'Hausa', 'Fulfulde']),
    'Kano',
    'Nasarawa',
    'SCN-SAMPLE-07914',
    'Sample Northern Civic Legal Clinic — Kano',
    1,
    4.8,
    37,
    'Sample family protection and civic accountability lawyer focused on magistrate court protection orders, hospital detention release, and rural land documentation.',
    'Mon–Sat, 09:00–16:30 WAT',
    now
  );

  insertAdvocate.run(
    null,
    'Boma Briggs (Sample Trained Advocate)',
    'BB',
    'trained_advocate',
    JSON.stringify(['FOI violations', 'Public fund misuse', 'Community injustice', 'Environment']),
    JSON.stringify(['English', 'Nigerian Pidgin']),
    'Rivers',
    'Port Harcourt',
    null,
    'Sample Civic Budget & FOI Paralegal Network — Rivers',
    1,
    4.7,
    29,
    'Sample trained civic paralegal assisting residents to draft Freedom of Information requests, track local procurement records, and prepare community petitions.',
    'Tue–Sat, 10:00–18:00 WAT',
    now
  );

  insertAdvocate.run(
    null,
    'Barr. Funmilayo Alabi (Sample Profile)',
    'FA',
    'lawyer',
    JSON.stringify(['Judicial misconduct', 'Free speech suppression', 'Electoral violence']),
    JSON.stringify(['English', 'Yoruba']),
    'Oyo',
    'Ibadan North',
    'SCN-SAMPLE-05520',
    'Sample Public Interest Chambers — Ibadan',
    0,
    4.9,
    51,
    'Sample appellate and constitutional rights counsel handling unlawful press detention, administrative tribunal appeals, and peaceful assembly defense.',
    'Mon–Fri, 09:00–17:00 WAT',
    now
  );

  insertAdvocate.run(
    null,
    'Modu Kyari (Sample Trained Advocate)',
    'MK',
    'trained_advocate',
    JSON.stringify(['Human rights abuse', 'Education abuse', 'Healthcare abuse']),
    JSON.stringify(['English', 'Kanuri', 'Hausa']),
    'Borno',
    'Maiduguri',
    null,
    'Sample Northeast Community Paralegal Desk — Maiduguri',
    1,
    4.8,
    24,
    'Sample community paralegal supporting displaced households and students with civil documentation, school access complaints, and multilingual intake.',
    'Mon–Fri, 08:00–16:00 WAT',
    now
  );

  // Seed Sample Reports across stages
  const insertReport = db.prepare(`
    INSERT INTO reports (
      user_id, case_reference, title, summary, description, category, urgency,
      incident_datetime, state, lga, address, coordinates, geostamp, captured_at,
      victims, witnesses, evidence_urls, credibility_score, status, is_anonymous,
      is_public, is_verified, ai_summary, assigned_advocate_id, assigned_lawyer_name,
      report_type, is_sample, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const r1 = insertReport.run(
    citizenInfo.lastInsertRowid,
    'CWN-2026-LA-10482',
    '[Sample] Unlawful 72-hour detention of commercial bus driver without charge',
    'Sample report: Driver held beyond constitutional 48-hour limit after declining an unreceipted roadside cash demand.',
    'Sample demonstration record: On 8 November 2026 around 19:20 WAT along Western Avenue in Surulere, officers stopped a 14-seater minibus, confiscated the ignition key, and detained the driver for three days without an entry on the formal charge register or access to station bail.',
    JSON.stringify(['illegal_detention', 'police_brutality']),
    4,
    '2026-11-08T19:20',
    'Lagos',
    'Surulere',
    'Near Ojuelegba Bridge Corridor, Surulere (Sample Location)',
    '6.5095, 3.3674',
    'GEO-SEALED:6.5095N,3.3674E±12m',
    '2026-11-09T07:42:18.000Z',
    '1 adult male commercial driver (identity protected in public view)',
    '2 passengers recorded time of stop and vehicle plate log',
    JSON.stringify([
      { name: 'sample-station-visitation-log.pdf', type: 'application/pdf', size: 184200, sealedAt: '2026-11-09T07:42:18.000Z', sha256: 'sample-seal-8f3c2a91b4' }
    ]),
    89,
    'lawyer_assigned',
    0,
    1,
    null,
    adv1.lastInsertRowid,
    'Barr. Chinedu Okafor (Sample Profile)',
    'written',
    '2026-11-09T07:42:18.000Z',
    '2026-11-11T14:10:00.000Z'
  );

  insertReport.run(
    null,
    'CWN-2026-FC-20914',
    '[Sample] Unanswered Freedom of Information request on primary clinic borehole contract',
    'Sample report: Community health committee requested procurement completion certificate after borehole stopped working within 3 weeks.',
    'Sample demonstration record: Residents in Kuje submitted a formal Freedom of Information letter requesting contractor handover notes for a solar-powered clinic water project listed as completed. Over 14 statutory days passed without acknowledgement.',
    JSON.stringify(['foi_violations', 'public_fund_misuse', 'healthcare_abuse']),
    2,
    '2026-10-22T11:00',
    'FCT Abuja',
    'Kuje',
    'Ward Primary Health Centre Road, Kuje (Sample Location)',
    '8.8795, 7.2275',
    'GEO-SEALED:8.8795N,7.2275E±18m',
    '2026-11-05T10:15:04.000Z',
    'Clinic outpatients and maternity ward staff',
    'Ward development committee secretary',
    JSON.stringify([
      { name: 'sample-stamped-foi-acknowledgement.jpg', type: 'image/jpeg', size: 245000, sealedAt: '2026-11-05T10:15:04.000Z', sha256: 'sample-seal-4a91d02ef1' }
    ]),
    92,
    'government_engaged',
    1,
    1,
    null,
    null,
    null,
    'written',
    '2026-11-05T10:15:04.000Z',
    '2026-11-10T16:30:00.000Z'
  );

  insertReport.run(
    null,
    'CWN-2026-KN-31105',
    '[Sample] Informal school levies blocking Junior Secondary exam registration',
    'Sample report: Parents asked to pay unapproved cash fees before students receive continuous assessment numbers.',
    'Sample demonstration record: Several families reported through voice intake that students in Dala were sent home from public Junior Secondary classes over an unreceipted cash levy not listed on the state education board schedule.',
    JSON.stringify(['education_abuse', 'corruption']),
    3,
    '2026-11-04T08:30',
    'Kano',
    'Dala',
    'Kofar Ruwa School Axis, Dala (Sample Location)',
    '12.0182, 8.5014',
    'GEO-SEALED:12.0182N,8.5014E±22m',
    '2026-11-04T13:05:49.000Z',
    'Junior secondary students from low-income households',
    'Parent-teacher forum members',
    JSON.stringify([]),
    84,
    'verified',
    1,
    1,
    null,
    adv2.lastInsertRowid,
    'Barr. Hauwa Danjuma (Sample Profile)',
    'voice',
    '2026-11-04T13:05:49.000Z',
    '2026-11-09T11:20:00.000Z'
  );

  insertReport.run(
    null,
    'CWN-2026-RI-40291',
    '[Sample] Farmland boundary clearance without statutory notice or compensation assessment',
    'Sample report: Cassava plots cleared overnight without prior gazetted notice or valuation record.',
    'Sample demonstration record: Smallholder women farmers in Obio/Akpor documented earth-moving equipment clearing cultivated plots without serving written acquisition notices or conducting crop enumeration.',
    JSON.stringify(['land_grabbing', 'community_injustice']),
    4,
    '2026-11-01T06:45',
    'Rivers',
    'Obio/Akpor',
    'Eneka-Igwuruta Farmland Track (Sample Location)',
    '4.8942, 7.0291',
    'GEO-SEALED:4.8942N,7.0291E±15m',
    '2026-11-02T09:12:30.000Z',
    '14 smallholder farming households',
    'Cooperative secretary and neighbouring plot holders',
    JSON.stringify([]),
    87,
    'advocacy_active',
    0,
    1,
    null,
    null,
    null,
    'written',
    '2026-11-02T09:12:30.000Z',
    '2026-11-11T09:00:00.000Z'
  );

  // Seed Case Notes
  const insertNote = db.prepare(`
    INSERT INTO case_notes (report_id, author_name, author_role, note, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertNote.run(r1.lastInsertRowid, 'Civic Intake Desk (Sample)', 'Verifier', 'Cross-checked date, corridor coordinates, and uploaded visitation log metadata. Geostamp verified.', '2026-11-09T12:15:00.000Z');
  insertNote.run(r1.lastInsertRowid, 'Barr. Chinedu Okafor (Sample Profile)', 'Assigned Lawyer', 'Prepared formal administrative bail demand letter citing Section 35(4) & (5) of the 1999 Constitution (as amended).', '2026-11-11T14:10:00.000Z');

  // Seed Petitions
  const insertPetition = db.prepare(`
    INSERT INTO petitions (
      title, summary, description, demands, evidence_items, media_updates, public_insight,
      category, target_signatures, current_signatures, status, deadline,
      related_report_ref, hashtag, legislative_targets, is_sample, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 1, ?)
  `);

  insertPetition.run(
    '[Sample] Publish quarterly detention register audits across metropolitan police divisions',
    'Sample non-partisan civic petition requesting routine magistrate oversight inspections as already provided under the Administration of Criminal Justice Act (ACJA).',
    'Sample petition text: Under Section 34 of the Administration of Criminal Justice Act (ACJA) and equivalent state laws, designated magistrates are empowered to inspect detention facilities every month. Citizens are asking oversight committees to publish anonymised compliance summaries so families know inspections are happening on schedule.',
    JSON.stringify([
      'Publish monthly anonymised counts of magistrate detention inspections per division.',
      'Display plain-language bail rights posters in English, Pidgin, Hausa, Yoruba, and Igbo at every public counter.',
      'Ensure duty solicitors have scheduled access to detainees held past 24 hours.'
    ]),
    JSON.stringify([
      { title: 'Statutory basis — ACJA Section 34', detail: 'Requires monthly visitation by Chief Magistrates or designated magistrates to police stations and detention centres.' },
      { title: 'Linked Sample Case CWN-2026-LA-10482', detail: 'Illustrates multi-day detention without timely magistrate review.' }
    ]),
    JSON.stringify([
      { date: '2026-11-10', title: 'Sample Oversight Hearing Scheduled', body: 'Sample update: State justice sector reform working group acknowledged receipt of citizen signatures.' },
      { date: '2026-11-03', title: 'Sample Paralegal Brief Published', body: 'Plain-language explainer translated into five Nigerian languages for community radio reading.' }
    ]),
    'Sample insight summary: Signers across 14 states emphasise peaceful, lawful implementation of existing Nigerian statutes rather than new legislation. Most comments highlight family anxiety when detention logs are unavailable.',
    'Illegal detention',
    1000,
    642,
    '2026-12-31',
    'CWN-2026-LA-10482',
    '#OpenDetentionAuditSample',
    JSON.stringify(['House Committee on Justice (Sample Target)', 'State Administration of Criminal Justice Monitoring Committees (Sample Target)']),
    now
  );

  insertPetition.run(
    '[Sample] Disclose completion certificates and maintenance contacts for rural clinic water projects',
    'Sample petition calling for public noticeboards at primary health centres showing contractor handover dates and repair hotlines.',
    'Sample petition text: When primary health centre water boreholes break down weeks after commissioning, maternity patients and health workers carry water manually. Publishing basic project handover sheets on clinic walls helps communities verify work peacefully.',
    JSON.stringify([
      'Post weatherproof project handover summaries at each primary health clinic gate.',
      'Respond to citizen Freedom of Information requests within the statutory 7-day window.',
      'Include ward health committees in final functional testing before contractor sign-off.'
    ]),
    JSON.stringify([
      { title: 'FOI Act 2011 — Section 2 & Section 4', detail: 'Mandates proactive disclosure of public project records and responses within 7 days.' },
      { title: 'Linked Sample Case CWN-2026-FC-20914', detail: 'Documents an unanswered FOI request regarding a clinic borehole in Kuje.' }
    ]),
    JSON.stringify([
      { date: '2026-11-08', title: 'Sample Community Health Inspection', body: 'Sample update: Ward committee compiled photographic log of non-functional solar pump.' }
    ]),
    'Sample insight summary: Rural nurses, mothers, and youth development unions represent the primary signers, requesting transparent maintenance accountability.',
    'Public fund misuse',
    500,
    389,
    '2026-12-15',
    'CWN-2026-FC-20914',
    '#CleanWaterForClinicsSample',
    JSON.stringify(['Area Council Works Oversight Desk (Sample Target)', 'Primary Health Care Board FOI Unit (Sample Target)']),
    now
  );

  // Seed Campaigns, Town Halls, Volunteer Roles
  db.prepare(`
    INSERT INTO campaigns (title, summary, state, category, participants_count, organizer_type, is_sample, created_at)
    VALUES
      ('[Sample] Know Your Bail Rights — Commuter Bus Park Cards', 'Peaceful distribution of pocket rights cards in English, Pidgin, Yoruba, Hausa, and Igbo at major motor parks.', 'Lagos', 'Legal literacy', 148, 'Sample Citizen Volunteers', 1, ?),
      ('[Sample] Open Ward Clinic Noticeboard Week', 'Volunteers photograph and log public primary health facility project signboards to build an open maintenance map.', 'FCT Abuja', 'Public accountability', 93, 'Sample Community Health Monitors', 1, ?),
      ('[Sample] School Fee Schedule Transparency Check', 'Parents compare official state education board schedules against informal levies peacefully.', 'Kano', 'Education rights', 112, 'Sample Parent Forum', 1, ?)
  `).run(now, now, now);

  db.prepare(`
    INSERT INTO town_halls (title, summary, event_date, state, lga, format, rsvp_count, is_sample)
    VALUES
      ('[Sample] Citizen Forum: How to File a Lawful FOI Request Without a Lawyer', 'Practical walkthrough of the Freedom of Information Act 2011 with Q&A in English and Pidgin.', '2026-11-21 16:00 WAT', 'Lagos', 'Ikeja', 'Audio dial-in & low-bandwidth web', 76, 1),
      ('[Sample] Kano Parents & Paralegals Dialogue on Public School Access', 'Non-partisan community conversation on resolving informal school levy disputes constructively.', '2026-11-28 10:00 WAT', 'Kano', 'Nasarawa', 'In-person civic hall', 54, 1)
  `).run();

  db.prepare(`
    INSERT INTO volunteer_roles (title, commitment, skills, scope, description, is_sample)
    VALUES
      ('Multilingual Rights Guide Translator (Sample Role)', '3 hours / week', 'Hausa, Yoruba, Igbo, Pidgin, Fulfulde, or Kanuri fluency', 'Remote / Any State', 'Translate verified plain-language rights guides and audio scripts so low-literacy citizens can listen in their home language.', 1),
      ('Trained Community FOI Monitor (Sample Role)', '4 hours / month', 'Careful note-taking, calm non-partisan communication', 'LGA Level', 'Help local community groups format lawful Freedom of Information letters and log statutory response dates.', 1),
      ('Pro Bono Legal Intake Reviewer (Sample Role)', '5 hours / week', 'Verified Nigerian Bar call certificate', 'State Level', 'Review escalated citizen reports, assess fundamental rights urgency, and offer initial legal orientation.', 1)
  `).run();

  // Seed Community Hub Posts
  const insertPost = db.prepare(`
    INSERT INTO posts (
      user_id, content, scope, state, lga, language, content_type, attachments,
      solidarity_count, witnessed_count, amplify_count, reply_count, moderation_status,
      is_pinned, author_name, author_badge, related_case_reference, is_sample, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const p1 = insertPost.run(
    null,
    '[Sample] Reminder for commuters in Surulere and Mainland: When documenting a roadside stop, stay calm, never obstruct officers physically, and note the patrol vehicle number, time, and nearest landmark once it is safe to do so.',
    'lga',
    'Lagos',
    'Surulere',
    'English',
    'text',
    '[]',
    34,
    19,
    27,
    2,
    'approved',
    1,
    'Civic Safety Desk (Sample)',
    'Pinned civic note',
    'CWN-2026-LA-10482',
    '2026-11-11T08:30:00.000Z'
  );

  insertPost.run(
    null,
    '[Sample — Pidgin] Make una remember say station bail na free under Nigerian law. If person ask you for unreceipted cash before dem write statement, write the date, time, and officer name quietly.',
    'national',
    'FCT Abuja',
    'Municipal Area Council (AMAC)',
    'Nigerian Pidgin',
    'voice',
    JSON.stringify([{ kind: 'voice_transcript', durationSec: 28 }]),
    52,
    31,
    44,
    1,
    'approved',
    0,
    'Ngozi E. (Sample Contributor)',
    'Verified citizen',
    null,
    '2026-11-10T17:15:00.000Z'
  );

  insertPost.run(
    null,
    '[Sample] Our ward development committee in Kuje submitted a follow-up reminder letter today on the clinic solar borehole project. Keeping everything polite, documented, and stamped.',
    'state',
    'FCT Abuja',
    'Kuje',
    'English',
    'image',
    JSON.stringify([{ kind: 'caption_card', label: 'Stamped acknowledgement slip (sample preview)' }]),
    28,
    14,
    16,
    0,
    'approved',
    0,
    'Ibrahim M. (Sample Contributor)',
    'Community monitor',
    'CWN-2026-FC-20914',
    '2026-11-09T14:40:00.000Z'
  );

  insertPost.run(
    null,
    '[Sample Flagged Item for Admin Demo] Unverified rumour naming an individual without date, location, or evidence — held in moderation review queue.',
    'national',
    'Lagos',
    'Ikeja',
    'English',
    'text',
    '[]',
    1,
    0,
    0,
    0,
    'flagged',
    0,
    'Anonymous Poster (Sample)',
    'Unverified',
    null,
    '2026-11-12T06:10:00.000Z'
  );

  db.prepare(`
    INSERT INTO post_replies (post_id, author_name, content, created_at)
    VALUES
      (?, 'Tunde Adeyemi (Sample Citizen)', 'Helpful note. Saving the exact landmark name made our intake submission much clearer.', '2026-11-11T09:12:00.000Z'),
      (?, 'Barr. Chinedu Okafor (Sample Profile)', 'Confirmed: clear dates, station division names, and witness timelines help lawyers act much faster than general complaints.', '2026-11-11T10:05:00.000Z')
  `).run(p1.lastInsertRowid, p1.lastInsertRowid);

  // Seed Broadcast Alerts
  db.prepare(`
    INSERT INTO broadcast_alerts (title, message, severity, scope, target_state, target_lga, active, is_sample, created_at)
    VALUES
      ('[Sample Info] Local council election observer intake desk open', 'Sample broadcast: Non-partisan polling unit incident logging is active this Saturday. Record peaceful observations with timestamps and ward names.', 'info', 'national', null, null, 1, 1, '2026-11-12T07:00:00.000Z'),
      ('[Sample Warning] Roadway diversion and heightened stop-and-search reported in Surulere', 'Sample state notice: Commuters along Western Avenue report slow movement and document checks. Keep valid ID handy and prioritise personal safety.', 'warning', 'state', 'Lagos', 'Surulere', 1, 1, '2026-11-12T08:10:00.000Z')
  `).run();

  // Seed Notifications
  db.prepare(`
    INSERT INTO notifications (user_id, category, title, body, deep_link, is_read, created_at)
    VALUES
      (?, 'case', 'Lawyer assigned to sample case CWN-2026-LA-10482', 'Barr. Chinedu Okafor (Sample Profile) accepted your report and added an initial legal note.', '/cases/CWN-2026-LA-10482', 0, '2026-11-11T14:12:00.000Z'),
      (null, 'alert', '[Sample Warning] Heightened stop-and-search notice for Lagos', 'Read calm safety reminders for commuters along Western Avenue.', '/knowledge', 0, '2026-11-12T08:10:00.000Z'),
      (null, 'petition', 'Sample detention audit petition passed 600 signatures', 'See the latest oversight hearing update and statutory brief.', '/petitions/1', 1, '2026-11-10T18:00:00.000Z')
  `).run(citizenInfo.lastInsertRowid);

  // Seed Civic Activities for Sample Citizen
  db.prepare(`
    INSERT INTO civic_activities (user_id, category, title, detail, link, created_at)
    VALUES
      (?, 'report', 'Filed report CWN-2026-LA-10482', 'Documented 72-hour detention in Surulere with sealed geostamp.', '/cases/CWN-2026-LA-10482', '2026-11-09T07:42:18.000Z'),
      (?, 'petition', 'Signed sample detention audit petition', 'Added verified Lagos signature behind non-partisan consent.', '/petitions/1', '2026-11-10T11:20:00.000Z'),
      (?, 'community', 'Replied to Surulere commuter safety thread', 'Shared practical note on recording landmark details safely.', '/community', '2026-11-11T09:12:00.000Z')
  `).run(citizenInfo.lastInsertRowid, citizenInfo.lastInsertRowid, citizenInfo.lastInsertRowid);

  // Seed Knowledge Centre Guides
  const insertGuide = db.prepare(`
    INSERT INTO knowledge_guides (slug, title, category, reading_minutes, summary, body, key_points, related_slugs, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertGuide.run(
    'rights-during-police-stop-and-detention',
    'Your constitutional rights during a stop, arrest, or detention',
    'Police & detention',
    4,
    'Plain-language guide to Sections 34, 35, and 36 of the 1999 Constitution of Nigeria (as amended) and the Administration of Criminal Justice Act.',
    JSON.stringify([
      'First, protect your physical safety. Stay calm, keep your hands visible, and never argue physically with armed personnel. Accountability works best when you are safe to document what happened.',
      'Under Section 35 of the 1999 Constitution of Nigeria (as amended), every person has the right to personal liberty. If you are arrested or detained, officers must inform you in writing within 24 hours — in a language you understand — of the facts and grounds for the arrest.',
      'You have the right to remain silent and to consult a legal practitioner of your choice before making or signing any written statement. Under the Administration of Criminal Justice Act (ACJA), statements should be recorded in the presence of a lawyer, or recorded electronically, to prevent forced confessions.',
      'Constitutional time limits matter: where a court is within a 40-kilometre radius, a person detained for a non-capital offence must be brought before a court within 24 hours, or at most 48 hours in other cases, unless a court orders otherwise.',
      'Phone searches without lawful basis and forced bank transfers are unlawful. Once you are in a safe place, write down the date, time, patrol vehicle number, officer name tag, and nearby landmarks.'
    ]),
    JSON.stringify([
      'Prioritise calm physical safety at all times.',
      'You have the right to silence until a lawyer or trusted relative is contacted.',
      'Detention beyond 24–48 hours without court remand for non-capital offences violates Section 35.',
      'Never sign a blank sheet or a statement you were not allowed to read.'
    ]),
    JSON.stringify(['how-to-file-foi-request-nigeria', 'preserving-evidence-safely']),
    '2026-11-01'
  );

  insertGuide.run(
    'how-to-file-foi-request-nigeria',
    'How any citizen can request public records under the FOI Act 2011',
    'Public accountability',
    5,
    'Step-by-step instructions for asking ministries, agencies, or local councils for project documents without needing a lawyer.',
    JSON.stringify([
      'Nigeria’s Freedom of Information (FOI) Act 2011 gives every person the legal right to request records held by public institutions and private bodies spending public funds. You do not need to prove a special personal interest.',
      'Write a short, polite letter addressed to the head of the public institution or its FOI Desk. State the exact record you want — for example: "Copy of the Bill of Quantities and Completion Certificate for the 2025 Ward Clinic Borehole in Kuje."',
      'Print two copies of your letter. Deliver both to the institution’s registry and ask the clerk to stamp and date your second copy as proof of receipt. Keep a clear photo of that stamped copy.',
      'Under Section 4 of the FOI Act, the public institution has 7 days to grant access or explain in writing why a statutory exemption applies. If records must be gathered from another office, they may notify you of at most 7 extra days.',
      'If the agency ignores your request past the statutory deadline, it is treated as a wrongful denial, which an advocate can challenge in court within 30 days.'
    ]),
    JSON.stringify([
      'Anyone can apply; no lawyer is required to submit an FOI letter.',
      'Ask for specific documents, dates, and locations rather than broad opinions.',
      'Always keep a stamped and dated acknowledgement copy.',
      'Public institutions must respond within 7 days under Section 4.'
    ]),
    JSON.stringify(['rights-during-police-stop-and-detention', 'peaceful-assembly-and-petitions']),
    '2026-10-28'
  );

  insertGuide.run(
    'preserving-evidence-safely',
    'How to document an incident so advocates can verify it',
    'Reporting & safety',
    3,
    'Practical habits for recording dates, landmarks, receipts, and witness notes clearly without putting yourself at risk.',
    JSON.stringify([
      'Never risk physical harm to capture a photo or video. Personal safety comes before documentation.',
      'Write down the basics while memory is fresh: exact date, approximate time, state, Local Government Area, street or landmark, and what happened step by step in plain factual sentences.',
      'Keep original files untouched. Avoid adding text stickers, filters, or heavy cropping to photos before uploading, because original files preserve helpful capture details.',
      'When you upload evidence to Civic Watch Nigeria, our server seals each file with an upload timestamp and stores it privately. Public readers never see your raw private uploads unless an approved anonymised summary is published.',
      'Separate what you saw directly from what someone else told you. Honest, precise reports are taken far more seriously by lawyers and oversight bodies.'
    ]),
    JSON.stringify([
      'Never endanger yourself to film an active threat.',
      'Keep unedited original photos, receipts, and documents.',
      'Distinguish clearly between what you witnessed directly and second-hand reports.',
      'Uploaded evidence is sealed with a timestamp and stored privately.'
    ]),
    JSON.stringify(['rights-during-police-stop-and-detention', 'peaceful-assembly-and-petitions']),
    '2026-11-05'
  );

  insertGuide.run(
    'peaceful-assembly-and-petitions',
    'Peaceful civic petitions, town halls, and non-violent accountability',
    'Civic participation',
    4,
    'How citizens engage legislators, oversight desks, and local councils lawfully and constructively.',
    JSON.stringify([
      'Section 40 of the 1999 Constitution guarantees peaceful assembly and association, and citizens have the right to submit written petitions to the National Assembly, State Houses of Assembly, and public complaints commissions.',
      'Effective civic petitions focus on verifiable facts, specific communities affected, and clear remedies that an institution has legal power to deliver — such as repairing a clinic pump, auditing a fee schedule, or inspecting a detention log.',
      'Civic Watch Nigeria is strictly non-partisan and non-violent. We do not endorse political parties, candidates, or unlawful actions. Keeping language respectful and factual protects signers and builds broad public trust.',
      'Before signing any petition on this platform, read the short consent summary carefully so you understand where your name, state, and LGA will appear on the legislative submission.'
    ]),
    JSON.stringify([
      'Focus petitions on clear facts and lawful institutional remedies.',
      'Keep all civic mobilisation strictly peaceful and non-partisan.',
      'Address petitions to the specific committee or agency responsible.'
    ]),
    JSON.stringify(['how-to-file-foi-request-nigeria', 'preserving-evidence-safely']),
    '2026-11-02'
  );

  // Platform settings
  db.prepare(`
    INSERT INTO platform_settings (key, value) VALUES
      ('anonymous_reporting_enabled', 'true'),
      ('public_case_feed_moderation', 'strict_review'),
      ('ai_assistant_enabled', 'true'),
      ('low_bandwidth_default', 'adaptive')
  `).run();
}

/**
 * Integration data: cross-platform social listening, expanded trending topics,
 * and storage for push / messenger subscriptions. All seeded rows are sample
 * records and are flagged is_sample = 1 so the interface can label them.
 */
function ensureIntegrationData() {
  const socialCount = (db.prepare('SELECT COUNT(*) AS c FROM social_posts').get() as { c: number }).c;

  if (socialCount === 0) {
    const now = Date.now();
    const mins = (m: number) => new Date(now - m * 60_000).toISOString();

    const posts: Array<[string, string, string, number, string, string[], string | null, string | null, string, string, number, number, number, number, string, number, string | null, number, string]> = [
      // platform, author, handle, followers, body, tags, state, lga, url, media, replies, reposts, likes, views, language, verified, caseRef, isSample, postedAt
      ['x', 'Amaka Obi', '@amaka_obi', 18400, 'Sample observation: the ward town hall in Ikeja ended with a written commitment to publish the water point repair schedule. Residents asked for the document in Hausa and Yoruba as well.', ['#CivicWatch', '#Lagos', '#WaterPoint'], 'Lagos', 'Ikeja', 'https://x.com/amaka_obi/status/0', 'image', 42, 96, 310, 12800, 'English', 1, 'CWN-2026-LA-10482', 1, mins(24)],
      ['x', 'Kano Civic Desk', '@kanocivicdesk', 9200, 'Sample thread: three simple steps for a lawful Freedom of Information request to a local government secretariat, with the statutory response window and a template letter.', ['#FOI', '#Kano', '#KnowYourRights'], 'Kano', 'Nassarawa', 'https://x.com/kanocivicdesk/status/0', 'document', 18, 64, 208, 9100, 'English', 1, null, 1, mins(52)],
      ['x', 'Barrister Efe J.', '@efej_esq', 31500, 'Sample note for duty solicitors: when a suspect is held beyond the constitutional limit, document the arrest time, the station diary entry, and every request for bail in writing.', ['#LegalAid', '#Detention', '#HumanRights'], 'Rivers', 'Port Harcourt', 'https://x.com/efej_esq/status/0', 'none', 57, 143, 512, 24600, 'English', 1, 'CWN-2026-RI-10391', 1, mins(95)],
      ['facebook', 'Enugu Community Watch', 'EnuguCommunityWatch', 7600, 'Sample community notice: the Enugu North council has opened a complaints desk for street lighting faults. Bring the pole number and the nearest landmark.', ['#Community', '#Enugu'], 'Enugu', 'Enugu North', 'https://facebook.com/EnuguCommunityWatch/posts/0', 'image', 26, 41, 187, 6400, 'English', 1, null, 1, mins(140)],
      ['facebook', 'Parents Forum Kaduna', 'ParentsForumKaduna', 12400, 'Sample summary of the school levy dialogue: parents asked for an itemised fee sheet and a receipt for every payment this term.', ['#Education', '#Kaduna'], 'Kaduna', 'Kaduna North', 'https://facebook.com/ParentsForumKaduna/posts/0', 'video', 63, 88, 402, 15200, 'English', 0, null, 1, mins(190)],
      ['facebook', 'Oyo Tenants Voice', 'OyoTenantsVoice', 5400, 'Sample reminder: a landlord must serve a written notice before changing locks. Keep a copy of the notice and the rent receipt.', ['#Housing', '#Oyo'], 'Oyo', 'Ibadan North', 'https://facebook.com/OyoTenantsVoice/posts/0', 'none', 19, 34, 121, 4300, 'English', 0, null, 1, mins(260)],
      ['instagram', 'Civic Lens Nigeria', '@civiclens.ng', 26800, 'Sample photo carousel: what a properly sealed evidence envelope looks like before it is handed to a legal aid clinic.', ['#EvidenceSeal', '#CivicTech'], 'Lagos', 'Surulere', 'https://instagram.com/p/0', 'image', 31, 22, 640, 18900, 'English', 1, null, 1, mins(300)],
      ['instagram', 'Naija Rights Sketches', '@naijarights', 15200, 'Sample illustration: four situations where you can politely ask an officer for their name and badge number.', ['#KnowYourRights', '#Rights'], null, null, 'https://instagram.com/p/0', 'image', 44, 30, 512, 13400, 'English', 0, null, 1, mins(420)],
      ['instagram', 'Abuja Civic Diary', '@abujacivicdiary', 8900, 'Sample caption: a quiet morning at the FCT complaints unit queue. Bring a written summary and two copies.', ['#Abuja', '#FCT'], 'FCT Abuja', 'Municipal Area Council (AMAC)', 'https://instagram.com/p/0', 'image', 12, 9, 208, 7100, 'English', 0, null, 1, mins(500)],
      ['tiktok', 'Voice of the Ward', '@voiceoftheward', 54100, 'Sample 40-second explainer: how to record the date, time and landmark of an incident so a later legal review can rely on it.', ['#CivicWatch', '#Explainer'], 'Anambra', 'Onitsha North', 'https://tiktok.com/@voiceoftheward/video/0', 'video', 128, 240, 2100, 96000, 'English', 0, null, 1, mins(75)],
      ['tiktok', 'Kano Street Report', '@kanostreetreport', 33800, 'Sample clip: commuters describing a flooded underpass and the council drain clearing that followed two days later.', ['#Flooding', '#Kano'], 'Kano', 'Fagge', 'https://tiktok.com/@kanostreetreport/video/0', 'video', 96, 175, 1420, 61000, 'Hausa', 0, null, 1, mins(210)],
      ['tiktok', 'Lagos Commute Notes', '@lagoscommutenotes', 41200, 'Sample short: what to photograph at a checkpoint if you are asked for documents you do not legally need to carry.', ['#Lagos', '#Commute'], 'Lagos', 'Oshodi-Isolo', 'https://tiktok.com/@lagoscommutenotes/video/0', 'video', 83, 190, 1710, 72000, 'Pidgin', 0, null, 1, mins(360)],
      ['youtube', 'Civic Watch Nigeria', '@civicwatchnigeria', 21000, 'Sample long-form: a 12-minute walkthrough of the 11 accountability stages, with the plain-language explanation of each hand-off.', ['#CivicWatch', '#Walkthrough'], null, null, 'https://youtube.com/watch?v=0', 'video', 37, 54, 890, 32400, 'English', 1, null, 1, mins(600)],
      ['youtube', 'Legal Aid Diaries', '@legalaiddiaries', 17300, 'Sample episode: a paralegal explains how a written complaint to a hospital management board is escalated when care is refused.', ['#HealthRights', '#LegalAid'], 'FCT Abuja', 'Bwari', 'https://youtube.com/watch?v=0', 'video', 24, 40, 610, 19800, 'English', 1, null, 1, mins(900)],
      ['youtube', 'Delta Water Watch', '@deltawaterwatch', 6400, 'Sample field report: residents tracking a broken borehole pump across four weeks with dated photos.', ['#Water', '#Delta'], 'Delta', 'Warri South', 'https://youtube.com/watch?v=0', 'video', 11, 16, 240, 8700, 'English', 0, null, 1, mins(1300)],
      ['telegram', 'Civic Watch Lagos Channel', '@civicwatch_lagos', 12100, 'Sample channel post: three council meetings this week with public comment slots, plus the venue addresses.', ['#Lagos', '#TownHall'], 'Lagos', 'Ikeja', 'https://t.me/civicwatch_lagos/0', 'none', 6, 22, 118, 5200, 'English', 1, null, 1, mins(60)],
      ['telegram', 'FOI Help Desk', '@foihelpdesk', 9800, 'Sample pinned message: the current FOI request template, the response window, and where to send a follow-up when no reply arrives.', ['#FOI', '#Template'], null, null, 'https://t.me/foihelpdesk/0', 'document', 14, 38, 240, 7600, 'English', 1, null, 1, mins(240)],
      ['telegram', 'Kaduna Safety Notes', '@kaduna_safety_notes', 4300, 'Sample update: a calm summary of the road diversion near the central market and the alternative pedestrian route.', ['#Kaduna', '#Safety'], 'Kaduna', 'Kaduna South', 'https://t.me/kaduna_safety_notes/0', 'none', 4, 12, 66, 2400, 'English', 0, null, 1, mins(480)],
      ['whatsapp', 'Ikeja Ward Alert', 'WhatsApp channel', 28000, 'Sample broadcast: the water point repair schedule was published today; the document is available at the ward office and on the community hub.', ['#Lagos', '#WaterPoint'], 'Lagos', 'Ikeja', 'https://whatsapp.com/channel/0', 'document', 3, 14, 88, 4100, 'English', 1, 'CWN-2026-LA-10482', 1, mins(150)],
      ['whatsapp', 'Enugu Market Voices', 'WhatsApp channel', 14200, 'Sample voice note transcript: traders describing a new levying practice and asking how to request the council schedule in writing.', ['#Enugu', '#Levies'], 'Enugu', 'Nsukka', 'https://whatsapp.com/channel/0', 'audio', 9, 20, 132, 5600, 'Igbo', 0, null, 1, mins(330)],
      ['whatsapp', 'Rivers Tenants Group', 'WhatsApp group', 3700, 'Sample group summary: agreed wording for a joint letter about refuse collection, shared for members to review before sending.', ['#Rivers', '#Housing'], 'Rivers', 'Obio/Akpor', 'https://chat.whatsapp.com/0', 'none', 7, 5, 44, 1800, 'English', 0, null, 1, mins(700)],
      ['threads', 'Civic Watch Nigeria', '@civicwatch.ng', 15600, 'Sample thread: five questions residents can ask at a budget town hall, each tied to a specific line item a council must publish.', ['#Budget', '#CivicWatch'], null, null, 'https://threads.net/@civicwatch.ng/post/0', 'none', 28, 47, 301, 11200, 'English', 1, null, 1, mins(110)],
      ['threads', 'Youth Civic Forum', '@youthcivicforum', 11200, 'Sample conversation: what a peaceful assembly notice should contain, and who it is normally submitted to.', ['#Assembly', '#Youth'], 'FCT Abuja', 'Gwagwalada', 'https://threads.net/@youthcivicforum/post/0', 'none', 33, 51, 276, 9800, 'English', 0, null, 1, mins(410)],
      ['threads', 'Abia Accountability', '@abia_accountability', 5100, 'Sample note: a short checklist for photographing a stalled road project so the evidence stays useful months later.', ['#Abia', '#Infrastructure'], 'Abia', 'Umuahia North', 'https://threads.net/@abia_accountability/post/0', 'image', 8, 11, 97, 3400, 'English', 0, null, 1, mins(820)],
    ];

    const insertPost = db.prepare(`
      INSERT INTO social_posts
        (platform, author_name, author_handle, author_followers, body, topic_tags, state, lga, source_url,
         media_kind, reply_count, repost_count, like_count, view_count, language, is_verified_source,
         related_case_ref, is_sample, posted_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    for (const row of posts) {
      insertPost.run(
        row[0], row[1], row[2], row[3], row[4], JSON.stringify(row[5]), row[6], row[7], row[8],
        row[9], row[10], row[11], row[12], row[13], row[14], row[15], row[16], row[17], row[18]
      );
    }
  }

  const trendCount = (db.prepare('SELECT COUNT(*) AS c FROM trending_topics').get() as { c: number }).c;
  if (trendCount === 0) {
    const updated = new Date().toISOString();
    const trends: Array<[string, string, string, string, string, number, number, number, number, string, string[], Record<string, number>, number[], string[], string | null, number | null]> = [
      ['detention-limits', 'Detention limit reminders', '#KnowYourDetentionLimit', 'Justice', 'Short explainers on the constitutional limit for holding a suspect, bail steps, and what to write down at the station.', 4120, 18600, 52400, 38, 'rising', ['Lagos', 'Rivers', 'Kano', 'Enugu', 'FCT Abuja'], { x: 1860, tiktok: 980, whatsapp: 620, facebook: 320, instagram: 210, telegram: 80, threads: 40, youtube: 10 }, [42, 55, 61, 58, 72, 88, 96, 104, 118, 126, 134, 148], ['@efej_esq', '@amaka_obi', '@voiceoftheward'], 'CWN-2026-RI-10391', 1],
      ['school-levies', 'School levy transparency', '#ItemisedFees', 'Education', 'Parents and paralegals asking for itemised fee sheets, receipts, and published levy schedules.', 3310, 14200, 41800, 27, 'rising', ['Kaduna', 'Kano', 'Enugu', 'Oyo'], { facebook: 1420, x: 760, whatsapp: 720, tiktok: 210, instagram: 110, telegram: 60, threads: 20, youtube: 10 }, [22, 31, 38, 44, 51, 62, 68, 74, 88, 96, 102, 118], ['@ParentsForumKaduna', '@youthcivicforum', '@kanocivicdesk'], null, null],
      ['foi-templates', 'FOI request templates', '#FOIRequest', 'Accountability', 'Demand for plain-language Freedom of Information templates and clarity on response windows.', 2870, 12100, 38400, 19, 'steady', ['Kano', 'Lagos', 'FCT Abuja', 'Abia'], { x: 1180, telegram: 640, whatsapp: 420, facebook: 310, threads: 160, instagram: 90, tiktok: 50, youtube: 20 }, [44, 47, 46, 52, 49, 55, 58, 54, 61, 63, 60, 66], ['@kanocivicdesk', '@foihelpdesk', '@civicwatch.ng'], 'CWN-2026-KN-10477', null],
      ['water-point-repair', 'Water point repair tracking', '#WaterPointRepair', 'Public services', 'Residents tracking broken boreholes and standpipes with dated photos and council commitments.', 2410, 9800, 27600, 31, 'rising', ['Lagos', 'Delta', 'Enugu', 'Kano'], { whatsapp: 980, x: 620, facebook: 420, instagram: 210, tiktok: 110, telegram: 50, threads: 10, youtube: 10 }, [18, 24, 27, 33, 39, 46, 52, 58, 64, 72, 78, 86], ['@amaka_obi', '@deltawaterwatch', '@EnuguCommunityWatch'], 'CWN-2026-LA-10482', 2],
      ['tenancy-notices', 'Tenancy notice rights', '#WrittenNotice', 'Housing', 'Questions about lawful notice periods, lock changes, and receipts for rent paid.', 2180, 8600, 30100, -6, 'cooling', ['Oyo', 'Lagos', 'Rivers', 'FCT Abuja'], { tiktok: 720, instagram: 540, facebook: 420, x: 260, whatsapp: 160, telegram: 50, threads: 20, youtube: 10 }, [96, 92, 88, 84, 80, 76, 71, 68, 64, 60, 57, 54], ['@lagoscommutenotes', '@OyoTenantsVoice', '@RiversTenantsGroup'], null, null],
      ['hospital-care-refusal', 'Care refusal escalation', '#RightToCare', 'Health', 'Practical routes for escalating a refused emergency treatment, including written complaints to management boards.', 1640, 7100, 19400, 22, 'rising', ['FCT Abuja', 'Anambra', 'Kaduna', 'Lagos'], { youtube: 610, x: 380, facebook: 320, instagram: 180, tiktok: 90, whatsapp: 40, telegram: 10, threads: 10 }, [12, 15, 18, 22, 26, 31, 35, 40, 44, 49, 53, 58], ['@legalaiddiaries', '@naijarights'], 'CWN-2026-FC-10455', null],
      ['budget-town-halls', 'Budget town hall questions', '#AskTheBudget', 'Participation', 'Residents preparing specific, line-item questions ahead of council budget sessions.', 1490, 6400, 17200, 14, 'steady', ['Lagos', 'Oyo', 'Enugu', 'FCT Abuja'], { threads: 480, x: 340, facebook: 260, whatsapp: 210, instagram: 110, tiktok: 50, telegram: 30, youtube: 10 }, [28, 30, 31, 33, 34, 37, 39, 41, 44, 46, 47, 50], ['@civicwatch.ng', '@youthcivicforum', '@abia_accountability'], null, null],
      ['road-project-audit', 'Stalled road project audit', '#ProjectAudit', 'Infrastructure', 'Photo sequences of stalled road work, with dates, landmarks and contract signposts.', 1320, 5900, 22100, 9, 'steady', ['Abia', 'Rivers', 'Kogi', 'Oyo'], { tiktok: 410, instagram: 320, x: 280, facebook: 210, whatsapp: 60, threads: 30, telegram: 8, youtube: 2 }, [58, 60, 63, 61, 66, 69, 68, 72, 74, 77, 79, 82], ['@abia_accountability', '@amaka_obi', '@civicwatch_lagos'], null, null],
      ['peaceful-assembly', 'Peaceful assembly notices', '#AssemblyNotice', 'Rights', 'What a lawful assembly notice contains, where it goes, and how to keep the event peaceful.', 1180, 5200, 15800, -11, 'cooling', ['FCT Abuja', 'Lagos', 'Kaduna', 'Anambra'], { x: 420, threads: 310, facebook: 210, instagram: 120, tiktok: 90, whatsapp: 20, telegram: 8, youtube: 2 }, [78, 74, 71, 66, 63, 58, 55, 51, 48, 44, 41, 38], ['@youthcivicforum', '@naijarights', '@efej_esq'], 'CWN-2026-FC-10455', null],
      ['commuter-checkpoints', 'Commuter checkpoint notes', '#CommuteNotes', 'Safety', 'Documented commute observations and calm reminders about which documents are legally required.', 980, 4300, 12600, 41, 'rising', ['Lagos', 'Rivers', 'Kano', 'Ogun'], { tiktok: 520, x: 210, instagram: 140, facebook: 110, whatsapp: 30, telegram: 10, threads: 8, youtube: 2 }, [16, 19, 24, 29, 36, 44, 52, 61, 70, 78, 86, 94], ['@lagoscommutenotes', '@kanostreetreport', '@efej_esq'], null, null],
    ];

    const insertTrend = db.prepare(`
      INSERT INTO trending_topics
        (slug, title, hashtag, category, summary, mentions_24h, mentions_7d, mentions_30d, change_pct,
         momentum, states, platform_mix, series, top_voices, related_case_ref, related_petition_id,
         is_sample, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)
    `);
    for (const t of trends) {
      insertTrend.run(
        t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], t[9],
        JSON.stringify(t[10]), JSON.stringify(t[11]), JSON.stringify(t[12]), JSON.stringify(t[13]),
        t[14], t[15], updated
      );
    }
  }
}
