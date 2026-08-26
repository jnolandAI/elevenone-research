/* A title that wraps to two lines before the body starts. Taking lines[0] alone
   truncates it and understates every title-length measure. Invented text: the
   corpus is third-party and this repository is public. */
export const WRAPPED_TITLE = [
  'Regional demand held steady through the downturn while replacement',
  'cycles lengthened across segments',
  '',
  'Share of firms reporting longer cycles, by segment',
  'Machinery 61% Components 54% Assemblies 47%',
].join('\n');

/* A table rendered by pdftotext -layout. Columns are separated by wide runs of
   spaces, which a naive gap test reads as two prose columns. */
export const TABLE_PAGE = [
  'Sector economics, 2022',
  '',
  'Sector            2021        2022        CAGR',
  'E-commerce         129         131         1.6%',
  'Food delivery       15          16         6.7%',
  'Transport            8          11        37.5%',
].join('\n');

/* Genuine two-column running prose: both sides are sentences. Invented text. */
export const TWO_COLUMN_PROSE = [
  'A shared baseline for the operating review',
  '',
  'The framework gives each unit the same starting        point, and the differences that remain are the',
  'point from which every later comparison runs,          ones worth arguing about in the review meeting.',
  'and it removes the argument about whose numbers        Everything after that is a question of judgement',
  'are correct before the discussion even opens.          rather than a question of arithmetic accuracy.',
].join('\n');

/* A table whose row labels clear both the length floor and the letter floor,
   so only the digit-density gate can reject them. Without this fixture every
   table chunk is rejected on length alone and the digit gate, which the
   implementation's own comment calls the whole reason the naive gap test
   overcounted, is never exercised by any test. */
export const WIDE_LABEL_TABLE = [
  'Addressable market by segment',
  '',
  'Total addressable market opportunity 2019 2020 2021        Serviceable market inside the footprint 2019 2020',
  'Installed base across all regions 2019 2020 2021 2022      Replacement demand by customer cohort 2020 2021 2022',
].join('\n');

/* A two-column text matrix. Both sides are long, letter-rich and digit-free,
   so the heuristic counts them as prose. That is a genuine limitation rather
   than a bug: at the granularity of one line, a text matrix and running prose
   are not distinguishable. The test below asserts the current behaviour so the
   limit is visible, and the census README records the multi-column figure as
   provisional because of it. */
export const TWO_COLUMN_TEXT_MATRIX = [
  'How the two groups differ',
  '',
  'Established manufacturers with regional depth          Digital entrants selling direct to the customer',
  'Long-standing distributor relationships in place       Fulfilment handled by third party logistics firms',
  'Capital equipment renewed on a decade cycle            Software renewed continuously against subscription',
].join('\n');

/* A single-column prose page: no gutter at all. */
export const SINGLE_COLUMN = [
  'The case for standardisation',
  '',
  'Most organisations discover that the cost of variation is invisible until',
  'somebody tries to compare two units directly, at which point the absence of',
  'a shared definition turns a simple question into a research project.',
].join('\n');
