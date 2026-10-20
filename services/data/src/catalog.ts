// The curated catalog find_data searches before it asks any publisher. Each
// entry is a ready-to-run tool call for a figure consultants reach for often.
// Keywords carry the words people use, not only the words agencies use.

import type { SourceId } from './sources/registry.js';

export interface CatalogEntry {
  title: string;
  source: SourceId;
  tool: 'get_series' | 'census_acs' | 'bea_query' | 'company_financials' | 'company_filings' | 'search_filings';
  ref?: string;
  args?: Record<string, unknown>;
  dataset?: string;
  frequency?: string;
  units?: string;
  keywords: string[];
}

const Y = new Date().getUTCFullYear();
const RECENT_YEARS = `${Y - 2},${Y - 1},${Y}`;

const fred = (id: string, title: string, frequency: string, units: string, keywords: string[]): CatalogEntry => ({
  title,
  source: 'fred',
  tool: 'get_series',
  ref: `fred:${id}`,
  frequency,
  units,
  keywords,
});

const bls = (id: string, title: string, dataset: string, frequency: string, units: string, keywords: string[]): CatalogEntry => ({
  title,
  source: 'bls',
  tool: 'get_series',
  ref: `bls:${id}`,
  dataset,
  frequency,
  units,
  keywords,
});

const wb = (id: string, title: string, units: string, keywords: string[]): CatalogEntry => ({
  title,
  source: 'worldbank',
  tool: 'get_series',
  ref: `worldbank:${id}:USA;CHN;DEU;JPN;GBR;IND`,
  frequency: 'Annual',
  units,
  keywords: [...keywords, 'international', 'country', 'countries', 'global', 'world'],
});

const acs = (preset: string, title: string, keywords: string[]): CatalogEntry => ({
  title,
  source: 'census',
  tool: 'census_acs',
  args: { variables: [preset], geography: 'state' },
  dataset: 'American Community Survey 5-Year',
  keywords: [...keywords, 'demographics', 'census', 'acs', 'state', 'county', 'zip', 'metro', 'local', 'market'],
});

// Series FRED relays from owners who hold copyright in them: S&P, ICE, CoreLogic, the
// University of Michigan, Cboe, and Freddie Mac's mortgage survey (kept out until its
// notes are read with a key). FRED's API terms require the owner's permission before such a
// series is used beyond personal use, so the catalog does not offer them and the warmer does
// not fetch them. A caller can still ask for one by id, and the result is flagged.
export const THIRD_PARTY_FRED = ['SP500', 'BAMLH0A0HYM2', 'CSUSHPINSA', 'UMCSENT', 'VIXCLS', 'MORTGAGE30US'];

