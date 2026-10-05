// The public pages the checks rest on, and what each says, written in this project's own words. research/sources.md
// lists every page with a longer note on each, and test/data.test.js checks that every page here is listed there and
// that every rule names points that exist. The code in src/ uses these constants and never writes a reason of its own
// in a report. The quality model itself is in src/model.js.

const PORTAL = 'https://iso25000.com/index.php/en/iso-25000-standards';

export const SOURCES = [
  { id: 'iso25010', title: 'ISO/IEC 25010, the product quality model, page 1 (iso25000.com)', url: `${PORTAL}/iso-25010` },
  { id: 'iso25010next', title: 'ISO/IEC 25010, the product quality model, page 2 (iso25000.com)', url: `${PORTAL}/iso-25010?start=5` },
  { id: 'square', title: 'The ISO/IEC 25000 series of standards, page 1 (iso25000.com)', url: PORTAL },
  { id: 'squareNext', title: 'The ISO/IEC 25000 series of standards, page 2 (iso25000.com)', url: `${PORTAL}?start=5` },
  { id: 'isoCurrent', title: 'ISO/IEC 25010, Product quality model, second edition (ISO)', url: 'https://www.iso.org/standard/78176.html' },
  { id: 'isoFirst', title: 'ISO/IEC 25010, System and software quality models, first edition, withdrawn (ISO)', url: 'https://www.iso.org/standard/35733.html' },
  { id: 'arc42', title: 'ISO/IEC 25010, Systems and Software Quality (arc42 Quality Model)', url: 'https://quality.arc42.org/standards/iso-25010' },
  { id: 'iso9126', title: 'ISO/IEC 9126 (Wikipedia)', url: 'https://en.wikipedia.org/wiki/ISO/IEC_9126' },
  { id: 'rfc4180', title: 'RFC 4180, Common Format and MIME Type for Comma-Separated Values (CSV) Files', url: 'https://www.rfc-editor.org/rfc/rfc4180' },
  { id: 'rfc8259', title: 'RFC 8259, The JSON Data Interchange Format', url: 'https://www.rfc-editor.org/rfc/rfc8259' },
  { id: 'owaspCsv', title: 'CSV Injection (OWASP)', url: 'https://community.owasp.org/attacks/CSV_Injection' },
  { id: 'githubCommands', title: 'Workflow commands for GitHub Actions (GitHub Docs)', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands' }
];

export const source = (id) => SOURCES.find((s) => s.id === id);

// What a page says, in this project's own words. Each point names its page.
export const POINTS = {
  qualityModel: { source: 'iso25010', text: 'the quality model decides which quality characteristics are taken into account when the properties of a software product are evaluated, and it sorts product quality into characteristics and sub-characteristics' },
  stakeholderNeeds: { source: 'iso25010', text: 'the quality of a system is how far it meets the stated and implied needs of its stakeholders, such as functionality, performance, security and maintainability, and those needs are what the model represents' },
  nineCharacteristics: { source: 'iso25010', text: 'the product quality model has nine characteristics: functional suitability, performance efficiency, compatibility, interaction capability, reliability, security, maintainability, flexibility and safety' },
  firstSubCharacteristics: { source: 'iso25010', text: 'each characteristic is made of sub-characteristics, such as time behaviour, resource utilization and capacity for performance efficiency, or learnability, operability and inclusivity for interaction capability' },
  nextSubCharacteristics: { source: 'iso25010next', text: 'reliability, security, maintainability, flexibility and safety have sub-characteristics of their own, such as faultlessness and availability, confidentiality and resistance, testability, scalability, and fail safe' },
  measurementDivision: { source: 'square', text: 'the ISO/IEC 2502n division of the series gives a reference model for measurement, defined quality measures and guidance on applying them, with ISO/IEC 25023 for measures of system and software product quality' },
  evaluationDivision: { source: 'squareNext', text: 'the ISO/IEC 2504n division gives the requirements and guidance for evaluating a product, with ISO/IEC 25040 as the reference model for specifying and evaluating software quality' },
  currentEdition: { source: 'isoCurrent', text: 'the current edition defines a product quality model of nine characteristics, divided into sub-characteristics, as a reference for specifying, measuring and evaluating the quality of a product' },
  acceptanceCriteria: { source: 'isoCurrent', text: 'the uses of the model include identifying acceptance criteria for a product and establishing measures of its quality characteristics' },
  firstEdition: { source: 'isoFirst', text: 'the first edition, now withdrawn, had a product quality model of eight characteristics' },
  formerNames: { source: 'arc42', text: 'interaction capability was formerly called usability, and flexibility was formerly called portability' },
  olderModel: { source: 'iso9126', text: 'ISO/IEC 9126, the model before ISO/IEC 25010, named functionality and efficiency where ISO/IEC 25010 names functional suitability and performance efficiency, and had maturity under reliability' },
  csvRecords: { source: 'rfc4180', text: 'each record of a CSV file is on its own line, ended by CRLF, the first line may be a header, and a field that holds a comma, a double quote or a line break is put in double quotes, with a double quote inside it written twice' },
  csvSameFields: { source: 'rfc4180', text: 'every line of a CSV file should hold the same number of fields' },
  csvInjection: { source: 'owaspCsv', text: 'a spreadsheet may read a cell that starts with =, +, -, @, a tab or a line break as a formula, and no one escape is safe in every program that opens the file' },
  jsonUtf8: { source: 'rfc8259', text: 'JSON text exchanged between systems must be UTF-8, and a reader may ignore a byte order mark at the start' },
  jsonRepeatedNames: { source: 'rfc8259', text: 'when an object repeats a name the behavior of the software that reads it cannot be predicted, so the reader of this tool refuses a repeated name' },
  githubAnnotations: { source: 'githubCommands', text: 'a line of output such as ::warning file=...,line=...::message becomes an annotation on that file and line in the run' }
};

// The page of a point.
export const pointPage = (key) => source(POINTS[key].source);

// The levels of a finding, from the lowest.
export const LEVELS = ['info', 'warning', 'error'];

// The sentence every report ends with, before the result.
export const NOTICE = 'This check compares the targets with the measurements as they are written. It runs no measurement, does not judge whether a target or a method suits the application, and does not certify conformance to ISO/IEC 25010 or any other standard (docs/limits.md).';
