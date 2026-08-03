import { CanvasAssignment } from './types';

// Helper to construct realistic upcoming due dates relative to current time
const getFutureDate = (hoursAhead: number): string => {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  return d.toISOString();
};

export const MOCK_ASSIGNMENTS: CanvasAssignment[] = [
  {
    id: 'mock-1',
    title: 'Research Paper Rough Draft',
    course: 'ENGL 201: Rhetoric & Composition',
    dueDate: getFutureDate(3), // URGENT: Due in 3 hours (Triggers < 12h warning on swipe left)
    description:
      'Submit a 1,500-word draft investigating the impacts of modern generative AI on academic integrity. Ensure APA formatting, at least 4 peer-reviewed citations, and clear thesis statement.',
    canvasUrl: 'https://canvas.university.edu/courses/1042/assignments/8821',
  },
  {
    id: 'mock-2',
    title: 'Problem Set 5 — Eigenvalues & Diagonalization',
    course: 'MATH 302: Linear Algebra',
    dueDate: getFutureDate(7), // URGENT: Due in 7 hours (Triggers < 12h warning on swipe left)
    description:
      'Complete problems 4.1 through 4.12 from Chapter 4. Show all work for finding characteristic polynomials, eigenvectors, and diagonal matrices P and D.',
    canvasUrl: 'https://canvas.university.edu/courses/1088/assignments/9402',
  },
  {
    id: 'mock-3',
    title: 'Lab 4 — Quantum Optics Python Simulation',
    course: 'PHYS 201: Modern Physics',
    dueDate: getFutureDate(10), // URGENT: Due in 10 hours (Triggers < 12h warning on swipe left)
    description:
      'Sparse description provided in calendar feed. Click below to view detailed rubric and submit Python script.',
    canvasUrl: 'https://canvas.university.edu/courses/1150/assignments/9810',
  },
  {
    id: 'mock-4',
    title: 'Distributed Hash Table Implementation',
    course: 'CS 350: Operating Systems & Networking',
    dueDate: getFutureDate(18), // Due in 18 hours
    description:
      'Build a Chord-based distributed key-value store in Rust or Go. Implement node joining, finger table routing, and data replication across virtual nodes.',
    canvasUrl: 'https://canvas.university.edu/courses/1201/assignments/10492',
  },
  {
    id: 'mock-5',
    title: 'Midterm Essay Prep & Annotated Bibliography',
    course: 'HIST 110: Modern World History',
    dueDate: getFutureDate(28), // Due in 28 hours
    description:
      'Annotated bibliography with 5 primary source documents analyzing post-WWII economic restructuring in East Asia.',
    canvasUrl: 'https://canvas.university.edu/courses/992/assignments/7641',
  },
  {
    id: 'mock-6',
    title: 'Case Study: Supply Chain Bottlenecks',
    course: 'BUS 410: Strategic Management',
    dueDate: getFutureDate(48), // Due in 2 days
    description:
      'Analyze the 2024 global semiconductor supply chain bottlenecks. Provide 3 strategic recommendations for risk mitigation.',
    canvasUrl: 'https://canvas.university.edu/courses/1340/assignments/11020',
  },
  {
    id: 'mock-7',
    title: 'Database Schema Design & Normalization',
    course: 'CS 220: Database Systems',
    dueDate: getFutureDate(72), // Due in 3 days
    description:
      'Design a 3NF relational schema for an e-commerce platform. Include ER diagrams and SQL DDL scripts for table creation.',
    canvasUrl: 'https://canvas.university.edu/courses/1102/assignments/9012',
  },
  {
    id: 'mock-8',
    title: 'Biochemistry Quiz 3 — Enzyme Kinetics',
    course: 'CHEM 310: Biochemistry',
    dueDate: getFutureDate(96), // Due in 4 days
    description:
      'Online 30-minute quiz covering Michaelis-Menten kinetics, Lineweaver-Burk plots, and competitive inhibition.',
    canvasUrl: 'https://canvas.university.edu/courses/1050/assignments/8410',
  },
  {
    id: 'mock-9',
    title: 'Microeconomics Problem Set 3',
    course: 'ECON 101: Principles of Microeconomics',
    dueDate: getFutureDate(120), // Due in 5 days
    description:
      'Complete monopoly and oligopoly market equilibrium calculations in Chapter 7.',
    canvasUrl: 'https://canvas.university.edu/courses/980/assignments/7210',
  },
  {
    id: 'mock-10',
    title: 'Spanish Oral Presentation Recording',
    course: 'SPAN 202: Intermediate Spanish II',
    dueDate: getFutureDate(144), // Due in 6 days
    description:
      'Submit a 3-minute video recording discussing your favorite cultural tradition in Spanish.',
    canvasUrl: 'https://canvas.university.edu/courses/1015/assignments/8100',
  },
];
