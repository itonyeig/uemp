export const academicStructure = [
  {
    name: 'Faculty of Science',
    departments: [
      {
        key: 'computing',
        name: 'Computer Science',
        programs: [
          { key: 'computer-science', name: 'B.Sc. Computer Science' },
          { key: 'software-engineering', name: 'B.Sc. Software Engineering' },
        ],
      },
      {
        key: 'mathematical-sciences',
        name: 'Mathematical Sciences',
        programs: [
          { key: 'mathematics', name: 'B.Sc. Mathematics' },
          { key: 'statistics', name: 'B.Sc. Statistics' },
        ],
      },
    ],
  },
  {
    name: 'Faculty of Engineering',
    departments: [
      {
        key: 'electrical',
        name: 'Electrical and Electronics Engineering',
        programs: [
          {
            key: 'electrical-engineering',
            name: 'B.Eng. Electrical Engineering',
          },
        ],
      },
      {
        key: 'civil',
        name: 'Civil Engineering',
        programs: [
          { key: 'civil-engineering', name: 'B.Eng. Civil Engineering' },
        ],
      },
    ],
  },
  {
    name: 'Faculty of Management Sciences',
    departments: [
      {
        key: 'business',
        name: 'Business Administration',
        programs: [
          {
            key: 'business-administration',
            name: 'B.Sc. Business Administration',
          },
        ],
      },
      {
        key: 'accounting',
        name: 'Accounting',
        programs: [{ key: 'accounting', name: 'B.Sc. Accounting' }],
      },
    ],
  },
] as const;

type SeedDepartment = (typeof academicStructure)[number]['departments'][number];
export type SeedDepartmentKey = SeedDepartment['key'];
export type SeedProgramKey = SeedDepartment['programs'][number]['key'];

const computingPrograms = ['computer-science', 'software-engineering'] as const;
const mathPrograms = ['mathematics', 'statistics'] as const;
const engineeringPrograms = [
  'electrical-engineering',
  'civil-engineering',
] as const;
const managementPrograms = ['business-administration', 'accounting'] as const;

export const semesters = [
  { key: 'earlier', session: '2025/2026', number: 1, isCurrent: false },
  { key: 'previous', session: '2025/2026', number: 2, isCurrent: false },
  { key: 'current', session: '2026/2027', number: 1, isCurrent: true },
] as const;

export type SeedSemesterKey = (typeof semesters)[number]['key'];

type CourseGroup = {
  department: SeedDepartmentKey;
  programs: readonly SeedProgramKey[];
  academicLevel: number;
  semester?: SeedSemesterKey;
  courses: [code: string, title: string, creditUnits: number][];
};

export const courseGroups: CourseGroup[] = [
  {
    department: 'computing',
    programs: [
      ...computingPrograms,
      ...mathPrograms,
      ...engineeringPrograms,
      ...managementPrograms,
    ],
    academicLevel: 100,
    courses: [['CSC100', 'Digital Literacy', 2]],
  },
  {
    department: 'mathematical-sciences',
    programs: [...computingPrograms, ...mathPrograms, ...engineeringPrograms],
    academicLevel: 100,
    courses: [
      ['MTH101', 'Elementary Mathematics I', 3],
      ['MTH105', 'Applied Mathematics I', 2],
      ['MTH107', 'Mathematical Problem Solving', 2],
    ],
  },
  {
    department: 'computing',
    programs: computingPrograms,
    academicLevel: 100,
    courses: [
      ['CSC101', 'Introduction to Computer Science', 3],
      ['CSC103', 'Programming Fundamentals', 3],
      ['CSC105', 'Introduction to Computer Systems', 2],
      ['CSC107', 'Computational Thinking', 2],
      ['CSC109', 'Introduction to Web Development', 2],
      ['CSC111', 'Logic and Set Theory', 2],
      ['CSC113', 'Computer Laboratory I', 1],
      ['CSC115', 'Ethics in Computing', 2],
    ],
  },
  {
    department: 'computing',
    programs: computingPrograms,
    academicLevel: 200,
    courses: [
      ['CSC201', 'Data Structures', 3],
      ['CSC203', 'Object-Oriented Programming', 3],
      ['CSC205', 'Database Systems', 3],
      ['CSC207', 'Computer Architecture', 3],
      ['CSC209', 'Discrete Structures', 2],
      ['CSC211', 'Operating Systems I', 3],
      ['CSC213', 'Computer Networks I', 3],
      ['CSC215', 'Software Engineering I', 3],
      ['CSC217', 'Web Application Development', 2],
      ['CSC219', 'Human-Computer Interaction', 2],
      ['CSC221', 'Programming Laboratory II', 1],
      ['CSC223', 'Principles of Cybersecurity', 2],
    ],
  },
  {
    department: 'mathematical-sciences',
    programs: mathPrograms,
    academicLevel: 100,
    courses: [
      ['MTH103', 'Linear Algebra I', 3],
      ['STA101', 'Introduction to Statistics', 3],
      ['STA103', 'Descriptive Statistics', 2],
    ],
  },
  {
    department: 'electrical',
    programs: engineeringPrograms,
    academicLevel: 100,
    courses: [
      ['ENG101', 'Introduction to Engineering', 3],
      ['ENG103', 'Engineering Drawing', 2],
      ['ENG105', 'Engineering Workshop Practice', 2],
    ],
  },
  {
    department: 'electrical',
    programs: ['electrical-engineering'],
    academicLevel: 100,
    courses: [
      ['EEE101', 'Introduction to Electrical Circuits', 3],
      ['EEE103', 'Electronics Workshop', 1],
      ['EEE105', 'Electrical Measurements', 2],
      ['EEE107', 'Engineering Materials', 2],
      ['EEE109', 'Circuit Simulation Laboratory', 1],
    ],
  },
  {
    department: 'civil',
    programs: ['civil-engineering'],
    academicLevel: 100,
    courses: [['CVE101', 'Introduction to the Built Environment', 3]],
  },
  {
    department: 'business',
    programs: managementPrograms,
    academicLevel: 100,
    courses: [
      ['MGT101', 'Principles of Management', 3],
      ['ECO101', 'Principles of Economics', 3],
      ['BUS103', 'Business Communication', 2],
    ],
  },
  {
    department: 'accounting',
    programs: managementPrograms,
    academicLevel: 100,
    courses: [['ACC101', 'Financial Accounting I', 3]],
  },
  {
    department: 'business',
    programs: ['business-administration'],
    academicLevel: 100,
    courses: [['BUS105', 'Introduction to Business', 3]],
  },
  {
    department: 'accounting',
    programs: ['accounting'],
    academicLevel: 100,
    courses: [['ACC103', 'Bookkeeping Fundamentals', 2]],
  },
  {
    department: 'computing',
    programs: computingPrograms,
    academicLevel: 100,
    semester: 'earlier',
    courses: [
      ['CSC101', 'Introduction to Computer Science', 3],
      ['CSC103', 'Programming Fundamentals', 3],
      ['CSC105', 'Introduction to Computer Systems', 2],
    ],
  },
  {
    department: 'computing',
    programs: computingPrograms,
    academicLevel: 100,
    semester: 'previous',
    courses: [
      ['CSC102', 'Programming Practice', 3],
      ['CSC104', 'Web Technologies I', 2],
      ['CSC106', 'Logic and Problem Solving', 3],
      ['CSC108', 'Information Systems Fundamentals', 3],
    ],
  },
];
