
export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'standard',
    name: 'Standard Reconstruction',
    description: 'High-fidelity copy of the original document layout.',
    icon: 'FileText',
    prompt: 'Maintain 100% fidelity to the original document structure.'
  },
  {
    id: 'resume',
    name: 'Professional Resume',
    description: 'Optimized for resumes with clean headings and sections.',
    icon: 'User',
    prompt: 'Format as a professional resume. Group information into sections like Experience, Education, and Skills. Use clear headers and concise bullet points.'
  },
  {
    id: 'report',
    name: 'Business Report',
    description: 'Formal report style with executive summary and numbered sections.',
    icon: 'Briefcase',
    prompt: 'Format as a formal business report. Use professional language, numbered sections, and include an executive summary if appropriate. Ensure charts and tables are clearly presented.'
  },
  {
    id: 'modern',
    name: 'Modern Newsletter',
    description: 'Bold headings and elegant spacing for readability.',
    icon: 'Newspaper',
    prompt: 'Format as a modern newsletter. Use bold, engaging headings and plenty of white space. Keep paragraphs short and use lists to break up information.'
  },
  {
    id: 'academic',
    name: 'Academic Paper',
    description: 'Formatted for research papers and essays.',
    icon: 'GraduationCap',
    prompt: 'Format as an academic paper or essay. Use standard academic citation formatting for references, include an abstract if available, and organize with clear methodology and conclusion sections.'
  },
  {
    id: 'legal',
    name: 'Legal Contract',
    description: 'Strict, dense formatting for agreements and contracts.',
    icon: 'Scale',
    prompt: 'Format as a legal contract. Use numbered clauses, formal legal typography, highlight defined terms, and ensure signatures are clearly delineated at the end.'
  },
  {
    id: 'invoice',
    name: 'Invoice / Receipt',
    description: 'Clean data tables and totals for financial documents.',
    icon: 'Receipt',
    prompt: 'Format as an invoice or financial statement. Emphasize tables, line items, unit prices, and clear grand totals. Align numerical data strictly.'
  },
  {
    id: 'code-docs',
    name: 'Technical Docs',
    description: 'Optimized for API references and code documentation.',
    icon: 'FileCode2',
    prompt: 'Format as technical documentation. Highlight code snippets properly, use monospaced fonts for technical terms, and organize endpoint or function descriptions linearly.'
  },
  {
    id: 'marketing',
    name: 'Marketing Strategy',
    description: 'Actionable marketing plans with clear goals and metrics.',
    icon: 'Target',
    prompt: 'Format as a modern marketing strategy document. Include clear sections for Target Audience, Value Proposition, Channels, KPIs, and Timeline. Use engaging, persuasive language and clean layout.'
  },
  {
    id: 'qa-checklist',
    name: 'System QA Checklist',
    description: 'A comprehensive evaluation and deployment checklist.',
    icon: 'FileText',
    prompt: 'Format as a comprehensive System Evaluation and Deployment Checklist. Include sections for Frontend Testing (verify UI elements, responsiveness, accessibility), Backend Functionality (API endpoints, error handling, data processing), Database Integrity (secure connections, accuracy, corruption prevention), User Experience (usability, interactions, bottlenecks), Deployment Readiness (deployment scripts, documentation, security audit), and Pre-Deployment Considerations (critical thinking, scalability, post-deployment monitoring). Use clear headers, checkboxes for lists, and distinct formatting.'
  }
];