export const CATALOG: CatalogEntry[] = [
  // output and growth
  fred('GDP', 'Gross Domestic Product', 'Quarterly', 'Billions of dollars, SAAR', ['gdp', 'output', 'economy', 'nominal', 'growth']),
  fred('GDPC1', 'Real Gross Domestic Product', 'Quarterly', 'Billions of chained 2017 dollars, SAAR', ['gdp', 'real', 'output', 'economy', 'growth']),
  fred('A191RL1Q225SBEA', 'Real GDP, percent change from preceding period', 'Quarterly', 'Percent change at annual rate', ['gdp', 'growth', 'real', 'economy', 'recession']),
  fred('INDPRO', 'Industrial Production: Total Index', 'Monthly', 'Index 2017=100', ['industrial', 'production', 'manufacturing', 'output', 'factory']),
  fred('TCU', 'Capacity Utilization: Total Index', 'Monthly', 'Percent of capacity', ['capacity', 'utilization', 'manufacturing', 'industrial']),
  fred('CP', 'Corporate Profits After Tax', 'Quarterly', 'Billions of dollars, SAAR', ['corporate', 'profits', 'earnings', 'margins', 'business']),
  // prices
  fred('CPIAUCSL', 'Consumer Price Index for All Urban Consumers: All Items', 'Monthly', 'Index 1982-1984=100', ['cpi', 'inflation', 'prices', 'consumer', 'cost', 'living']),
  fred('CPILFESL', 'CPI for All Urban Consumers: All Items Less Food and Energy', 'Monthly', 'Index 1982-1984=100', ['core', 'cpi', 'inflation', 'prices']),
  fred('PCEPI', 'Personal Consumption Expenditures: Chain-type Price Index', 'Monthly', 'Index 2017=100', ['pce', 'inflation', 'prices', 'deflator', 'fed']),
  fred('PCEPILFE', 'PCE Excluding Food and Energy (Chain-Type Price Index)', 'Monthly', 'Index 2017=100', ['core', 'pce', 'inflation', 'prices', 'fed', 'target']),
  fred('PPIACO', 'Producer Price Index by Commodity: All Commodities', 'Monthly', 'Index 1982=100', ['ppi', 'producer', 'prices', 'wholesale', 'input', 'costs', 'inflation']),
  bls('CUUR0000SA0', 'CPI-U, U.S. city average, all items, not seasonally adjusted', 'Consumer Price Index', 'Monthly', 'Index 1982-84=100', ['cpi', 'inflation', 'prices', 'escalation', 'contract']),
  bls('WPUFD4', 'PPI final demand, not seasonally adjusted', 'Producer Price Index', 'Monthly', 'Index Nov 2009=100', ['ppi', 'producer', 'prices', 'final', 'demand', 'inflation']),
  // labour
  fred('UNRATE', 'Unemployment Rate', 'Monthly', 'Percent, seasonally adjusted', ['unemployment', 'jobs', 'labor', 'labour', 'employment']),
  fred('PAYEMS', 'All Employees, Total Nonfarm', 'Monthly', 'Thousands of persons, SA', ['payrolls', 'jobs', 'employment', 'nonfarm', 'hiring', 'labor']),
  fred('CIVPART', 'Labor Force Participation Rate', 'Monthly', 'Percent, SA', ['participation', 'labor', 'force', 'workforce']),
  fred('JTSJOL', 'Job Openings: Total Nonfarm', 'Monthly', 'Thousands, SA', ['jolts', 'openings', 'vacancies', 'hiring', 'labor', 'demand', 'talent']),
  fred('ICSA', 'Initial Claims', 'Weekly', 'Number, SA', ['claims', 'jobless', 'layoffs', 'unemployment', 'weekly']),
  fred('CES0500000003', 'Average Hourly Earnings of All Employees, Total Private', 'Monthly', 'Dollars per hour, SA', ['wages', 'earnings', 'pay', 'salary', 'compensation', 'hourly']),
  fred('ECIALLCIV', 'Employment Cost Index: Total compensation, all civilian', 'Quarterly', 'Index Dec 2005=100', ['eci', 'compensation', 'labor', 'cost', 'wages', 'benefits']),
  bls('LNS14000000', 'Unemployment rate, 16 years and over, seasonally adjusted', 'Current Population Survey', 'Monthly', 'Percent', ['unemployment', 'jobs', 'labor', 'cps']),
  bls('CES0000000001', 'All employees, total nonfarm, seasonally adjusted', 'Current Employment Statistics', 'Monthly', 'Thousands', ['payrolls', 'employment', 'jobs', 'nonfarm', 'ces']),
  bls('CES6054000001', 'All employees, professional, scientific, and technical services', 'Current Employment Statistics', 'Monthly', 'Thousands, SA', ['professional', 'services', 'consulting', 'employment', 'industry', 'jobs']),
  bls('CES6054160001', 'All employees, management, scientific, and technical consulting services', 'Current Employment Statistics', 'Monthly', 'Thousands, SA', ['consulting', 'management', 'consultants', 'employment', 'industry', 'jobs']),
  bls('JTS000000000000000JOL', 'Job openings, total nonfarm, seasonally adjusted', 'Job Openings and Labor Turnover Survey', 'Monthly', 'Thousands', ['jolts', 'openings', 'vacancies', 'hiring']),
  bls('PRS85006092', 'Nonfarm business labor productivity, percent change from previous quarter at annual rate', 'Productivity and Costs', 'Quarterly', 'Percent', ['productivity', 'output', 'per', 'hour', 'efficiency']),
  // rates, credit and markets
  fred('FEDFUNDS', 'Federal Funds Effective Rate', 'Monthly', 'Percent', ['fed', 'funds', 'interest', 'rates', 'policy', 'monetary']),
  fred('DGS10', 'Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity', 'Daily', 'Percent', ['treasury', '10', 'year', 'yield', 'rates', 'bond', 'interest', 'discount']),
  fred('DGS2', 'Market Yield on U.S. Treasury Securities at 2-Year Constant Maturity', 'Daily', 'Percent', ['treasury', '2', 'year', 'yield', 'rates']),
  fred('T10Y2Y', '10-Year Treasury Minus 2-Year Treasury', 'Daily', 'Percent', ['yield', 'curve', 'spread', 'inversion', 'recession']),
  fred('BUSLOANS', 'Commercial and Industrial Loans, All Commercial Banks', 'Monthly', 'Billions of dollars, SA', ['business', 'loans', 'credit', 'lending', 'banks']),
  fred('DTWEXBGS', 'Nominal Broad U.S. Dollar Index', 'Daily', 'Index Jan 2006=100', ['dollar', 'currency', 'fx', 'exchange']),
  fred('DEXUSEU', 'U.S. Dollars to Euro Spot Exchange Rate', 'Daily', 'U.S. dollars per euro', ['euro', 'eur', 'exchange', 'fx', 'currency']),
  fred('M2SL', 'M2 Money Stock', 'Monthly', 'Billions of dollars, SA', ['money', 'supply', 'm2', 'liquidity']),
  // consumers and housing
  fred('RSAFS', 'Advance Retail Sales: Retail Trade and Food Services', 'Monthly', 'Millions of dollars, SA', ['retail', 'sales', 'consumer', 'spending', 'demand']),
  fred('PCE', 'Personal Consumption Expenditures', 'Monthly', 'Billions of dollars, SAAR', ['consumer', 'spending', 'consumption', 'pce']),
  fred('PSAVERT', 'Personal Saving Rate', 'Monthly', 'Percent', ['saving', 'savings', 'consumer', 'household']),
  fred('TOTALSL', 'Total Consumer Credit Owned and Securitized', 'Monthly', 'Billions of dollars, SA', ['consumer', 'credit', 'debt', 'household', 'borrowing']),
  fred('HOUST', 'New Privately-Owned Housing Units Started: Total Units', 'Monthly', 'Thousands of units, SAAR', ['housing', 'starts', 'construction', 'residential', 'real', 'estate']),
  // energy and trade
  fred('DCOILWTICO', 'Crude Oil Prices: West Texas Intermediate (WTI)', 'Daily', 'Dollars per barrel', ['oil', 'crude', 'energy', 'wti', 'commodity']),
  fred('GASREGW', 'US Regular All Formulations Gas Price', 'Weekly', 'Dollars per gallon', ['gas', 'gasoline', 'fuel', 'energy']),
  fred('BOPGSTB', 'Trade Balance: Goods and Services, Balance of Payments Basis', 'Monthly', 'Millions of dollars, SA', ['trade', 'balance', 'deficit', 'exports', 'imports']),
  // government
  fred('GFDEBTN', 'Federal Debt: Total Public Debt', 'Quarterly', 'Millions of dollars', ['federal', 'debt', 'government', 'deficit', 'fiscal']),
  fred('FYFSD', 'Federal Surplus or Deficit', 'Annual', 'Millions of dollars', ['federal', 'deficit', 'budget', 'fiscal', 'government']),
  // international
  wb('NY.GDP.MKTP.CD', 'GDP (current US$)', 'Current US$', ['gdp', 'economy', 'size', 'output']),
  wb('NY.GDP.MKTP.KD.ZG', 'GDP growth (annual %)', 'Percent', ['gdp', 'growth', 'economy']),
  wb('NY.GDP.PCAP.CD', 'GDP per capita (current US$)', 'Current US$', ['gdp', 'per', 'capita', 'income', 'wealth']),
  wb('NY.GNP.PCAP.PP.CD', 'GNI per capita, PPP (current international $)', 'Current international $', ['gni', 'ppp', 'income', 'per', 'capita']),
  wb('FP.CPI.TOTL.ZG', 'Inflation, consumer prices (annual %)', 'Percent', ['inflation', 'cpi', 'prices']),
  wb('SP.POP.TOTL', 'Population, total', 'Persons', ['population', 'people', 'demographics', 'market', 'size']),
  wb('SL.UEM.TOTL.ZS', 'Unemployment, total (% of labor force, modeled ILO estimate)', 'Percent', ['unemployment', 'labor', 'jobs']),
  wb('NE.EXP.GNFS.ZS', 'Exports of goods and services (% of GDP)', 'Percent of GDP', ['exports', 'trade', 'openness']),
  wb('BX.KLT.DINV.WD.GD.ZS', 'Foreign direct investment, net inflows (% of GDP)', 'Percent of GDP', ['fdi', 'foreign', 'investment', 'inflows']),
  wb('GC.DOD.TOTL.GD.ZS', 'Central government debt, total (% of GDP)', 'Percent of GDP', ['government', 'debt', 'fiscal', 'sovereign']),
  wb('IT.NET.USER.ZS', 'Individuals using the Internet (% of population)', 'Percent', ['internet', 'digital', 'adoption', 'technology', 'online']),
  wb('SP.URB.TOTL.IN.ZS', 'Urban population (% of total population)', 'Percent', ['urban', 'urbanization', 'cities', 'population']),
  // local markets (Census ACS)
  acs('population', 'Total population', ['population', 'people', 'size']),
  acs('median_household_income', 'Median household income', ['income', 'household', 'median', 'affluence', 'spending', 'power']),
  acs('per_capita_income', 'Per capita income', ['income', 'per', 'capita']),
  acs('median_age', 'Median age', ['age', 'median', 'aging']),
  acs('households', 'Households', ['households', 'homes']),
  acs('median_home_value', 'Median value of owner-occupied housing', ['home', 'value', 'housing', 'real', 'estate', 'property']),
  acs('median_gross_rent', 'Median gross rent', ['rent', 'rental', 'housing', 'apartments']),
  acs('labor_force', 'Civilian labor force', ['labor', 'force', 'workforce', 'workers']),
  acs('unemployed', 'Unemployed persons', ['unemployment', 'unemployed', 'jobs']),
  acs('below_poverty', 'Population below the poverty level', ['poverty', 'low', 'income']),
  // regional and industry accounts (BEA)
  {
    title: 'Real GDP by state',
    source: 'bea',
    tool: 'bea_query',
    args: { dataset: 'Regional', params: { TableName: 'SAGDP1', LineCode: '1', GeoFips: 'STATE', Year: 'LAST5' } },
    dataset: 'Regional Economic Accounts',
    frequency: 'Annual',
    keywords: ['gdp', 'state', 'regional', 'economy', 'growth', 'local'],
  },
  {
    title: 'Per capita personal income by state',
    source: 'bea',
    tool: 'bea_query',
    args: { dataset: 'Regional', params: { TableName: 'SAINC1', LineCode: '3', GeoFips: 'STATE', Year: 'LAST5' } },
    dataset: 'Regional Economic Accounts',
    frequency: 'Annual',
    keywords: ['income', 'personal', 'per', 'capita', 'state', 'regional'],
  },
  {
    title: 'Real GDP and its components, percent change (NIPA Table 1.1.1)',
    source: 'bea',
    tool: 'bea_query',
    args: { dataset: 'NIPA', params: { TableName: 'T10101', Frequency: 'Q', Year: RECENT_YEARS } },
    dataset: 'National Income and Product Accounts',
    frequency: 'Quarterly',
    keywords: ['gdp', 'components', 'consumption', 'investment', 'nipa', 'national', 'accounts', 'growth'],
  },
  {
    title: 'Value added by industry (GDP by industry)',
    source: 'bea',
    tool: 'bea_query',
    args: { dataset: 'GDPbyIndustry', params: { TableID: '1', Frequency: 'A', Year: RECENT_YEARS, Industry: 'ALL' } },
    dataset: 'GDP by Industry',
    frequency: 'Annual',
    keywords: ['industry', 'sector', 'value', 'added', 'gdp', 'market', 'size', 'vertical'],
  },
  // companies (SEC)
  {
    title: 'Company financial statements (revenue, margins, income, balance sheet, cash flow)',
    source: 'sec',
    tool: 'company_financials',
    args: { company: '<ticker, CIK or name>' },
    dataset: 'EDGAR XBRL financial data',
    keywords: ['company', 'financials', 'revenue', 'sales', 'margin', 'profit', 'earnings', 'balance', 'sheet', 'cash', 'flow', 'public', 'competitor', 'peer', 'benchmark', 'ticker'],
  },
  {
    title: 'Company filings (10-K, 10-Q, 8-K, proxy) with links',
    source: 'sec',
    tool: 'company_filings',
    args: { company: '<ticker, CIK or name>' },
    dataset: 'EDGAR filings',
    keywords: ['company', 'filings', '10-k', '10-q', '8-k', 'annual', 'report', 'proxy', 'sec', 'disclosure', 'profile'],
  },
  {
    title: 'Search the text of SEC filings',
    source: 'sec',
    tool: 'search_filings',
    args: { query: '"<exact phrase>"' },
    dataset: 'EDGAR full-text search',
    keywords: ['mentions', 'search', 'text', 'risk', 'factors', 'disclosure', 'who', 'companies', 'competitors', 'trend', 'language', 'filings'],
  },
];
