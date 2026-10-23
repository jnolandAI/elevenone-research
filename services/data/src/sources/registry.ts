import type { Config } from '../config.js';

export type SourceId = 'sec' | 'fred' | 'bls' | 'census' | 'bea' | 'worldbank';

export interface SourceInfo {
  id: SourceId;
  name: string;
  publisher: string;
  /** 1: the statistical agency or regulator that produces the figure, or its official relay */
  tier: 1;
  covers: string;
  license: string;
  terms_url: string;
  homepage: string;
  /** Whether the publisher requires a credential this service holds on the caller's behalf */
  credential: 'none' | 'required' | 'optional';
  /** Text the publisher's terms require a product built on its API to show, quoted exactly */
  notice?: string;
  configured: (c: Config) => boolean;
}

export const SOURCES: Record<SourceId, SourceInfo> = {
  sec: {
    id: 'sec',
    name: 'SEC EDGAR',
    publisher: 'U.S. Securities and Exchange Commission',
    tier: 1,
    covers: 'Filings by every SEC registrant, XBRL financial statement facts, and full-text search of filings since 2001',
    license: 'U.S. government work, public domain',
    terms_url: 'https://www.sec.gov/about/developer-resources',
    homepage: 'https://www.sec.gov/edgar',
    credential: 'none',
    // SEC answers 403 to automated requests whose User-Agent carries no contact email.
    configured: (c) => Boolean(c.secUserAgent),
  },
  fred: {
    id: 'fred',
    name: 'FRED',
    publisher: 'Federal Reserve Bank of St. Louis',
    tier: 1,
    covers: 'About 800,000 U.S. and international economic time series from 100+ official sources',
    license: 'Mostly public domain; some series carry third-party copyright, flagged per result',
    terms_url: 'https://fred.stlouisfed.org/docs/api/terms_of_use.html',
    homepage: 'https://fred.stlouisfed.org',
    credential: 'required',
    notice: 'This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.',
    configured: (c) => Boolean(c.fredKey),
  },
  bls: {
    id: 'bls',
    name: 'BLS Public Data API',
    publisher: 'U.S. Bureau of Labor Statistics',
    tier: 1,
    covers: 'Employment, unemployment, prices (CPI, PPI), wages, productivity, job openings, by industry and area',
    license: 'U.S. government work, public domain',
    terms_url: 'https://www.bls.gov/developers/termsOfService.htm',
    homepage: 'https://www.bls.gov',
    credential: 'optional',
    notice: 'BLS.gov cannot vouch for the data or analyses derived from these data after the data have been retrieved from BLS.gov.',
    configured: () => true,
  },
  census: {
    id: 'census',
    name: 'Census Data API',
    publisher: 'U.S. Census Bureau',
    tier: 1,
    covers: 'American Community Survey: population, income, housing, education and work, down to county, place and ZIP',
    license: 'U.S. government work, public domain',
    terms_url: 'https://www.census.gov/data/developers/about/terms-of-service.html',
    homepage: 'https://data.census.gov',
    credential: 'required',
    notice: 'This product uses the Census Bureau Data API but is not endorsed or certified by the Census Bureau.',
    configured: (c) => Boolean(c.censusKey),
  },
  bea: {
    id: 'bea',
    name: 'BEA Data API',
    publisher: 'U.S. Bureau of Economic Analysis',
    tier: 1,
    covers: 'National accounts (GDP, income, PCE), GDP and income by state and county, GDP by industry',
    license: 'U.S. government work, public domain',
    terms_url: 'https://apps.bea.gov/API/_pdf/bea_api_tos.pdf',
    homepage: 'https://www.bea.gov',
    credential: 'required',
    notice: 'This product uses the Bureau of Economic Analysis (BEA) Data API but is not endorsed or certified by BEA.',
    configured: (c) => Boolean(c.beaKey),
  },
  worldbank: {
    id: 'worldbank',
    name: 'World Bank Indicators API',
    publisher: 'World Bank',
    tier: 1,
    covers: 'World Development Indicators: GDP, population, prices, trade and development for 200+ economies',
    license: 'CC BY 4.0',
    terms_url: 'https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets',
    homepage: 'https://data.worldbank.org',
    credential: 'none',
    notice: 'World Bank data are licensed under CC BY 4.0. The World Bank does not endorse this product.',
    configured: () => true,
  },
};

export function sourceStatus(config: Config) {
  return Object.values(SOURCES).map(({ configured, ...info }) => ({ ...info, available: configured(config) }));
}
